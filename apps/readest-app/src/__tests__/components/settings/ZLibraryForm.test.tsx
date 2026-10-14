import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ZLibraryForm from '@/components/settings/integrations/ZLibraryForm';
const mocks = vi.hoisted(() => ({
  settings: {
    zlibraryUrls: ['https://first.example/'],
    zlibrarySiteNames: {} as Record<string, string>,
  },
  save: vi.fn(),
  set: vi.fn(),
}));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ envConfig: {} }) }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: mocks.settings,
      saveSettings: mocks.save,
      setSettings: mocks.set,
    }),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.settings = { zlibraryUrls: ['https://first.example/'], zlibrarySiteNames: {} };
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('adds, names and reorders websites, persisting names with normalized URLs', async () => {
  render(<ZLibraryForm />);
  fireEvent.change(screen.getByLabelText('网站 1 名称'), { target: { value: '主入口' } });
  fireEvent.click(screen.getByRole('button', { name: '添加网站' }));
  fireEvent.change(screen.getByLabelText('网站 2 地址'), { target: { value: 'backup.example' } });
  fireEvent.change(screen.getByLabelText('网站 2 名称'), { target: { value: '备用入口' } });
  fireEvent.click(screen.getByRole('button', { name: '上移网站 2' }));
  expect((screen.getByLabelText('网站 1 地址') as HTMLInputElement).value).toBe('backup.example');
  expect((screen.getByLabelText('网站 1 名称') as HTMLInputElement).value).toBe('备用入口');
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  const next = {
    zlibraryUrls: ['https://backup.example/', 'https://first.example/'],
    zlibrarySiteNames: {
      'https://backup.example/': '备用入口',
      'https://first.example/': '主入口',
    },
  };
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({}, next));
  expect(mocks.set).toHaveBeenCalledWith(next);
  expect(screen.getByRole('status').textContent).toContain('已保存');
});

it('keeps previous settings when persistence fails', async () => {
  mocks.save.mockRejectedValue(new Error('Disk full'));
  render(<ZLibraryForm />);
  fireEvent.change(screen.getByLabelText('网站 1 地址'), { target: { value: 'new.example' } });
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Disk full');
  expect(mocks.set).not.toHaveBeenCalled();
});

it('supports deleting entries but prevents saving an empty list', async () => {
  render(<ZLibraryForm />);
  fireEvent.click(screen.getByRole('button', { name: '删除网站 1' }));
  expect(screen.queryByLabelText('网站 1 地址')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  expect((await screen.findByRole('alert')).textContent).toContain('至少');
  expect(mocks.save).not.toHaveBeenCalled();
});

it('limits the list to ten rows and loads saved display names', () => {
  mocks.settings = {
    zlibraryUrls: Array.from({ length: 10 }, (_, i) => `https://site${i}.example/`),
    zlibrarySiteNames: { 'https://site0.example/': '常用网站' },
  };
  render(<ZLibraryForm />);
  expect((screen.getByLabelText('网站 1 名称') as HTMLInputElement).value).toBe('常用网站');
  expect((screen.getByRole('button', { name: '添加网站' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect((screen.getByRole('button', { name: '上移网站 1' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});
