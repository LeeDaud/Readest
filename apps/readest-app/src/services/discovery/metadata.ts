import { isTauriAppPlatform } from '@/services/environment';
import { matchesWork } from './recommendations';
import type { DiscoveryBook, DiscoveryMetadata } from './types';

const CACHE_KEY = 'readest-discovery-metadata-v1';
const TTL = 7 * 24 * 60 * 60 * 1000;
let nextRequestAt = 0;
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
      result.coverUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`;
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
  if (cached && Number.isFinite(cached.at) && Date.now() - cached.at < TTL) {
    const value = cached.value;
    if (
      value === null ||
      (value?.source === 'Open Library' &&
        /^https:\/\/openlibrary\.org\/works\/OL\d+W$/.test(value.url) &&
        (!value.coverUrl ||
          /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg$/.test(value.coverUrl)) &&
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
    const delay = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Math.max(Date.now(), nextRequestAt) + 1100;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('title', book.titleAliases?.[0] ?? book.title);
    url.searchParams.set(
      'author',
      book.authorAliases?.find((author) => /^[A-Za-z]/.test(author)) ?? book.author,
    );
    url.searchParams.set('limit', '10');
    url.searchParams.set('fields', 'key,title,author_name,cover_i,ratings_average,ratings_count');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const fetcher = isTauriAppPlatform()
        ? (await import('@tauri-apps/plugin-http')).fetch
        : globalThis.fetch;
      const response = await fetcher(url.href, { signal: controller.signal });
      if (!response.ok) throw new Error('在线资料暂不可用，请稍后重试');
      const value = parseOpenLibraryMetadata(book, await response.json());
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
        /* Metadata cache is optional; reading history is stored separately in settings. */
      }
      return value;
    } finally {
      clearTimeout(timeout);
    }
  })();
  pending.set(book.id, task);
  void task.finally(() => pending.delete(book.id)).catch(() => {});
  return task;
}

export function doubanSearchUrl(book: Pick<DiscoveryBook, 'title' | 'author'>): string {
  const url = new URL('https://www.douban.com/search');
  url.searchParams.set('cat', '1001');
  url.searchParams.set('q', `${book.title} ${book.author}`);
  return url.href;
}
