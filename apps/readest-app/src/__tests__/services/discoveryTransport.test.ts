import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ native: vi.fn(), web: vi.fn() }));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => true }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mocks.native }));

beforeEach(() => {
  vi.resetModules();
  mocks.native.mockReset();
  mocks.web.mockReset();
  vi.stubGlobal('fetch', mocks.web);
});
afterEach(() => vi.unstubAllGlobals());

it('falls back to the WebView connection when the native Android request rejects a string', async () => {
  mocks.native.mockRejectedValue('error sending request for url');
  mocks.web.mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await expect(openLibraryJson('https://openlibrary.org/search.json')).resolves.toEqual({
    docs: [],
  });
  expect(mocks.web).toHaveBeenCalledOnce();
});

it('reports a connection error after both transports fail instead of propagating a native string', async () => {
  mocks.native.mockRejectedValue('error sending request for url');
  mocks.web.mockRejectedValue(new TypeError('Failed to fetch'));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await expect(openLibraryJson('https://openlibrary.org/search.json')).rejects.toThrow(
    '无法连接在线书籍服务',
  );
});

it('does not retry a cancelled recommendation or hide server rate limiting', async () => {
  const controller = new AbortController();
  mocks.native.mockImplementation(async () => {
    controller.abort();
    throw 'request cancelled';
  });
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await expect(
    openLibraryJson('https://openlibrary.org/search.json', controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(mocks.web).not.toHaveBeenCalled();
});

it('keeps rate-limit responses on the native transport', async () => {
  mocks.native.mockResolvedValue(new Response('', { status: 429 }));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await expect(openLibraryJson('https://openlibrary.org/search.json')).rejects.toThrow(
    '书籍服务繁忙',
  );
  expect(mocks.web).not.toHaveBeenCalled();
});
