'use client';

import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useEnv } from '@/context/EnvContext';
import { useAuth } from '@/context/AuthContext';
import { isTauriAppPlatform } from '@/services/environment';
import { ingestFile } from '@/services/ingestService';
import { importPendingDownloads } from '@/services/zlibrary/importDownloads';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useZLibraryStore, type ZLibraryDownload } from '@/store/zlibraryStore';

// Serialize imports across effect remounts and overlapping download callbacks.
let importQueue: Promise<void> = Promise.resolve();
const detail = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function ZLibraryDownloadBridge() {
  const { appService, envConfig } = useEnv();
  const { user } = useAuth();
  const retry = useZLibraryStore((state) => state.retry);

  useEffect(() => {
    if (!isTauriAppPlatform() || !appService || appService.isMobileApp) return;
    const webview = getCurrentWebview();
    if (webview.label !== 'main') return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const drain = () => {
      importQueue = importQueue
        .then(async () => {
          if (disposed) return;
          const { update, setError } = useZLibraryStore.getState();
          await importPendingDownloads({
            list: () => invoke<ZLibraryDownload[]>('pending_zlibrary_downloads'),
            update,
            importFile: async (path) => {
              const state = useLibraryStore.getState();
              // importBook mutates its input: isolate it from the live Zustand array.
              const books = structuredClone(
                state.libraryLoaded ? state.library : await appService.loadLibraryBooks(),
              );
              return ingestFile(
                { file: path, books, forceCopy: true },
                { appService, settings: useSettingsStore.getState().settings, isLoggedIn: !!user },
              );
            },
            saveBook: (book) => useLibraryStore.getState().updateBooks(envConfig, [book]),
            acknowledge: (id) => invoke('acknowledge_zlibrary_download', { id }),
          });
          setError('');
        })
        .catch((error) => {
          useZLibraryStore.getState().setError(detail(error));
        });
    };
    // Listen before querying disk so completions during startup cannot be lost.
    void webview
      .listen<ZLibraryDownload>('zlibrary-download', ({ payload }) => {
        useZLibraryStore.getState().update(payload);
        if (payload.status === 'ready') drain();
      })
      .then((stop) => {
        if (disposed) stop();
        else {
          unlisten = stop;
          drain();
        }
      })
      .catch((error) => useZLibraryStore.getState().setError(detail(error)));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appService, envConfig, user, retry]);

  return null;
}
