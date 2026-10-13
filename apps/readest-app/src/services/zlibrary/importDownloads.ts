import type { Book } from '@/types/book';
import type { ZLibraryDownload } from '@/store/zlibraryStore';

export interface DownloadImportDeps {
  list: () => Promise<ZLibraryDownload[]>;
  importFile: (path: string) => Promise<Book | null>;
  saveBook: (book: Book) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  update: (download: ZLibraryDownload) => void;
}

// The native ready marker is retired only after library persistence succeeds.
// Process sequentially so each import sees the previous one's dedup state.
export async function importPendingDownloads(deps: DownloadImportDeps): Promise<void> {
  for (const item of await deps.list()) {
    if (!item.path) continue;
    deps.update({ ...item, status: 'importing' });
    try {
      const book = await deps.importFile(item.path);
      if (!book) throw new Error('未能识别下载的书籍文件');
      await deps.saveBook(book);
      await deps.acknowledge(item.id);
      deps.update({ ...item, filename: book.title || item.filename, status: 'done' });
    } catch (error) {
      deps.update({
        ...item,
        status: 'failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
