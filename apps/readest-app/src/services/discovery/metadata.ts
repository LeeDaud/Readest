import { matchesWork } from './recommendations';
import type { DiscoveryBook, DiscoveryMetadata } from './types';
import { openLibraryJson, parseDescription } from './openLibrary';

const CACHE_KEY = 'readest-discovery-metadata-v2';
const TTL = 7 * 24 * 60 * 60 * 1000;
const pending = new Map<string, Promise<DiscoveryMetadata | null>>();

export function parseOpenLibraryMetadata(
  book: DiscoveryBook,
  response: unknown,
): DiscoveryMetadata | null {
  if (
    !response ||
    typeof response !== 'object' ||
    !('docs' in response) ||
    !Array.isArray(response.docs)
  )
    return null;
  for (const item of response.docs) {
    if (
      !item ||
      typeof item.title !== 'string' ||
      !Array.isArray(item.author_name) ||
      !item.author_name.some(
        (author: unknown) => typeof author === 'string' && matchesWork(book, item.title, author),
      )
    )
      continue;
    if (typeof item.key !== 'string') continue;
    const key = item.key.replace(/^\/works\//, '');
    if (!/^OL\d+W$/.test(key)) continue;
    const result: DiscoveryMetadata = {
      source: 'Open Library',
      url: `https://openlibrary.org/works/${key}`,
    };
    if (Number.isSafeInteger(item.cover_i) && item.cover_i > 0)
      result.coverUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg?default=false`;
    if (
      typeof item.ratings_average === 'number' &&
      Number.isFinite(item.ratings_average) &&
      item.ratings_average >= 1 &&
      item.ratings_average <= 5 &&
      Number.isSafeInteger(item.ratings_count) &&
      item.ratings_count > 0
    ) {
      result.rating = item.ratings_average;
      result.ratingCount = item.ratings_count;
    }
    return result;
  }
  return null;
}

interface CacheEntry {
  at: number;
  value: DiscoveryMetadata | null;
}
function readCache(): Record<string, CacheEntry> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, CacheEntry>)
      : {};
  } catch {
    return {};
  }
}

/** Explicit per-book lookup, cached and limited to the provider's default 1 request/second. */
export function loadDiscoveryMetadata(book: DiscoveryBook): Promise<DiscoveryMetadata | null> {
  const cache = readCache();
  const cached = cache[book.id];
  if (
    cached &&
    Number.isFinite(cached.at) &&
    Date.now() - cached.at < (cached.value === null ? 5 * 60 * 1000 : TTL)
  ) {
    const value = cached.value;
    if (
      value === null ||
      (value?.source === 'Open Library' &&
        /^https:\/\/openlibrary\.org\/works\/OL\d+W$/.test(value.url) &&
        (!value.coverUrl ||
          /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg\?default=false$/.test(
            value.coverUrl,
          )) &&
        (value.rating === undefined ||
          (typeof value.rating === 'number' &&
            Number.isFinite(value.rating) &&
            value.rating >= 1 &&
            value.rating <= 5 &&
            Number.isSafeInteger(value.ratingCount) &&
            value.ratingCount! > 0)))
    )
      return Promise.resolve(value);
  }
  const existing = pending.get(book.id);
  if (existing) return existing;
  const task = (async () => {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('title', book.titleAliases?.[0] ?? book.title);
    url.searchParams.set(
      'author',
      book.authorAliases?.find((author) => /^[A-Za-z]/.test(author)) ?? book.author,
    );
    url.searchParams.set('limit', '10');
    url.searchParams.set('fields', 'key,title,author_name,cover_i,ratings_average,ratings_count');
    {
      const value = parseOpenLibraryMetadata(book, await openLibraryJson(url.href));
      try {
        const entries = readCache();
        entries[book.id] = { at: Date.now(), value };
        const bounded = Object.fromEntries(
          Object.entries(entries)
            .filter(([, entry]) => entry && Number.isFinite(entry.at))
            .sort((a, b) => b[1].at - a[1].at)
            .slice(0, 100),
        );
        localStorage.setItem(CACHE_KEY, JSON.stringify(bounded));
      } catch {
        /* Metadata cache is optional; reading history is stored in its own database. */
      }
      return value;
    }
  })();
  pending.set(book.id, task);
  void task.finally(() => pending.delete(book.id)).catch(() => {});
  return task;
}

export async function loadBookDetails(
  book: DiscoveryBook,
  signal?: AbortSignal,
): Promise<DiscoveryBook> {
  const metadata = book.metadata ?? (await loadDiscoveryMetadata(book)) ?? undefined;
  signal?.throwIfAborted();
  const workId = book.workId ?? metadata?.url.split('/').pop();
  if (!workId || !/^OL\d+W$/.test(workId)) return { ...book, metadata };
  let work: unknown;
  try {
    work = await openLibraryJson(`https://openlibrary.org/works/${workId}.json`, signal);
  } catch {
    signal?.throwIfAborted();
    return { ...book, metadata };
  }
  let summary = parseDescription(work) || book.summary;
  if (!summary && book.editionId && /^OL\d+M$/.test(book.editionId))
    summary = parseDescription(
      await openLibraryJson(`https://openlibrary.org/books/${book.editionId}.json`, signal),
    );
  const covers =
    work && typeof work === 'object' && 'covers' in work && Array.isArray(work.covers)
      ? work.covers
      : [];
  const cover = covers.find(
    (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0,
  );
  return {
    ...book,
    workId,
    summary,
    metadata: metadata
      ? {
          ...metadata,
          coverUrl:
            metadata.coverUrl ??
            (cover
              ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg?default=false`
              : undefined),
        }
      : undefined,
  };
}

export function doubanSearchUrl(book: Pick<DiscoveryBook, 'title' | 'author'>): string {
  const url = new URL('https://www.douban.com/search');
  url.searchParams.set('cat', '1001');
  url.searchParams.set('q', `${book.title} ${book.author}`);
  return url.href;
}
