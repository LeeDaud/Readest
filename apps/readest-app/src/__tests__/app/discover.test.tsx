import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DiscoverPage from '@/app/discover/page';
import ReadHistoryPage from '@/app/read-history/page';
import { DISCOVERY_CATALOG } from '@/services/discovery/catalog';
import type { DiscoveryRecord } from '@/services/discovery/types';

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  downloads: vi.fn(),
  unlocked: true,
  next: vi.fn(),
  record: vi.fn(),
  records: [] as DiscoveryRecord[],
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/hooks/useDiscoveryDb', () => {
  const db = {
    record: mocks.record,
    listRead: mocks.list,
    saveRead: mocks.save,
    remove: mocks.remove,
    markSeen: vi.fn(),
  };
  return { useDiscoveryDb: () => ({ db: mocks.unlocked ? db : null, error: '', retry: vi.fn() }) };
});
vi.mock('@/services/discovery/onlineQueue', () => ({
  OnlineQueue: class {
    next = mocks.next;
    prefetch = vi.fn(async () => {});
  },
}));
vi.mock('@/services/discovery/metadata', () => ({
  loadBookDetails: async (book: unknown) => book,
  doubanSearchUrl: () => 'https://douban.com/search',
}));
vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector({ library: [] }),
    { getState: () => ({ library: [] }) },
  ),
}));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ settings: { globalViewSettings: { isEink: false } } }),
}));
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
  mocks.records = [];
  let cursor = 0;
  mocks.next.mockImplementation(async () => ({
    book: DISCOVERY_CATALOG[cursor++],
    offline: false,
  }));
  mocks.open.mockResolvedValue(undefined);
  mocks.record.mockImplementation(async (book, status) => {
    mocks.records.push({ ...book, status, updatedAt: 1 });
  });
  mocks.list.mockImplementation(async () =>
    mocks.records.filter((record) => record.status === 'read'),
  );
  mocks.save.mockImplementation(async (record) => {
    mocks.records = [...mocks.records.filter((item) => item.id !== record.id), record];
  });
  mocks.remove.mockImplementation(async (id) => {
    mocks.records = mocks.records.filter((item) => item.id !== id);
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});
afterEach(cleanup);

async function start() {
  render(<DiscoverPage />);
  const card = await screen.findByRole('article', { name: '书籍推荐卡片' });
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '换一本' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  return card.querySelector('h2')!.textContent!;
}
it('keeps one card and distinguishes vertical reading from an intentional left swipe', async () => {
  const title = await start();
  const card = screen.getByRole('article');
  fireEvent.touchStart(card, { touches: [{ clientX: 250, clientY: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 240, clientY: 230 }] });
  expect(mocks.record).not.toHaveBeenCalled();
  fireEvent.touchStart(card, { touches: [{ clientX: 250, clientY: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientX: 90, clientY: 105 }] });
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(title),
  );
  expect(mocks.records[0]).toMatchObject({ title, status: 'dismissed' });
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.queryByText('阅读与推荐记录')).toBeNull();
  expect(screen.queryByRole('button', { name: '获取封面与评分' })).toBeNull();
});
it('records a completed read separately from swapping and passes search terms to Z-Library', async () => {
  const title = await start();
  fireEvent.click(screen.getByRole('button', { name: '已经读过' }));
  await waitFor(() => expect(mocks.records[0]).toMatchObject({ title, status: 'read' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(title),
  );
  fireEvent.click(screen.getByRole('button', { name: '换一本' }));
  await waitFor(() => expect(mocks.next).toHaveBeenCalledTimes(3));
  expect(mocks.records).toHaveLength(1);
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '去 Z-Library 找这本书' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: '去 Z-Library 找这本书' }));
  await waitFor(() =>
    expect(mocks.open).toHaveBeenCalledWith(expect.stringContaining(DISCOVERY_CATALOG[2]!.title)),
  );
  await waitFor(() => expect(mocks.records[1]!.status).toBe('selected'));
  expect(mocks.downloads).toHaveBeenCalled();
});
it('preserves the visible card when history cannot be saved', async () => {
  const title = await start();
  mocks.record.mockRejectedValueOnce(Error('写入失败'));
  fireEvent.click(screen.getByRole('button', { name: '已经读过' }));
  expect((await screen.findByRole('alert')).textContent).toContain('写入失败');
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(title);
  expect(mocks.records).toHaveLength(0);
});

it('requests external covers with CORS for isolated WebViews and removes failed images', async () => {
  mocks.next.mockResolvedValueOnce({
    book: {
      ...DISCOVERY_CATALOG[0]!,
      metadata: {
        source: 'Open Library',
        url: 'https://openlibrary.org/works/OL123W',
        coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg?default=false',
      },
    },
    offline: false,
  });
  await start();
  const image = screen.getByRole('img');
  expect(image.getAttribute('crossorigin')).toBe('anonymous');
  fireEvent.error(image);
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(DISCOVERY_CATALOG[0]!.title);
});
it('does not record a failed browser launch or expose unlocked content before unlocking', async () => {
  await start();
  mocks.open.mockRejectedValueOnce(Error('无法打开网站'));
  fireEvent.click(screen.getByRole('button', { name: '去 Z-Library 找这本书' }));
  await screen.findByRole('alert');
  expect(mocks.record).not.toHaveBeenCalled();
  cleanup();
  mocks.unlocked = false;
  render(<DiscoverPage />);
  expect(screen.queryByRole('article')).toBeNull();
});
it('adds and edits completed books on the independent history page', async () => {
  render(<ReadHistoryPage />);
  fireEvent.click(screen.getByRole('button', { name: '添加' }));
  fireEvent.change(screen.getByLabelText('书名'), { target: { value: '测试已读书' } });
  fireEvent.change(screen.getByLabelText('作者'), { target: { value: '作者' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await screen.findByRole('heading', { name: '测试已读书' });
  fireEvent.click(screen.getByRole('button', { name: '编辑 测试已读书' }));
  fireEvent.change(screen.getByLabelText('书名'), { target: { value: '修改后的书' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await screen.findByRole('heading', { name: '修改后的书' });
  expect(mocks.records).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '删除 修改后的书' }));
  await waitFor(() => expect(mocks.records).toHaveLength(0));
  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  await screen.findByRole('heading', { name: '修改后的书' });
});
