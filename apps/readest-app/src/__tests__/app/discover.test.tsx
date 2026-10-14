import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DiscoverPage from '@/app/discover/page';
import { useSettingsStore } from '@/store/settingsStore';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  open: vi.fn(),
  downloads: vi.fn(),
  unlocked: true,
}));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isMobileApp: true }, envConfig: {} }),
}));
vi.mock('@/store/libraryStore', async () => {
  const { create } = await import('zustand');
  return { useLibraryStore: create(() => ({ library: [], libraryLoaded: true })) };
});
vi.mock('@/store/settingsStore', async () => {
  const { create } = await import('zustand');
  const useSettingsStore = create((set) => ({
    settings: { globalViewSettings: { isEink: false } },
    saveSettings: mocks.save,
    setSettings: (settings: unknown) => set({ settings }),
  }));
  return { useSettingsStore };
});
vi.mock('@/store/appLockStore', () => ({ useAppLockStore: () => mocks.unlocked }));
vi.mock('@/hooks/useOpenZLibrary', () => ({ useOpenZLibrary: () => mocks.open }));
vi.mock('@/hooks/useWebBrowserDownloads', () => ({ useWebBrowserDownloads: mocks.downloads }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/services/webBrowser/webBrowser', () => ({ openWebBrowser: vi.fn() }));
vi.mock('@/services/webBrowser/webBrowserOptions', () => ({ getWebBrowserOptions: () => ({}) }));
vi.mock('@/utils/nav', () => ({ navigateToReader: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.unlocked = true;
  mocks.save.mockResolvedValue(undefined);
  mocks.open.mockResolvedValue(undefined);
  useSettingsStore.setState({ settings: { globalViewSettings: { isEink: false } } as never });
});
afterEach(cleanup);

it('dismisses and replaces one card on a deliberate left swipe, while vertical scrolling keeps it', async () => {
  const title = await start();
  const card = screen.getByRole('article', { name: '书籍推荐卡片' });
  fireEvent.touchStart(card, { touches: [{ clientX: 250, clientY: 200 }] });
  fireEvent.touchMove(card, { touches: [{ clientX: 235, clientY: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 235, clientY: 100 }] });
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(title);
  fireEvent.touchStart(card, { touches: [{ clientX: 300, clientY: 200 }] });
  fireEvent.touchMove(card, { touches: [{ clientX: 150, clientY: 205 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 150, clientY: 205 }] });
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(title),
  );
  expect(
    Object.values(useSettingsStore.getState().settings.bookDiscovery!.records)[0],
  ).toMatchObject({ title, status: 'dismissed' });
  expect(screen.getAllByRole('article')).toHaveLength(1);
});
async function start() {
  render(<DiscoverPage />);
  const button = await screen.findByRole('button', { name: '随机推荐一本' });
  fireEvent.click(button);
  await screen.findByRole('button', { name: '已经读过' });
  return screen.getByRole('heading', { level: 2 }).textContent!;
}
it('mounts the download importer and passes the selected book title and author to native search', async () => {
  const title = await start();
  fireEvent.click(screen.getByRole('button', { name: '去 Z-Library 找这本书' }));
  await waitFor(() => expect(mocks.open).toHaveBeenCalledWith(expect.stringContaining(title)));
  await waitFor(() =>
    expect(
      Object.values(useSettingsStore.getState().settings.bookDiscovery!.records)[0]?.status,
    ).toBe('selected'),
  );
  expect(mocks.downloads).toHaveBeenCalled();
});
it('advances after read and does not confuse switching suggestions with completed reading', async () => {
  const title = await start();
  fireEvent.click(screen.getByRole('button', { name: '已经读过' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(title),
  );
  expect(
    Object.values(useSettingsStore.getState().settings.bookDiscovery!.records)[0],
  ).toMatchObject({ title, status: 'read' });
  fireEvent.click(screen.getByRole('button', { name: '换一换' }));
  await waitFor(() =>
    expect(useSettingsStore.getState().settings.bookDiscovery!.seen).toHaveLength(3),
  );
  expect(Object.values(useSettingsStore.getState().settings.bookDiscovery!.records)).toHaveLength(
    1,
  );
});
it('preserves the card and saved history on a failed persistence write', async () => {
  const title = await start();
  mocks.save.mockRejectedValueOnce(new Error('写入失败'));
  fireEvent.click(screen.getByRole('button', { name: '已经读过' }));
  expect((await screen.findByRole('alert')).textContent).toBe('写入失败');
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(title);
  expect(useSettingsStore.getState().settings.bookDiscovery!.records).toEqual({});
});
it('does not mark a failed browser launch as selected or read', async () => {
  await start();
  mocks.open.mockRejectedValueOnce(new Error('无法打开网站'));
  fireEvent.click(screen.getByRole('button', { name: '去 Z-Library 找这本书' }));
  await screen.findByRole('alert');
  expect(useSettingsStore.getState().settings.bookDiscovery!.records).toEqual({});
});
it('waits for unlock before reading preferences or enabling recommendations', () => {
  mocks.unlocked = false;
  render(<DiscoverPage />);
  expect(screen.queryByRole('button', { name: '随机推荐一本' })).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});
