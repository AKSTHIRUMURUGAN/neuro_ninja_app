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

// Ensure llama.rn enables buildConfig for AGP 9+
const llamaBuildGradle = path.join(__dirname, '..', 'node_modules', 'llama.rn', 'android', 'build.gradle');
if (fs.existsSync(llamaBuildGradle)) {
  const raw = fs.readFileSync(llamaBuildGradle, 'utf8');
  if (!raw.includes('buildFeatures') && raw.includes('android {')) {
    fs.writeFileSync(
      llamaBuildGradle,
      raw.replace('android {\n', 'android {\n  buildFeatures {\n    buildConfig true\n  }\n'),
      'utf8'
    );
    console.log('[apply-patches] Enabled buildFeatures.buildConfig in llama.rn');
  }
}
