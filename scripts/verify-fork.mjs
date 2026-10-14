import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const base = 'apps/readest-app/';
for (const path of ['src/app/discover/page.tsx', 'src/hooks/useOpenZLibrary.ts', 'src/hooks/useWebBrowserDownloads.ts', 'src/services/zlibrary/sites.ts', 'src/services/discovery/catalog.ts', 'src/__tests__/helpers/forkUpdatePolicy.test.ts']) {
  assert(existsSync(base + path), `Missing fork integration: ${path}`);
}
assert.match(read(base + 'src/services/forkUpdatePolicy.ts'), /FORK_UPDATES_DISABLED\s*=\s*true/);
assert.match(read(base + 'src/helpers/updater.ts'), /if \(FORK_UPDATES_DISABLED\) return false/);
const config = JSON.parse(read(base + 'src-tauri/tauri.conf.json'));
assert.equal(config.productName, 'Readest');
assert.deepEqual(config.plugins.updater.endpoints, []);
assert.match(read(base + 'src-tauri/gen/android/app/build.gradle.kts'), /applicationIdSuffix = "\.zreader"/);
console.log('Fork integrations, branding and update isolation are present.');
