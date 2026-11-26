const fs = require('fs');
const path = require('path');

const patchesDir = path.join(__dirname, '..', 'patches', 'expo-app-blocker');
const targetDir = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-app-blocker',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'appblocker'
);

if (fs.existsSync(patchesDir) && fs.existsSync(targetDir)) {
  const files = fs.readdirSync(patchesDir);
  for (const file of files) {
    const src = path.join(patchesDir, file);
    const dest = path.join(targetDir, file);
    fs.copyFileSync(src, dest);
    console.log(`[apply-patches] Synced ${file} to expo-app-blocker`);
  }
}
