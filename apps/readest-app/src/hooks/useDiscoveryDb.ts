import { useEffect, useState } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useAppLockStore } from '@/store/appLockStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';
import { DiscoveryDb } from '@/services/discovery/discoveryDb';

export function useDiscoveryDb() {
  const { appService } = useEnv();
  const unlocked = useAppLockStore((state) => state.isInitialized && state.isUnlocked);
  const [db, setDb] = useState<DiscoveryDb | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!appService || !unlocked) {
      setDb(null);
      return;
    }
    let cancelled = false;
    setError('');
    void (async () => {
      if (!useSettingsStore.getState().settings.globalViewSettings)
        useSettingsStore.getState().setSettings(await appService.loadSettings());
      if (!useLibraryStore.getState().libraryLoaded)
        useLibraryStore.getState().setLibrary(await appService.loadLibraryBooks());
      const database = await DiscoveryDb.open(appService);
      await database.migrateLegacy(useSettingsStore.getState().settings.bookDiscovery);
      if (!cancelled) setDb(database);
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : '无法读取本地记录');
    });
    return () => {
      cancelled = true;
    };
  }, [appService, unlocked, retry]);
  return { db: unlocked ? db : null, error, retry: () => setRetry((value) => value + 1) };
}
