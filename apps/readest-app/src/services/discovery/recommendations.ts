import { DISCOVERY_CATEGORIES, type DiscoveryBook, type DiscoveryPreferences } from './types';

export const normalizeWorkText = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
export const workKey = (title: string, author: string) =>
  `${normalizeWorkText(title)}:${normalizeWorkText(author)}`;

export function matchesWork(book: DiscoveryBook, title: string, author: string): boolean {
  const titles = [book.title, ...(book.titleAliases ?? [])].map(normalizeWorkText);
  const authors = [book.author, ...(book.authorAliases ?? [])].map(normalizeWorkText);
  return titles.includes(normalizeWorkText(title)) && authors.includes(normalizeWorkText(author));
}

export function readDiscoveryPreferences(value: unknown): DiscoveryPreferences {
  const empty: DiscoveryPreferences = { version: 1, category: 'all', seen: [], records: {} };
  if (!value || typeof value !== 'object') return empty;
  const data = value as Partial<DiscoveryPreferences>;
  if (data.version !== 1) return empty;
  const records: DiscoveryPreferences['records'] = {};
  if (data.records && typeof data.records === 'object') {
    for (const record of Object.values(data.records)) {
      if (
        record &&
        typeof record.id === 'string' &&
        typeof record.title === 'string' &&
        typeof record.author === 'string' &&
        ['read', 'dismissed', 'selected'].includes(record.status) &&
        typeof record.updatedAt === 'number' &&
        Number.isFinite(record.updatedAt)
      )
        records[record.id] = record;
    }
  }
  return {
    ...empty,
    records,
    category:
      data.category && Object.hasOwn(DISCOVERY_CATEGORIES, data.category) ? data.category : 'all',
    seen: Array.isArray(data.seen)
      ? [...new Set(data.seen.filter((id): id is string => typeof id === 'string'))]
      : [],
  };
}

export function eligibleBooks(
  pool: readonly DiscoveryBook[],
  preferences: DiscoveryPreferences,
  library: readonly { title: string; author: string; deletedAt?: number | null }[],
  ignoreSeen = false,
): DiscoveryBook[] {
  const records = Object.values(preferences.records);
  return pool.filter(
    (book) =>
      (preferences.category === 'all' || book.category === preferences.category) &&
      (ignoreSeen || !preferences.seen.includes(book.id)) &&
      !records.some(
        (record) => record.id === book.id || matchesWork(book, record.title, record.author),
      ) &&
      !library.some(
        (shelved) => !shelved.deletedAt && matchesWork(book, shelved.title, shelved.author),
      ),
  );
}

export function pickRecommendation(
  books: readonly DiscoveryBook[],
  random = Math.random,
): DiscoveryBook | null {
  return books.length
    ? books[Math.min(books.length - 1, Math.max(0, Math.floor(random() * books.length)))]!
    : null;
}
