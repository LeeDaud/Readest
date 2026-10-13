import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ZLibraryForm from '@/components/settings/integrations/ZLibraryForm';
const mocks = vi.hoisted(() => ({
  settings: { zlibraryUrls: ['https://first.example/'] },
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
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);
it('persists multiple entries in order through the existing settings service', async () => {
  render(<ZLibraryForm />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'backup.example\nfirst.example\nbackup.example' },
  });
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      {},
      { zlibraryUrls: ['https://backup.example/', 'https://first.example/'] },
    ),
  );
  expect(mocks.set).toHaveBeenCalledWith({
    zlibraryUrls: ['https://backup.example/', 'https://first.example/'],
  });
  expect(screen.getByRole('status').textContent).toContain('已保存');
});
it('keeps previous settings when persistence fails', async () => {
  mocks.save.mockRejectedValue(new Error('Disk full'));
  render(<ZLibraryForm />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new.example' } });
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Disk full');
  expect(mocks.set).not.toHaveBeenCalled();
});
it('prevents saving an empty list', async () => {
  render(<ZLibraryForm />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '保存网站' }));
  expect((await screen.findByRole('alert')).textContent).toContain('至少');
  expect(mocks.save).not.toHaveBeenCalled();
});
