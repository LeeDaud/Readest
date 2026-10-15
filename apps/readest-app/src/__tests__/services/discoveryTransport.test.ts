import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ native: vi.fn(), web: vi.fn() }));
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => true }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mocks.native }));

beforeEach(() => {
  vi.resetModules();
  mocks.native.mockReset();
  mocks.web.mockReset();
  vi.stubGlobal('fetch', mocks.web);
  localStorage.clear();
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

it('recovers when native headers arrive but reading the response body fails', async () => {
  const nativeResponse = new Response('');
  vi.spyOn(nativeResponse, 'json').mockRejectedValue('request body cancelled');
  mocks.native.mockResolvedValue(nativeResponse);
  mocks.web.mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await expect(openLibraryJson('https://openlibrary.org/search.json')).resolves.toEqual({
    docs: [],
  });
  expect(mocks.web).toHaveBeenCalledOnce();
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

it('reuses a successful WebView connection for later searches and after a module reload', async () => {
  mocks.native.mockRejectedValue('native network unavailable');
  mocks.web.mockImplementation(async () => new Response(JSON.stringify({ docs: [] })));
  let { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await openLibraryJson('https://openlibrary.org/search.json?q=first');
  await openLibraryJson('https://openlibrary.org/search.json?q=second');
  expect(mocks.native).toHaveBeenCalledTimes(1);
  vi.resetModules();
  ({ openLibraryJson } = await import('@/services/discovery/openLibrary'));
  await openLibraryJson('https://openlibrary.org/search.json?q=third');
  expect(mocks.native).toHaveBeenCalledTimes(1);
  expect(mocks.web).toHaveBeenCalledTimes(3);
});

it('switches back to native once when the previously working WebView connection stops working', async () => {
  localStorage.setItem(
    'readest-discovery-transport-v1',
    JSON.stringify({ transport: 'web', expiresAt: Date.now() + 60000 }),
  );
  mocks.web.mockRejectedValue(new TypeError('Network changed'));
  mocks.native.mockImplementation(async () => new Response(JSON.stringify({ docs: [] })));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await openLibraryJson('https://openlibrary.org/search.json?q=first');
  await openLibraryJson('https://openlibrary.org/search.json?q=second');
  expect(mocks.web).toHaveBeenCalledTimes(1);
  expect(mocks.native).toHaveBeenCalledTimes(2);
});

it('expires the persisted connection preference so an old network choice is not permanent', async () => {
  localStorage.setItem(
    'readest-discovery-transport-v1',
    JSON.stringify({ transport: 'web', expiresAt: Date.now() - 1 }),
  );
  mocks.native.mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
  const { openLibraryJson } = await import('@/services/discovery/openLibrary');
  await openLibraryJson('https://openlibrary.org/search.json');
  expect(mocks.native).toHaveBeenCalledOnce();
  expect(mocks.web).not.toHaveBeenCalled();
});
