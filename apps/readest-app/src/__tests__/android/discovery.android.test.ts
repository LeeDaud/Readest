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
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await adbShell('input keyevent KEYCODE_HOME');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await adbShell(`am start -n ${APP_PKG}/com.bilingify.readest.MainActivity`);
    await waitFor(() => page.evaluate<boolean>("return document.visibilityState === 'visible';"), {
      label: 'reader foreground restored',
    });
    await page.evaluate("setTimeout(() => location.assign('/discover'), 20);");
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return !!document.querySelector('article h2') && [...document.querySelectorAll('button')].some(b => b.textContent.includes('换一本') && !b.disabled);",
        ),
      { timeoutMs: 90_000, label: 'native discovery loaded' },
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
      { timeoutMs: 90_000, label: 'left swipe changed native card' },
    );
    await page.evaluate(
      "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '已经读过').click();",
    );
    await waitFor(
      async () => {
        return await page.evaluate<boolean>(
          "return [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '换一本' && !b.disabled);",
        );
      },
      { timeoutMs: 90_000, label: 'read record saved and next card ready' },
    );
    await page.evaluate("setTimeout(() => location.assign('/read-history'), 20);");
    await waitFor(
      () =>
        page.evaluate<boolean>(
          `return [...document.querySelectorAll('h2')].some(heading => heading.textContent === ${JSON.stringify(second)});`,
        ),
      { label: 'independent read history loaded from native database' },
    );
    await page.evaluate('setTimeout(() => location.reload(), 20);');
    await waitFor(
      () =>
        page.evaluate<boolean>(
          `return [...document.querySelectorAll('h2')].some(heading => heading.textContent === ${JSON.stringify(second)});`,
        ),
      { label: 'read record retained after native reload' },
    );
    const text = await page.evaluate<string>('return document.body.innerText;');
    expect(text).toContain(second);
    expect(text).toContain('已读清单');
    expect(
      await page.evaluate<number>(
        `return [...document.querySelectorAll('h2')].filter(heading => heading.textContent === ${JSON.stringify(first)}).length;`,
      ),
    ).toBe(0);
  });

  it('edits a completed record and persists the edit on the separate native page', async () => {
    await page.evaluate(
      "[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith('编辑 ')).click();",
    );
    await page.evaluate(
      `const input=document.querySelector('input[required]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Android 已读编辑验证'); input.dispatchEvent(new Event('input',{bubbles:true}));`,
    );
    await page.evaluate("document.querySelector('form').requestSubmit();");
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return [...document.querySelectorAll('h2')].some(h => h.textContent === 'Android 已读编辑验证');",
        ),
      { label: 'native completed-book edit saved' },
    );
    await page.evaluate('setTimeout(() => location.reload(), 20);');
    await waitFor(
      () =>
        page.evaluate<boolean>(
          "return [...document.querySelectorAll('h2')].some(h => h.textContent === 'Android 已读编辑验证');",
        ),
      { label: 'native completed-book edit survived reload' },
    );
    await page.evaluate("setTimeout(() => location.assign('/reading-stats'), 20);");
    await waitFor(
      () =>
        page.evaluate<boolean>(
          'return !!document.querySelector(\'section[aria-label="总阅读时长"]\');',
        ),
      { label: 'native statistics database loaded' },
    );
    expect(await page.evaluate<string>('return document.body.innerText;')).toContain(
      '各本书的阅读时长',
    );
  });
});
