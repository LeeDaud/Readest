import { copyFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const appDir = fileURLToPath(new URL('../', import.meta.url));
const iconsDir = join(appDir, 'src-tauri/icons/android');
const resDir = join(appDir, 'src-tauri/gen/android/app/src/main/res');
if (!existsSync(resDir)) {
  throw new Error('Initialize Android with pnpm tauri android init before preparing branding.');
}
// Android init generates template icons. Use the committed upstream Readest PNGs;
// keep the upstream adaptive-icon XML, whose insets and monochrome mask are tracked.
for (const directory of readdirSync(iconsDir, { withFileTypes: true })) {
  if (!directory.isDirectory() || !directory.name.startsWith('mipmap-')) continue;
  const targetDir = join(resDir, directory.name);
  if (!existsSync(targetDir)) throw new Error(`Missing Android resource directory: ${targetDir}`);
  for (const filename of readdirSync(join(iconsDir, directory.name))) {
    if (filename.endsWith('.png')) {
      copyFileSync(join(iconsDir, directory.name, filename), join(targetDir, filename));
    }
  }
}
writeFileSync(
  join(resDir, 'values/strings.xml'),
  '<resources>\n    <string name="app_name">Readest</string>\n    <string name="main_activity_title">Readest</string>\n</resources>\n',
);
console.log('Android branding prepared: Readest name and upstream icons.');
