import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adbShell, readAppFile, writeAppFile } from './helpers/adb';
import type { CdpPage } from './helpers/cdp';
import { APP_PKG, detectAndroidEnv, openFixtureBook, waitFor } from './helpers/reader';

const env = await detectAndroidEnv();
describe.runIf(env)('Android book discovery and persisted history', () => {
  let page: CdpPage;
  let previous: unknown;
  let captured = false;
  beforeAll(async () => {
    try {
      const settings = JSON.parse(await readAppFile(APP_PKG, 'settings.json'));
      previous = settings.bookDiscovery;
      captured = true;
    } catch {
      /* A fresh install has no settings file. */
    }
    page = await openFixtureBook(path.resolve(__dirname, '../fixtures/data/sample-alice.epub'));
    await page.evaluate("setTimeout(() => location.assign('/discover'), 20);");
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return [...document.querySelectorAll('button')].some(b => /随机推荐一本|继续推荐|开始新一轮/.test(b.textContent) && !b.disabled);",
        ),
      { label: 'native discovery loaded' },
    );
  });
  afterAll(async () => {
    page?.close();
    if (!captured) return;
    await adbShell(`am force-stop ${APP_PKG}`);
    const settings = JSON.parse(await readAppFile(APP_PKG, 'settings.json'));
    if (previous === undefined) delete settings.bookDiscovery;
    else settings.bookDiscovery = previous;
    await writeAppFile(APP_PKG, 'settings.json', JSON.stringify(settings));
  });
  it('left-swipes one card, records read history and retains it after native WebView reload', async () => {
    await page.evaluate(
      "[...document.querySelectorAll('button')].find(b => /随机推荐一本|继续推荐|开始新一轮/.test(b.textContent)).click();",
    );
    const first = await waitFor(
      () =>
        page.evaluate<string>("return document.querySelector('article h2')?.textContent || '';"),
      { label: 'first native recommendation' },
    );
    expect(await page.evaluate<number>("return document.querySelectorAll('article').length;")).toBe(
      1,
    );
    const target = await page.evaluate<{ x1: number; x2: number; y: number }>(`
      const r = document.querySelector('article').getBoundingClientRect(), dpr = devicePixelRatio;
      return { x1: (r.right - 30) * dpr, x2: (r.left + 30) * dpr, y: (r.top + 175) * dpr };
    `);
    await adbShell(
      `input swipe ${Math.round(target.x1)} ${Math.round(target.y)} ${Math.round(target.x2)} ${Math.round(target.y)} 350`,
    );
    const second = await waitFor(
      async () => {
        const title = await page.evaluate<string>(
          "return document.querySelector('article h2')?.textContent || ''; ",
        );
        return title && title !== first ? title : null;
      },
      { label: 'left swipe changed native card' },
    );
    await page.evaluate(
      "[...document.querySelectorAll('button')].find(b => b.textContent === '已经读过').click();",
    );
    await waitFor(
      async () => {
        const settings = JSON.parse(await readAppFile(APP_PKG, 'settings.json'));
        const records = Object.values(settings.bookDiscovery?.records ?? {}) as {
          title: string;
          status: string;
        }[];
        return (
          records.some((entry) => entry.title === first && entry.status === 'dismissed') &&
          records.some((entry) => entry.title === second && entry.status === 'read')
        );
      },
      { label: 'history persisted in native settings' },
    );
    await page.evaluate('setTimeout(() => location.reload(), 20);');
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return [...document.querySelectorAll('button')].some(b => b.textContent === '阅读记录');",
        ),
      { label: 'native discovery reloaded' },
    );
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return [...document.querySelectorAll('button')].some(b => b.textContent === '继续推荐' && !b.disabled);",
        ),
      { label: 'native saved preferences loaded' },
    );
    await page.evaluate(
      "[...document.querySelectorAll('button')].find(b => b.textContent === '阅读记录').click();",
    );
    const text = await page.evaluate<string>('return document.body.innerText;');
    expect(text).toContain(first);
    expect(text).toContain(second);
    expect(text).toContain('不感兴趣');
    expect(text).toContain('已读');
  });
});
