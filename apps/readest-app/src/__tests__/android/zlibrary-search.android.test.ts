import { createServer } from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { adb, adbShell, tap } from './helpers/adb';
import { CdpPage, listPages } from './helpers/cdp';
import { detectAndroidEnv, openFixtureBook, waitFor } from './helpers/reader';

const env = await detectAndroidEnv();
const cdpPort = Number(process.env['READEST_CDP_PORT'] ?? 9333);

describe.runIf(env)('Android Z-Library search navigation', () => {
  it.each([
    false,
    true,
  ])('keeps a book search through failover (homepage redirect: %s), leaving resources to the reader', async (redirect) => {
    const query = '三体 刘慈欣 / &';
    const searchPath = `/s/${encodeURIComponent(query)}`;
    let canonicalSearches = 0;
    let downloads = 0;
    const server = createServer((request, response) => {
      const host = request.headers.host ?? '';
      const url = new URL(request.url ?? '/', `http://${host}`);
      // Model the observed mirror response: redirect every search to the
      // canonical homepage, discarding the path entirely.
      if (host.startsWith('127.0.0.1:')) {
        response.writeHead(301, { Location: `http://localhost:${port}/` });
        response.end();
        return;
      }
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (url.pathname.startsWith('/s/')) {
        canonicalSearches++;
        response.end(
          '<h1>搜索结果</h1><input id="searchField"><a href="/book/1">选择资源版本</a><img src="/slow-image" alt="封面仍在加载">',
        );
      } else if (url.pathname === '/slow-image') {
        // Keep onPageFinished pending while the reader uses visible results.
        response.setHeader('Content-Type', 'image/png');
        response.flushHeaders();
      } else if (url.pathname === '/book/1') {
        response.end(
          '<h1>资源详情</h1><a href="/download/book.epub">下载所选版本</a><a href="/">返回首页</a>',
        );
      } else if (url.pathname === '/download/book.epub') {
        downloads++;
        response.end('Download must be initiated by the reader');
      } else {
        response.end(
          '<h1>书源首页</h1><form action="/s/"><input id="searchField" name="q"></form>',
        );
      }
    });
    let port = 0;
    let main: CdpPage | undefined;
    let browser: CdpPage | undefined;
    try {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      port = (server.address() as AddressInfo).port;
      await adb(['reverse', `tcp:${port}`, `tcp:${port}`]);
      main = await openFixtureBook(path.resolve(__dirname, '../fixtures/data/sample-alice.epub'));
      await main.evaluate(`
        window.__bookSearchBrowserClosed = false;
        void window.__TAURI_INTERNALS__.invoke('open_web_browser', {
          url: ${JSON.stringify(`http://127.0.0.1:1${searchPath}`)},
          options: { fallbackUrls: [${JSON.stringify(`http://${redirect ? '127.0.0.1' : 'localhost'}:${port}${searchPath}`)}] }
        }).then(() => { window.__bookSearchBrowserClosed = true; }).catch(error => {
          window.__bookSearchBrowserError = String(error);
          window.__bookSearchBrowserClosed = true;
        });
      `);
      const target = await waitFor(
        async () =>
          (await listPages(cdpPort)).find(
            (candidate) => candidate.type === 'page' && candidate.url.includes(`:${port}/`),
          ),
        { timeoutMs: 30_000, label: 'native book source WebView after entry failover' },
      );
      browser = await CdpPage.connect(cdpPort, target.id);
      const source = browser;
      await waitFor(
        () =>
          source.evaluate<boolean>(
            `return location.hostname === 'localhost' && decodeURIComponent(location.pathname) === ${JSON.stringify(`/s/${query}`)} && document.querySelector('h1')?.textContent === '搜索结果';`,
          ),
        { timeoutMs: 20_000, label: 'encoded book search restored on redirected mirror' },
      );
      expect(canonicalSearches).toBe(1);
      expect(downloads).toBe(0);
      expect(await source.evaluate("return document.readyState !== 'complete';")).toBe(true);
      await adbShell('uiautomator dump /sdcard/readest-search-results.xml >/dev/null');
      await source.evaluate('document.querySelector(\'a[href="/book/1"]\').click();');
      await waitFor(
        () =>
          source.evaluate<boolean>(
            "return document.querySelector('h1')?.textContent === '资源详情';",
          ),
        { label: 'reader chose a resource manually' },
      );
      expect(downloads).toBe(0);
      await source.evaluate('document.querySelector(\'a[href="/"]\').click();');
      await waitFor(
        () =>
          source.evaluate<boolean>(
            "return location.pathname === '/' && document.querySelector('h1')?.textContent === '书源首页';",
          ),
        { label: 'reader can return home after search completion' },
      );
      expect(canonicalSearches).toBe(1);
      expect(downloads).toBe(0);
      const xml = await adbShell(
        'uiautomator dump /sdcard/readest-search-window.xml >/dev/null && cat /sdcard/readest-search-window.xml',
      );
      expect(await source.evaluate('return location.pathname;')).toBe('/');
      expect(canonicalSearches).toBe(1);
      const close = xml.match(/<node\b[^>]*content-desc="(?:Close|关闭)[^"]*"[^>]*>/)?.[0];
      const bounds = close?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if (!bounds) throw new Error('Native source browser close button not found');
      await tap(
        (Number(bounds[1]) + Number(bounds[3])) / 2,
        (Number(bounds[2]) + Number(bounds[4])) / 2,
      );
      await waitFor(() => main!.evaluate<boolean>('return window.__bookSearchBrowserClosed;'), {
        label: 'native browser closed by reader',
      });
      expect(await main.evaluate('return window.__bookSearchBrowserError || null;')).toBeNull();
    } finally {
      browser?.close();
      main?.close();
      // Dismiss the test dialog on failure and leave subsequent suites clean.
      if (main) await adbShell('input keyevent KEYCODE_BACK').catch(() => {});
      if (port) await adb(['reverse', '--remove', `tcp:${port}`]).catch(() => {});
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 120_000);
});
