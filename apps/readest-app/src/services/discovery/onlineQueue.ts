import { DISCOVERY_CATALOG } from './catalog';
import { DiscoveryDb } from './discoveryDb';
import { openLibraryJson, parseCandidates } from './openLibrary';
import type { DiscoveryBook, DiscoveryCategory } from './types';

const topics: Record<Exclude<DiscoveryCategory, 'all'>, string[]> = {
  literature: ['fiction', 'literature', 'poetry', 'short_stories'],
  history: ['history', 'biography', 'civilization'],
  society: ['sociology', 'philosophy', 'politics', 'economics'],
  science: ['science', 'physics', 'astronomy', 'nature'],
  psychology: ['psychology', 'self-development', 'mental_health'],
};
interface QueueState {
  topic: number;
  offset: number;
  books: DiscoveryBook[];
  offsets?: Record<string, number>;
  exhausted?: string[];
}
type ShelfBook = { title: string; author: string; deletedAt?: number | null };

/** The batch size limits network work, never the number of recommendations. */
export class OnlineQueue {
  private filling: Promise<void> | null = null;
  private state: QueueState | null = null;
  private updates: Promise<unknown> = Promise.resolve();
  readonly key: string;
  private readonly queries: { category: Exclude<DiscoveryCategory, 'all'>; subject: string }[];
  constructor(
    private readonly db: DiscoveryDb,
    category: DiscoveryCategory,
    private readonly allLanguages: boolean,
  ) {
    this.key = `queue-v1:${category}:${allLanguages ? 'all' : 'chi'}`;
    this.queries = Object.entries(topics).flatMap(([name, subjects]) =>
      category === 'all' || name === category
        ? subjects.map((subject) => ({
            category: name as Exclude<DiscoveryCategory, 'all'>,
            subject,
          }))
        : [],
    );
  }

  private async load() {
    if (!this.state) {
      const saved = (await this.db.getValue(this.key)) as QueueState | undefined;
      this.state =
        saved &&
        Number.isSafeInteger(saved.offset) &&
        Number.isSafeInteger(saved.topic) &&
        Array.isArray(saved.books)
          ? saved
          : { topic: 0, offset: 0, books: [] };
    }
    return this.state;
  }

  // Serialize short database updates, never the network request. Refills and
  // foreground reservations must not overwrite each other's buffered books.
  private withState<T>(action: (state: QueueState) => T | Promise<T>): Promise<T> {
    const task = this.updates.then(async () => action(await this.load()));
    this.updates = task.catch(() => {});
    return task;
  }

  async fill(signal?: AbortSignal): Promise<void> {
    if (this.filling) return this.filling;
    const task = (async () => {
      const state = await this.withState((state) => state);
      const query = this.queries[state.topic];
      if (!query) return;
      const offsets = { ...(state.offsets ?? { [query.subject]: state.offset }) };
      const exhausted = [...(state.exhausted ?? [])];
      const offset = offsets[query.subject] ?? 0;
      const url = new URL('https://openlibrary.org/search.json');
      url.searchParams.set(
        'q',
        `subject:${query.subject}${this.allLanguages ? '' : ' language:chi'}`,
      );
      url.searchParams.set('sort', 'key');
      url.searchParams.set('lang', 'zh');
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', '20');
      url.searchParams.set(
        'fields',
        'key,title,author_name,cover_i,ratings_average,ratings_count,editions,editions.key,editions.title',
      );
      const data = await openLibraryJson(url.href, signal);
      signal?.throwIfAborted();
      const books = parseCandidates(data, query.category);
      for (let index = books.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [books[index], books[other]] = [books[other]!, books[index]!];
      }
      const raw = data as { numFound?: number; num_found?: number; docs?: unknown[] };
      const total = raw.numFound ?? raw.num_found ?? 0;
      const nextOffset = offset + (raw.docs?.length ?? 0);
      offsets[query.subject] = nextOffset;
      if (nextOffset >= total || !raw.docs?.length) exhausted.push(query.subject);
      // Alternate subjects after each batch; each subject retains its own
      // stable pagination rather than draining one entire category first.
      let nextTopic = this.queries.length;
      for (let step = 1; step <= this.queries.length; step++) {
        const index = (state.topic + step) % this.queries.length;
        if (!exhausted.includes(this.queries[index]!.subject)) {
          nextTopic = index;
          break;
        }
      }
      // A failed response never advances the cursor; fetched candidates persist across restarts.
      const cursor = {
        topic: nextTopic,
        offset:
          nextTopic < this.queries.length ? (offsets[this.queries[nextTopic]!.subject] ?? 0) : 0,
        offsets,
        exhausted,
      };
      await this.withState(async (current) => {
        const next = { ...cursor, books: [...current.books, ...books] };
        await this.db.setValue(this.key, next);
        this.state = next;
      });
    })();
    this.filling = task;
    try {
      await task;
    } finally {
      this.filling = null;
    }
  }

  async next(
    library: readonly ShelfBook[],
    signal?: AbortSignal,
  ): Promise<{ book: DiscoveryBook; offline: boolean } | null> {
    // Yield rather than spin indefinitely when all fetched results are excluded.
    for (let batch = 0; batch < 4; batch++) {
      const cached = await this.withState(async (state) => {
        while (state.books.length) {
          signal?.throwIfAborted();
          const book = state.books[0]!;
          const excluded = await this.db.isExcluded(book, library);
          signal?.throwIfAborted();
          const next = { ...state, books: state.books.slice(1) };
          await this.db.setValue(this.key, next);
          this.state = state = next;
          if (!excluded) {
            await this.db.markSeen(book);
            return { book, exhausted: false };
          }
        }
        return { book: null, exhausted: !this.queries[state.topic] };
      });
      if (cached.book) return { book: cached.book, offline: false };
      if (cached.exhausted) return null;
      try {
        await this.fill(signal);
      } catch (error) {
        signal?.throwIfAborted();
        const allowedCategories = new Set(this.queries.map((query) => query.category));
        const offline = await this.withState(async () => {
          for (const book of DISCOVERY_CATALOG) {
            signal?.throwIfAborted();
            if (
              allowedCategories.has(book.category) &&
              !(await this.db.isExcluded(book, library))
            ) {
              await this.db.markSeen(book);
              return book;
            }
          }
          return null;
        });
        if (offline) return { book: offline, offline: true };
        throw error instanceof Error ? error : Error('无法连接在线书籍服务，请检查网络后重试');
      }
    }
    throw Error('正在寻找更多未读书籍，请继续推荐或扩大推荐范围');
  }

  async prefetch(signal?: AbortSignal) {
    if ((await this.withState((state) => state.books.length)) <= 10) await this.fill(signal);
  }
}
