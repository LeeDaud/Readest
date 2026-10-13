import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ZLibraryPage from '@/app/zlibrary/page';

const mocks = vi.hoisted(() => ({
  mobile: true,
  tauri: true,
  invoke: vi.fn(),
  browser: vi.fn(),
  downloads: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isMobileApp: mocks.mobile } }),
}));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => mocks.tauri }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useWebBrowserDownloads', () => ({ useWebBrowserDownloads: mocks.downloads }));
vi.mock('@/services/webBrowser/webBrowser', () => ({ openWebBrowser: mocks.browser }));
vi.mock('@/services/webBrowser/webBrowserOptions', () => ({ getWebBrowserOptions: () => ({}) }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ settings: { globalViewSettings: { isEink: false } } }) },
}));
vi.mock('@/utils/nav', () => ({ navigateToReader: mocks.navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.mobile = true;
  mocks.tauri = true;
  mocks.browser.mockResolvedValue({});
  mocks.invoke.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('opens the mobile in-app browser and mounts the shared download importer', async () => {
  render(<ZLibraryPage />);
  fireEvent.click(screen.getByRole('button', { name: '进入 Z-Library' }));
  await waitFor(() => expect(mocks.browser).toHaveBeenCalledWith('https://zh.zlibrary.by/', {}));
  expect(mocks.downloads).toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
});

it('opens the downloaded book when the native browser returns its hash', async () => {
  mocks.browser.mockResolvedValue({ openBookHash: 'downloaded-book' });
  render(<ZLibraryPage />);
  fireEvent.click(screen.getByRole('button', { name: '进入 Z-Library' }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith(expect.anything(), ['downloaded-book']),
  );
});

it('keeps desktop browsing on the existing desktop download bridge', async () => {
  mocks.mobile = false;
  render(<ZLibraryPage />);
  fireEvent.click(screen.getByRole('button', { name: '打开 Z-Library' }));
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
  fireEvent.click(screen.getByRole('button', { name: '进入 Z-Library' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Browser unavailable');
  expect(mocks.navigate).not.toHaveBeenCalled();
});
