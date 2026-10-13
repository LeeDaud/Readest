import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRouter } from 'next/navigation';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { isTauriAppPlatform } from '@/services/environment';
import { openWebBrowser } from '@/services/webBrowser/webBrowser';
import { getWebBrowserOptions } from '@/services/webBrowser/webBrowserOptions';
import { getZLibraryUrls } from '@/services/zlibrary/sites';
import { navigateToReader } from '@/utils/nav';

export function useOpenZLibrary() {
  const { appService } = useEnv();
  const router = useRouter();
  const _ = useTranslation();
  const opening = useRef(false);
  return useCallback(async () => {
    if (opening.current) return;
    if (!isTauriAppPlatform() || !appService) throw new Error('请在 Readest App 中访问 Z-Library');
    opening.current = true;
    try {
      let { settings } = useSettingsStore.getState();
      if (!settings.globalViewSettings) {
        settings = await appService.loadSettings();
        useSettingsStore.getState().setSettings(settings);
      }
      const urls = getZLibraryUrls(settings);
      if (appService.isMobileApp) {
        const result = await openWebBrowser(urls[0]!, {
          ...getWebBrowserOptions(_, !!settings.globalViewSettings.isEink),
          fallbackUrls: urls.slice(1),
        });
        if (result.openBookHash) navigateToReader(router, [result.openBookHash]);
        return result.openBookHash;
      } else {
        const url = await invoke<string>('resolve_zlibrary_entry', { urls });
        await invoke('open_zlibrary', { url, navigate: true });
      }
      return undefined;
    } finally {
      opening.current = false;
    }
  }, [appService, router, _]);
}
