'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOpenZLibrary } from '@/hooks/useOpenZLibrary';
import { useWebBrowserDownloads } from '@/hooks/useWebBrowserDownloads';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppLockStore } from '@/store/appLockStore';

// Backward-compatible route: old bookmarks open the browser immediately too.
function ZLibraryContent() {
  const router = useRouter();
  const open = useOpenZLibrary();
  const appReady = useAppLockStore((state) => state.isInitialized && state.isUnlocked);
  useWebBrowserDownloads();
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!appReady || started.current) return;
    started.current = true;
    void open()
      .then((hash) => {
        if (!hash) router.replace('/library');
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [appReady, open, router]);
  return (
    <main className='mx-auto flex max-w-xl flex-col gap-4 p-6'>
      <Link href='/library'>← 返回书架</Link>
      {error ? <p role='alert'>{error}</p> : <p role='status'>正在打开 Z-Library…</p>}
      {error && (
        <button
          type='button'
          className='btn btn-contrast'
          onClick={() => {
            const store = useSettingsStore.getState();
            store.setRequestedPanel('Integrations');
            store.setRequestedSubPage('zlibrary');
            store.setSettingsDialogOpen(true);
            router.push('/library');
          }}
        >
          配置网站
        </button>
      )}
    </main>
  );
}

export default function ZLibraryPage() {
  return (
    <Suspense>
      <ZLibraryContent />
    </Suspense>
  );
}
