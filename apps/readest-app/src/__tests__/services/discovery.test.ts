import { beforeEach, expect, it, vi } from 'vitest';
import { DISCOVERY_CATALOG } from '@/services/discovery/catalog';
import {
  eligibleBooks,
  matchesWork,
  pickRecommendation,
  readDiscoveryPreferences,
} from '@/services/discovery/recommendations';
import {
  doubanSearchUrl,
  loadDiscoveryMetadata,
  parseOpenLibraryMetadata,
} from '@/services/discovery/metadata';
import { zlibrarySearchUrl } from '@/services/zlibrary/sites';

const platform = vi.hoisted(() => ({ native: false, fetch: vi.fn() }));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => platform.native }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: platform.fetch }));
const book = DISCOVERY_CATALOG.find((item) => item.id === 'nineteen-eighty-four')!;
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  platform.native = false;
  platform.fetch.mockReset();
});

it('uses native HTTP in the mobile app and ignores malformed persisted rating values', async () => {
  platform.native = true;
  localStorage.setItem(
    'readest-discovery-metadata-v1',
    JSON.stringify({
      [book.id]: {
        at: Date.now(),
        value: {
          source: 'Open Library',
          url: 'https://openlibrary.org/works/OL123W',
          rating: '4.4',
          ratingCount: 2,
        },
      },
    }),
  );
  platform.fetch.mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
  expect(await loadDiscoveryMetadata(book)).toBeNull();
  expect(platform.fetch).toHaveBeenCalledOnce();
  expect(platform.fetch.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
});

it('matches translations and punctuation but never just an identical title by another author', () => {
  expect(matchesWork(book, '１９８４', 'George Orwell')).toBe(true);
  expect(matchesWork(book, '1984', 'Another Author')).toBe(false);
  expect(matchesWork(book, '1984 (adaptation)', 'George Orwell')).toBe(false);
});
it('excludes shelves, read/selected/dismissed records and this round; deleting a shelf book permits it again', () => {
  const preferences = readDiscoveryPreferences(undefined);
  expect(eligibleBooks([book], preferences, [{ title: '1984', author: 'George Orwell' }])).toEqual(
    [],
  );
  expect(
    eligibleBooks([book], preferences, [
      { title: '1984', author: 'George Orwell', deletedAt: 123 },
    ]),
  ).toEqual([book]);
  for (const status of ['read', 'selected', 'dismissed'] as const) {
    preferences.records['manual'] = {
      id: 'manual',
      title: '1984',
      author: 'George Orwell',
      status,
      updatedAt: 1,
    };
    expect(eligibleBooks([book], preferences, [])).toEqual([]);
  }
  preferences.records = {};
  preferences.seen = [book.id];
  expect(eligibleBooks([book], preferences, [])).toEqual([]);
  expect(eligibleBooks([book], preferences, [], true)).toEqual([book]);
});
it('filters categories and reports exhaustion instead of looping already read books', () => {
  const preferences = readDiscoveryPreferences(undefined);
  preferences.category = 'science';
  expect(
    eligibleBooks(DISCOVERY_CATALOG, preferences, []).every((item) => item.category === 'science'),
  ).toBe(true);
  expect(pickRecommendation([])).toBeNull();
  expect(pickRecommendation([book], () => 0.99)).toBe(book);
});
it('validates persisted preferences without modifying saved record references', () => {
  expect(readDiscoveryPreferences({ version: 2 })).toEqual(readDiscoveryPreferences(undefined));
  const preferences = readDiscoveryPreferences({
    version: 1,
    category: 'bad',
    seen: [book.id, book.id, 123],
    records: { bad: { status: 'unknown' } },
  });
  expect(preferences.seen).toEqual([book.id]);
  expect(preferences.category).toBe('all');
  expect(preferences.records).toEqual({});
});
it('rejects mismatched metadata, invalid work links and empty ratings', () => {
  const valid = {
    key: '/works/OL123W',
    title: '1984',
    author_name: ['George Orwell'],
    ratings_average: 4.2,
    ratings_count: 30,
    cover_i: 123,
  };
  expect(
    parseOpenLibraryMetadata(book, { docs: [{ ...valid, title: '1984 (adaptation)' }, valid] }),
  ).toMatchObject({ rating: 4.2, ratingCount: 30, url: 'https://openlibrary.org/works/OL123W' });
  expect(
    parseOpenLibraryMetadata(book, { docs: [{ ...valid, key: '//evil.example' }] }),
  ).toBeNull();
  expect(
    parseOpenLibraryMetadata(book, { docs: [{ ...valid, ratings_count: 0 }] })?.rating,
  ).toBeUndefined();
});
it('deduplicates metadata lookups and persists its cache without storing reading history', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        docs: [{ key: '/works/OL123W', title: '1984', author_name: ['George Orwell'] }],
      }),
    ),
  );
  const results = await Promise.all([loadDiscoveryMetadata(book), loadDiscoveryMetadata(book)]);
  expect(results[0]).toEqual(results[1]);
  await loadDiscoveryMetadata(book);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(new URL(String(fetcher.mock.calls[0]![0])).hostname).toBe('openlibrary.org');
});
it('preserves mirror order and encodes the search as one segment rather than injecting URL parameters', () => {
  const query = '1984 乔治 /?奥威尔';
  const urls = ['https://first.example/', 'https://second.example/?old=1'].map((base) =>
    zlibrarySearchUrl(base, query),
  );
  expect(urls.map((url) => new URL(url).hostname)).toEqual(['first.example', 'second.example']);
  expect(new URL(urls[0]!).search).toBe('');
  expect(decodeURIComponent(new URL(urls[1]!).pathname.slice(3))).toBe(query);
  expect(new URL(doubanSearchUrl(book)).searchParams.get('q')).toBe(`${book.title} ${book.author}`);
});
