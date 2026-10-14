import type { AppService } from '@/types/system';
import type { DatabaseService, DatabaseRow } from '@/types/database';
import { DISCOVERY_CATALOG } from './catalog';
import {
  matchesWork,
  normalizeWorkText,
  readDiscoveryPreferences,
  workKey,
} from './recommendations';
import type { DiscoveryBook, DiscoveryRecord, DiscoveryStatus } from './types';

// OPFS allows only one access handle per file in this window. AppService
// wrappers can change during startup, so object identity cannot key this cache.
let sharedStore: Promise<DiscoveryDb> | null = null;
type RecordRow = DatabaseRow & { payload: string };

function identities(
  book: Pick<DiscoveryBook, 'title' | 'author' | 'titleAliases' | 'authorAliases'>,
) {
  return [
    ...new Set(
      [book.title, ...(book.titleAliases ?? [])].flatMap((title) =>
        [book.author, ...(book.authorAliases ?? [])].map((author) => workKey(title, author)),
      ),
    ),
  ];
}

/** Unbounded history lives outside settings; one shared connection per window. */
export class DiscoveryDb {
  private migration: Promise<void> | null = null;
  private constructor(private readonly db: DatabaseService) {}

  static open(service: AppService): Promise<DiscoveryDb> {
    if (!sharedStore) {
      sharedStore = service
        .openDatabase('book-discovery', 'book-discovery.db', 'Data')
        .then(DiscoveryDb.from)
        .then((store) => {
          if (typeof document !== 'undefined')
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'hidden')
                void store.db.execute('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => {});
            });
          return store;
        });
      void sharedStore.catch(() => {
        sharedStore = null;
      });
    }
    return sharedStore;
  }

  static async from(db: DatabaseService): Promise<DiscoveryDb> {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS discovery_records (id TEXT PRIMARY KEY, status TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, updated_at INTEGER NOT NULL, payload TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS discovery_records_status ON discovery_records(status, updated_at)`,
      `CREATE TABLE IF NOT EXISTS discovery_identities (record_id TEXT NOT NULL, identity TEXT NOT NULL, PRIMARY KEY(record_id, identity))`,
      `CREATE INDEX IF NOT EXISTS discovery_identity_lookup ON discovery_identities(identity)`,
      `CREATE TABLE IF NOT EXISTS discovery_seen (id TEXT PRIMARY KEY)`,
      `CREATE TABLE IF NOT EXISTS discovery_values (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    ]);
    return new DiscoveryDb(db);
  }

  async getValue(key: string): Promise<unknown> {
    const rows = await this.db.select<{ value: string }>(
      'SELECT value FROM discovery_values WHERE key = ?',
      [key],
    );
    return rows[0] ? JSON.parse(rows[0].value) : undefined;
  }

  async setValue(key: string, value: unknown) {
    await this.db.execute(
      'INSERT INTO discovery_values(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [key, JSON.stringify(value)],
    );
  }

  async migrateLegacy(value: unknown) {
    this.migration ??= this.importLegacy(value).catch((error) => {
      this.migration = null;
      throw error;
    });
    return this.migration;
  }

  private async importLegacy(value: unknown) {
    if (await this.getValue('legacy-v1-imported')) return;
    const legacy = readDiscoveryPreferences(value);
    for (const record of Object.values(legacy.records)) {
      const existing = await this.db.select('SELECT id FROM discovery_records WHERE id = ?', [
        record.id,
      ]);
      if (!existing.length) {
        const known = DISCOVERY_CATALOG.find(
          (book) => book.id === record.id || matchesWork(book, record.title, record.author),
        );
        await this.saveRead({
          ...record,
          titleAliases: known?.titleAliases,
          authorAliases: known?.authorAliases,
        });
      }
    }
    for (const id of legacy.seen)
      await this.db.execute('INSERT OR IGNORE INTO discovery_seen(id) VALUES (?)', [id]);
    await this.setValue('legacy-v1-imported', true);
  }

  async record(book: DiscoveryBook, status: DiscoveryStatus) {
    await this.saveRead({
      id: book.workId ?? book.id,
      title: book.title,
      author: book.author,
      titleAliases: book.titleAliases,
      authorAliases: book.authorAliases,
      status,
      updatedAt: Date.now(),
    });
  }

  async saveRead(record: DiscoveryRecord) {
    const title = record.title.trim(),
      author = record.author.trim();
    if (!title) throw Error('请填写书名');
    const saved = { ...record, title, author };
    // One transaction includes the record and all identity aliases. JSON quotes are SQL escaped.
    const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;
    await this.db.batch([
      `INSERT INTO discovery_records(id,status,title,author,updated_at,payload) VALUES (${quote(saved.id)},${quote(saved.status)},${quote(title)},${quote(author)},${saved.updatedAt},${quote(JSON.stringify(saved))}) ON CONFLICT(id) DO UPDATE SET status=excluded.status,title=excluded.title,author=excluded.author,updated_at=excluded.updated_at,payload=excluded.payload`,
      `DELETE FROM discovery_identities WHERE record_id=${quote(saved.id)}`,
      ...identities(saved).map(
        (identity) =>
          `INSERT INTO discovery_identities(record_id,identity) VALUES (${quote(saved.id)},${quote(identity)})`,
      ),
    ]);
  }

  async listRead(query = '', offset = 0, limit = 50): Promise<DiscoveryRecord[]> {
    const term = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await this.db.select<RecordRow>(
      `SELECT payload FROM discovery_records WHERE status='read' AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY updated_at DESC, id LIMIT ? OFFSET ?`,
      [term, term, limit, offset],
    );
    return rows.map((row) => JSON.parse(row.payload) as DiscoveryRecord);
  }

  async remove(id: string) {
    await this.db.execute('DELETE FROM discovery_identities WHERE record_id=?', [id]);
    await this.db.execute('DELETE FROM discovery_records WHERE id=?', [id]);
    await this.db.execute('DELETE FROM discovery_seen WHERE id=?', [id]);
  }

  async markSeen(book: DiscoveryBook) {
    await this.db.execute('INSERT OR IGNORE INTO discovery_seen(id) VALUES (?)', [
      book.workId ?? book.id,
    ]);
  }

  async isExcluded(
    book: DiscoveryBook,
    library: readonly { title: string; author: string; deletedAt?: number | null }[],
  ): Promise<boolean> {
    if (
      library.some(
        (shelved) => !shelved.deletedAt && matchesWork(book, shelved.title, shelved.author),
      )
    )
      return true;
    const id = book.workId ?? book.id;
    const keys = [
      ...identities(book),
      ...[book.title, ...(book.titleAliases ?? [])].map((title) => `${normalizeWorkText(title)}:`),
    ];
    const rows = await this.db.select(
      `SELECT id FROM discovery_seen WHERE id=? UNION ALL SELECT r.id FROM discovery_records r WHERE r.status IN ('read','dismissed') AND (r.id=? OR r.id IN (SELECT record_id FROM discovery_identities WHERE identity IN (${keys.map(() => '?').join(',')}))) LIMIT 1`,
      [id, id, ...keys],
    );
    return rows.length > 0;
  }
}
