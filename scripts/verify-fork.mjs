import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const base = 'apps/readest-app/';
for (const path of ['src/app/discover/page.tsx', 'src/app/read-history/page.tsx', 'src/app/reading-stats/page.tsx', 'src/services/discovery/discoveryDb.ts', 'src/services/discovery/onlineQueue.ts', 'src/hooks/useOpenZLibrary.ts', 'src/hooks/useWebBrowserDownloads.ts', 'src/services/zlibrary/sites.ts', 'src/services/discovery/catalog.ts', 'src/__tests__/helpers/forkUpdatePolicy.test.ts']) {
  assert(existsSync(base + path), `Missing fork integration: ${path}`);
}
assert.match(read(base + 'src/services/forkUpdatePolicy.ts'), /FORK_UPDATES_DISABLED\s*=\s*true/);
assert.match(read(base + 'src/helpers/updater.ts'), /if \(FORK_UPDATES_DISABLED\) return false/);
const config = JSON.parse(read(base + 'src-tauri/tauri.conf.json'));
assert.equal(config.productName, 'Readest');
assert.deepEqual(config.plugins.updater.endpoints, []);
assert.match(read(base + 'src-tauri/gen/android/app/build.gradle.kts'), /applicationIdSuffix = "\.zreader"/);
console.log('Fork integrations, branding and update isolation are present.');
for (const workflow of ['release.yml', 'nightly.yml', 'upload-to-r2.yml', 'docker-image.yml', 'vercel-merge.yml']) {
  assert.match(read(`.github/workflows/${workflow}`), /if: github\.repository == 'readest\/readest'/, `Official publication must stay isolated: ${workflow}`);
}
