import { create } from 'zustand';

export type DownloadStatus =
  | 'downloading'
  | 'ready'
  | 'importing'
  | 'done'
  | 'failed'
  | 'unsupported';
export interface ZLibraryDownload {
  id: string;
  filename: string;
  path?: string | null;
  status: DownloadStatus;
  detail?: string;
}

export const useZLibraryStore = create<{
  downloads: ZLibraryDownload[];
  error: string;
  update: (download: ZLibraryDownload) => void;
  setError: (error: string) => void;
  retry: number;
  retryImports: () => void;
}>((set) => ({
  downloads: [],
  error: '',
  retry: 0,
  update: (download) =>
    set((state) => ({
      downloads: [...state.downloads.filter((item) => item.id !== download.id), download],
    })),
  setError: (error) => set({ error }),
  retryImports: () => set((state) => ({ retry: state.retry + 1 })),
}));
