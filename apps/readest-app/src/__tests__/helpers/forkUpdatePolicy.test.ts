import { beforeEach, expect, it, vi } from 'vitest';
import { checkForAppUpdates, checkAppReleaseNotes } from '@/helpers/updater';
import { FORK_UPDATES_DISABLED } from '@/services/forkUpdatePolicy';

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  fetch: vi.fn(),
  window: vi.fn(),
  visible: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mocks.fetch }));
vi.mock('@tauri-apps/plugin-os', () => ({ type: () => 'android', arch: () => 'aarch64' }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: mocks.window }));
vi.mock('@/components/UpdaterWindow', () => ({ setUpdaterWindowVisible: mocks.visible }));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => true }));
vi.mock('@/utils/version', () => ({ getAppVersion: () => '0.12.12', isUpdateNewer: () => true }));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
it.each([
  'stable',
  'nightly',
] as const)('blocks automatic and manual %s upstream updates even with old user settings', async (channel) => {
  expect(FORK_UPDATES_DISABLED).toBe(true);
  expect(await checkForAppUpdates((key) => key, true, channel)).toBe(false);
  expect(await checkForAppUpdates((key) => key, false, channel)).toBe(false);
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.check).not.toHaveBeenCalled();
  expect(mocks.window).not.toHaveBeenCalled();
  expect(mocks.visible).not.toHaveBeenCalled();
  expect(localStorage.getItem('lastAppUpdateCheck')).toBeNull();
});
it('does not present upstream changelogs as fork release announcements', async () => {
  expect(await checkAppReleaseNotes()).toBe(false);
  expect(await checkAppReleaseNotes(false)).toBe(false);
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.visible).not.toHaveBeenCalled();
});
