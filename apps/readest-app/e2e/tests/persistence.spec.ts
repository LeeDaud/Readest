import { chromium } from '@playwright/test';
import { expect, test } from '../fixtures/base';
import { SAMPLE_EPUB, SAMPLE_PDF } from '../fixtures/books';
import { LibraryPage } from '../pages/LibraryPage';
import { ReaderPage } from '../pages/ReaderPage';

for (const [format, file] of [
  ['EPUB', SAMPLE_EPUB],
  ['PDF', SAMPLE_PDF],
] as const) {
  test(`${format} import, reading and progress survive a browser restart`, async ({}, testInfo) => {
    test.setTimeout(120_000);
    const profile = testInfo.outputPath('browser-profile');
    const options = {
      headless: true,
      channel: testInfo.project.use.channel,
      baseURL: 'http://localhost:3000',
      viewport: { width: 1280, height: 720 },
    };
    let context = await chromium.launchPersistentContext(profile, options);
    const suppressDemoBooks = () => localStorage.setItem('demoBooksFetched', 'true');
    try {
      await context.addInitScript(suppressDemoBooks);
      let page = context.pages()[0] || (await context.newPage());
      let library = new LibraryPage(page);
      await library.goto();
      await library.importBook(file);
      await expect(library.bookCards()).toHaveCount(1);
      await library.openFirstBook();
      let reader = new ReaderPage(page);
      await reader.waitForReady();
      const location = () =>
        reader.foliateView.evaluate(
          (element) =>
            (element as HTMLElement & { lastLocation?: { cfi: string } }).lastLocation?.cfi,
        );
      await expect.poll(location).toBeTruthy();
      const startLocation = await location();
      await reader.goToPage(5);
      await expect.poll(location).not.toBe(startLocation);
      await expect(reader.pageJumpInput).toHaveValue(/^\d+\s*\/\s*\d+$/);
      await expect.poll(() => reader.readingProgress()).toBeGreaterThan(2);
      const progress = await reader.readingProgress();
      // Use the app's close-to-library action, which awaits the config save.
      await reader.revealHeader();
      await reader.headerBar.getByTitle('Go to Library', { exact: true }).click();
      await expect(library.container).toBeVisible();
      await expect(library.bookCards()).toHaveCount(1);
      await context.close();

      context = await chromium.launchPersistentContext(profile, options);
      await context.addInitScript(suppressDemoBooks);
      page = context.pages()[0] || (await context.newPage());
      library = new LibraryPage(page);
      await library.goto();
      await expect(library.bookCards()).toHaveCount(1);
      await library.openFirstBook();
      reader = new ReaderPage(page);
      await reader.waitForReady();
      await reader.revealFooter();
      await expect
        .poll(async () => Math.abs((await reader.readingProgress()) - progress))
        .toBeLessThanOrEqual(1);
      await expect(reader.foliateView.locator('iframe').first()).toBeAttached();
    } finally {
      await context.close();
    }
  });
}
