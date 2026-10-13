import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ZLibraryPage from '@/app/zlibrary/page';

const mocks = vi.hoisted(() => ({
  mobile: true,
  tauri: true,
  invoke: vi.fn(),
  browser: vi.fn(),
  downloads: vi.fn(),
  navigate: vi.fn(),
  urls: undefined as string[] | undefined,
  appReady: true,
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isMobileApp: mocks.mobile } }),
}));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => mocks.tauri }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useWebBrowserDownloads', () => ({ useWebBrowserDownloads: mocks.downloads }));
vi.mock('@/services/webBrowser/webBrowser', () => ({ openWebBrowser: mocks.browser }));
vi.mock('@/services/webBrowser/webBrowserOptions', () => ({ getWebBrowserOptions: () => ({}) }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { zlibraryUrls: mocks.urls, globalViewSettings: { isEink: false } },
    }),
  },
}));
vi.mock('@/utils/nav', () => ({ navigateToReader: mocks.navigate }));
vi.mock('@/store/appLockStore', () => ({ useAppLockStore: () => mocks.appReady }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.mobile = true;
  mocks.tauri = true;
  mocks.urls = undefined;
  mocks.appReady = true;
  mocks.browser.mockResolvedValue({});
  mocks.invoke.mockImplementation((command: string) =>
    Promise.resolve(command === 'resolve_zlibrary_entry' ? 'https://zh.zlibrary.by/' : undefined),
  );
});
afterEach(cleanup);

it('opens the mobile in-app browser and mounts the shared download importer', async () => {
  render(<ZLibraryPage />);
  await waitFor(() =>
    expect(mocks.browser).toHaveBeenCalledWith('https://zh.zlibrary.by/', { fallbackUrls: [] }),
  );
  expect(screen.queryByRole('button', { name: '进入 Z-Library' })).toBeNull();
  expect(mocks.downloads).toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
});

it('opens the downloaded book when the native browser returns its hash', async () => {
  mocks.browser.mockResolvedValue({ openBookHash: 'downloaded-book' });
  render(<ZLibraryPage />);
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith(expect.anything(), ['downloaded-book']),
  );
});

it('keeps desktop browsing on the existing desktop download bridge', async () => {
  mocks.mobile = false;
  render(<ZLibraryPage />);
  await waitFor(() =>
    expect(mocks.invoke).toHaveBeenCalledWith('open_zlibrary', {
      url: 'https://zh.zlibrary.by/',
      navigate: true,
    }),
  );
  expect(mocks.browser).not.toHaveBeenCalled();
});

it('reports mobile browser failures without navigating away', async () => {
  mocks.browser.mockRejectedValue(new Error('Browser unavailable'));
  render(<ZLibraryPage />);
  expect((await screen.findByRole('alert')).textContent).toContain('Browser unavailable');
  expect(mocks.navigate).not.toHaveBeenCalled();
});

it('migrates the previous entry without a confirmation step', async () => {
  localStorage.setItem('zreader-zlibrary-url', 'https://books.example/');
  render(<ZLibraryPage />);
  await waitFor(() =>
    expect(mocks.browser).toHaveBeenCalledWith('https://books.example/', { fallbackUrls: [] }),
  );
});

it('passes configured backup entries to the native browser in saved order', async () => {
  mocks.urls = ['https://first.example/', 'https://second.example/', 'https://third.example/'];
  render(<ZLibraryPage />);
  await waitFor(() =>
    expect(mocks.browser).toHaveBeenCalledWith('https://first.example/', {
      fallbackUrls: ['https://second.example/', 'https://third.example/'],
    }),
  );
});

it('waits for app initialization and unlock before automatically opening an old link', async () => {
  mocks.appReady = false;
  const view = render(<ZLibraryPage />);
  expect(mocks.browser).not.toHaveBeenCalled();
  mocks.appReady = true;
  view.rerender(<ZLibraryPage />);
  await waitFor(() => expect(mocks.browser).toHaveBeenCalledTimes(1));
});
