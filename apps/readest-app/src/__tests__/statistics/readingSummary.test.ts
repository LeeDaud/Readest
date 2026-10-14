import { expect, it } from 'vitest';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import { migrate } from '@/services/database/migrate';
import { getMigrations } from '@/services/database/migrations';
import { StatisticsDb } from '@/services/statistics/statisticsDb';

it('aggregates actual events by book and avoids trusting stale cached totals', async () => {
  const database = await NodeDatabaseService.open(':memory:');
  try {
    await migrate(database, getMigrations('statistics'));
    const db = StatisticsDb.from(database);
    const first = await db.upsertBook({ bookMd5: 'first', title: '第一本', authors: '甲' });
    const second = await db.upsertBook({ bookMd5: 'second', title: '第二本', authors: '乙' });
    await db.insertPageEvent(first, { page: 1, startTime: 100, duration: 30, totalPages: 10 });
    await db.insertPageEvent(first, { page: 1, startTime: 100, duration: 30, totalPages: 10 });
    await db.insertPageEvent(second, { page: 1, startTime: 200, duration: 60, totalPages: 10 });
    expect(await db.getReadingSummary()).toMatchObject({
      totalSeconds: 90,
      books: [
        { md5: 'second', seconds: 60 },
        { md5: 'first', seconds: 30 },
      ],
    });
  } finally {
    await database.close();
  }
});
