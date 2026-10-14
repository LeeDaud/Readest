import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import { DiscoveryDb } from '@/services/discovery/discoveryDb';
import { DISCOVERY_CATALOG } from '@/services/discovery/catalog';
import type { DatabaseService } from '@/types/database';
import type { AppService } from '@/types/system';

let database: DatabaseService;
let store: DiscoveryDb;
beforeEach(async () => {
  database = await NodeDatabaseService.open(':memory:');
  store = await DiscoveryDb.from(database);
});
afterEach(async () => {
  await database.close();
});

it('migrates legacy history once without resurrecting an edited or deleted record', async () => {
  const legacy = {
    version: 1,
    seen: ['seen'],
    records: {
      old: { id: 'old', title: '旧书', author: '作者', status: 'read', updatedAt: 123 },
      skipped: { id: 'skipped', title: '另一书', author: '', status: 'dismissed', updatedAt: 124 },
    },
  };
  await store.migrateLegacy(legacy);
  expect(await store.listRead()).toHaveLength(1);
  await store.remove('old');
  await store.migrateLegacy(legacy);
  expect(await store.listRead()).toHaveLength(0);
  expect(
    await store.isExcluded(
      { id: 'seen', title: '未读', author: '', category: 'literature', summary: '' },
      [],
    ),
  ).toBe(true);
});

it('matches translated works, preserves identity on editing and keeps dismissals out of read history', async () => {
  const book = DISCOVERY_CATALOG.find((b) => b.id === 'nineteen-eighty-four')!;
  await store.record(book, 'read');
  const translated = { ...book, id: 'OL123W', title: '1984', author: 'George Orwell' };
  expect(await store.isExcluded(translated, [])).toBe(true);
  const record = (await store.listRead())[0]!;
  await store.saveRead({ ...record, title: '一九八四', readAt: '2026-10-14' });
  expect((await store.listRead())[0]!.readAt).toBe('2026-10-14');
  expect(await store.isExcluded(translated, [])).toBe(true);
  await store.remove(record.id);
  expect(await store.isExcluded(translated, [])).toBe(false);
  await store.record(translated, 'dismissed');
  expect(await store.listRead()).toHaveLength(0);
});

it('records seen separately and does not turn opening a search into a completed read', async () => {
  const book = DISCOVERY_CATALOG[0]!;
  await store.record(book, 'selected');
  expect(await store.listRead()).toHaveLength(0);
  expect(await store.isExcluded(book, [])).toBe(false);
  await store.markSeen(book);
  expect(await store.isExcluded(book, [])).toBe(true);
});

it('supports more than the old catalogue and persists queue state independently of settings', async () => {
  for (let index = 0; index < 105; index++) {
    await store.saveRead({
      id: `manual:${index}`,
      title: `书 ${index}`,
      author: '',
      status: 'read',
      updatedAt: index,
    });
  }
  expect(await store.listRead('', 0, 200)).toHaveLength(105);
  expect(await store.listRead('', 100)).toHaveLength(5);
  await store.setValue('queue', { offset: 20, books: [DISCOVERY_CATALOG[0]] });
  expect(await store.getValue('queue')).toMatchObject({ offset: 20 });
});

it('shares one connection even when startup replaces the app-service wrapper', async () => {
  const openDatabase = vi.fn(async () => database);
  const firstService = { openDatabase } as unknown as AppService;
  const nextService = { openDatabase } as unknown as AppService;
  const first = await DiscoveryDb.open(firstService);
  const second = await DiscoveryDb.open(nextService);
  expect(second).toBe(first);
  expect(openDatabase).toHaveBeenCalledTimes(1);
});
