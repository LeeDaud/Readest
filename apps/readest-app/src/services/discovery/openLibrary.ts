import { isTauriAppPlatform } from '@/services/environment';
import type { DiscoveryBook, DiscoveryCategory, DiscoveryMetadata } from './types';

let requestTail: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
type Transport = 'native' | 'web';
const TRANSPORT_CACHE_KEY = 'readest-discovery-transport-v1';
let preferred: Transport | null = null;

function preferredTransport(): Transport {
  if (preferred) return preferred;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(TRANSPORT_CACHE_KEY) ?? 'null');
    if (
      saved &&
      typeof saved === 'object' &&
      'transport' in saved &&
      (saved.transport === 'web' || saved.transport === 'native') &&
      'expiresAt' in saved &&
      typeof saved.expiresAt === 'number' &&
      saved.expiresAt > Date.now()
    )
      return (preferred = saved.transport);
  } catch {
    /* Connection preferences are optional. */
  }
  return (preferred = 'native');
}

function rememberTransport(transport: Transport) {
  preferred = transport;
  try {
    localStorage.setItem(
      TRANSPORT_CACHE_KEY,
      JSON.stringify({ transport, expiresAt: Date.now() + 86400000 }),
    );
  } catch {
    /* Keep the successful connection for this session if storage is unavailable. */
  }
}
interface OpenLibraryDoc {
  key?: unknown;
  cover_i?: unknown;
  ratings_average?: unknown;
  ratings_count?: unknown;
  author_name?: unknown;
  editions?: unknown;
}
class ConnectionError extends Error {
  constructor(cause: unknown) {
    super('无法连接在线书籍服务，请检查网络后重试', { cause });
  }
}
export async function openLibraryJson(url: string, signal?: AbortSignal): Promise<unknown> {
  if (new URL(url).origin !== 'https://openlibrary.org') throw Error('无效的书籍资料地址');
  const task = requestTail
    .catch(() => {})
    .then(async () => {
      const waitForSlot = async () => {
        signal?.throwIfAborted();
        const delay = Math.max(0, lastRequest + 1100 - Date.now());
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        signal?.throwIfAborted();
        lastRequest = Date.now();
      };
      const read = async (fetcher: typeof globalThis.fetch) => {
        signal?.throwIfAborted();
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(abort, 8000);
        try {
          let response: Response;
          try {
            response = await fetcher(url, { signal: controller.signal });
          } catch (error) {
            signal?.throwIfAborted();
            throw new ConnectionError(error);
          }
          signal?.throwIfAborted();
          if (!response.ok) {
            if (response.status === 429) {
              const seconds = Number(response.headers.get('Retry-After'));
              lastRequest =
                Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 10000);
            }
            throw Error(
              response.status === 429 ? '书籍服务繁忙，请稍后重试' : '在线书籍资料暂不可用，请重试',
            );
          }
          try {
            return await response.json();
          } catch (error) {
            signal?.throwIfAborted();
            throw new ConnectionError(error);
          }
        } finally {
          clearTimeout(timeout);
          signal?.removeEventListener('abort', abort);
        }
      };
      await waitForSlot();
      if (!isTauriAppPlatform()) return read(globalThis.fetch);
      const send = async (transport: Transport) =>
        read(
          transport === 'native'
            ? (await import('@tauri-apps/plugin-http')).fetch
            : globalThis.fetch,
        );
      const first = preferredTransport();
      try {
        const data = await send(first);
        rememberTransport(first);
        return data;
      } catch (error) {
        signal?.throwIfAborted();
        if (!(error instanceof ConnectionError)) throw error;
        // Reuse the last working network stack; if the network changes,
        // recover through the other one. Cancellation and HTTP errors never retry.
        await waitForSlot();
        const second = first === 'native' ? 'web' : 'native';
        const data = await send(second);
        rememberTransport(second);
        return data;
      }
    });
  requestTail = task;
  return task;
}

export function workMetadata(item: OpenLibraryDoc): DiscoveryMetadata | undefined {
  const key = typeof item.key === 'string' ? item.key.replace(/^\/works\//, '') : '';
  if (!/^OL\d+W$/.test(key)) return undefined;
  const metadata: DiscoveryMetadata = {
    source: 'Open Library',
    url: `https://openlibrary.org/works/${key}`,
  };
  if (typeof item.cover_i === 'number' && Number.isSafeInteger(item.cover_i) && item.cover_i > 0)
    metadata.coverUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg?default=false`;
  if (
    typeof item.ratings_average === 'number' &&
    Number.isFinite(item.ratings_average) &&
    item.ratings_average >= 1 &&
    item.ratings_average <= 5 &&
    typeof item.ratings_count === 'number' &&
    Number.isSafeInteger(item.ratings_count) &&
    item.ratings_count > 0
  ) {
    metadata.rating = item.ratings_average;
    metadata.ratingCount = item.ratings_count;
  }
  return metadata;
}

export function parseCandidates(
  response: unknown,
  category: Exclude<DiscoveryCategory, 'all'>,
): DiscoveryBook[] {
  if (
    !response ||
    typeof response !== 'object' ||
    !('docs' in response) ||
    !Array.isArray(response.docs)
  )
    return [];
  const books = new Map<string, DiscoveryBook>();
  for (const value of response.docs) {
    if (
      !value ||
      typeof value !== 'object' ||
      typeof value.title !== 'string' ||
      !value.title.trim()
    )
      continue;
    const item = value as OpenLibraryDoc;
    const metadata = workMetadata(item);
    if (!metadata) continue;
    const id = metadata.url.split('/').pop()!;
    const authors = Array.isArray(item.author_name)
      ? item.author_name.filter((name): name is string => typeof name === 'string')
      : [];
    const editions =
      item.editions &&
      typeof item.editions === 'object' &&
      'docs' in item.editions &&
      Array.isArray(item.editions.docs)
        ? item.editions.docs
        : [];
    const edition = editions[0];
    const editionId =
      typeof edition?.key === 'string' && /^\/books\/OL\d+M$/.test(edition.key)
        ? edition.key.slice(7)
        : undefined;
    const title =
      typeof edition?.title === 'string' && edition.title.trim()
        ? edition.title.trim()
        : value.title.trim();
    books.set(id, {
      id,
      workId: id,
      title,
      titleAliases: title !== value.title.trim() ? [value.title.trim()] : undefined,
      author: authors[0] ?? '',
      authorAliases: authors.slice(1),
      category,
      summary: '',
      metadata,
      editionId,
    });
  }
  return [...books.values()];
}

export function parseDescription(response: unknown): string {
  if (!response || typeof response !== 'object' || !('description' in response)) return '';
  const value = response.description;
  const text =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'value' in value && typeof value.value === 'string'
        ? value.value
        : '';
  return text
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 12000);
}
