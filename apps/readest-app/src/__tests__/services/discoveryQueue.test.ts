import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import { DiscoveryDb } from '@/services/discovery/discoveryDb';
import { OnlineQueue } from '@/services/discovery/onlineQueue';
import type { DatabaseService } from '@/types/database';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/services/discovery/openLibrary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/discovery/openLibrary')>()),
  openLibraryJson: mocks.fetch,
}));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => false }));
let database: DatabaseService;
let store: DiscoveryDb;
beforeEach(async () => {
  database = await NodeDatabaseService.open(':memory:');
  store = await DiscoveryDb.from(database);
  mocks.fetch.mockReset();
  mocks.fetch.mockImplementation(async (url) => {
    const offset = Number(new URL(url).searchParams.get('offset'));
    const subject = new URL(url).searchParams.get('q') ?? '';
    const prefix = subject.startsWith('subject:fiction')
      ? 0
      : [...subject].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) * 10000;
    return {
      numFound: 1000,
      docs: Array.from({ length: 20 }, (_, index) => ({
        key: `/works/OL${prefix + offset + index + 1}W`,
        title: `书 ${prefix + offset + index + 1}`,
        author_name: ['作者'],
      })),
    };
  });
});

it('mixes recommendation topics rather than draining thousands from one subject first', async () => {
  const queue = new OnlineQueue(store, 'all', false);
  for (let index = 0; index < 25; index++) await queue.next([]);
  const queries = new Set(
    mocks.fetch.mock.calls.map((call) => new URL(call[0]).searchParams.get('q')),
  );
  expect(queries.size).toBeGreaterThan(1);
});
afterEach(async () => {
  await database.close();
});

it('recommends 105 distinct online works across batches and a recreated queue without clearing history', async () => {
  let queue = new OnlineQueue(store, 'literature', false);
  const ids = new Set<string>();
  for (let index = 0; index < 105; index++) {
    const result = await queue.next([]);
    expect(result?.offline).toBe(false);
    expect(ids.has(result!.book.id)).toBe(false);
    ids.add(result!.book.id);
    if (index === 3) await store.record(result!.book, 'read');
    if (index === 45) queue = new OnlineQueue(store, 'literature', false);
  }
  expect(ids.size).toBe(105);
  expect(mocks.fetch).toHaveBeenCalledTimes(6);
  expect(await store.listRead()).toHaveLength(1);
});

it('skips a complete filtered batch and retrieves the next page instead of reporting catalogue exhaustion', async () => {
  for (let index = 1; index <= 20; index++)
    await store.record(
      {
        id: `OL${index}W`,
        title: `书 ${index}`,
        author: '作者',
        summary: '',
        category: 'literature',
      },
      'read',
    );
  const result = await new OnlineQueue(store, 'literature', false).next([]);
  expect(Number(result!.book.id.replace(/\D/g, ''))).toBeGreaterThan(20);
});

it('does not advance pagination on a failed request and labels the finite offline fallback', async () => {
  mocks.fetch.mockRejectedValueOnce(Error('网络故障'));
  const result = await new OnlineQueue(store, 'literature', false).next([]);
  expect(result?.offline).toBe(true);
  expect(await store.getValue('queue-v1:literature:chi')).toBeUndefined();
});
