import { describe, it, expect } from 'vitest';
import {
  importPendingDownloads,
  type DownloadImportDeps,
} from '@/services/zlibrary/importDownloads';
import type { Book } from '@/types/book';
import type { ZLibraryDownload } from '@/store/zlibraryStore';

const download = (id: string): ZLibraryDownload => ({
  id,
  filename: `${id}.epub`,
  path: `/cache/${id}.epub`,
  status: 'ready',
});
const book = { hash: 'hash', title: '测试书籍' } as Book;

function setup(items = [download('1')]) {
  const calls: string[] = [];
  const updates: ZLibraryDownload[] = [];
  const deps: DownloadImportDeps = {
    list: async () => items,
    importFile: async (path) => {
      calls.push(`import:${path}`);
      return book;
    },
    saveBook: async () => {
      calls.push('save');
    },
    acknowledge: async (id) => {
      calls.push(`ack:${id}`);
    },
    update: (item) => {
      updates.push(item);
    },
  };
  return { calls, updates, deps };
}

describe('Z-Library download ingestion', () => {
  it('persists the book before retiring the download marker', async () => {
    const { calls, updates, deps } = setup();
    await importPendingDownloads(deps);
    expect(calls).toEqual(['import:/cache/1.epub', 'save', 'ack:1']);
    expect(updates.map((item) => item.status)).toEqual(['importing', 'done']);
  });

  it('retains a download for retry when persistence fails', async () => {
    const { calls, updates, deps } = setup();
    deps.saveBook = async () => {
      throw new Error('disk full');
    };
    await importPendingDownloads(deps);
    expect(calls).toEqual(['import:/cache/1.epub']);
    expect(updates.at(-1)?.detail).toBe('disk full');
    expect(updates.at(-1)?.status).toBe('failed');
  });

  it('continues with subsequent downloads after an invalid file', async () => {
    const { calls, updates, deps } = setup([download('1'), download('2')]);
    deps.importFile = async (path) => {
      calls.push(`import:${path}`);
      return path.includes('1') ? null : book;
    };
    await importPendingDownloads(deps);
    expect(calls).toEqual(['import:/cache/1.epub', 'import:/cache/2.epub', 'save', 'ack:2']);
    expect(updates.map((item) => item.status)).toEqual([
      'importing',
      'failed',
      'importing',
      'done',
    ]);
  });

  it('processes files sequentially and skips missing paths', async () => {
    const { calls, deps } = setup([{ ...download('0'), path: null }, download('1'), download('2')]);
    await importPendingDownloads(deps);
    expect(calls).toEqual([
      'import:/cache/1.epub',
      'save',
      'ack:1',
      'import:/cache/2.epub',
      'save',
      'ack:2',
    ]);
  });

  it('does not report success when acknowledgement fails', async () => {
    const { updates, deps } = setup();
    deps.acknowledge = async () => {
      throw new Error('marker error');
    };
    await importPendingDownloads(deps);
    expect(updates.at(-1)?.status).toBe('failed');
  });
});
