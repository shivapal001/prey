#!/usr/bin/env node
// sync-apk.mjs — copies the Unity build APK into the site's downloads folder.
// Run from the game project root (or anywhere) with:
//   node PREY-WEBSITE/scripts/sync-apk.mjs
// You can also just copy the APK manually; this script merely guarantees the
// path is wired.

import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..', 'StaticMist-1.0.2', 'StaticMist-1.0.2');
const siteRoot = resolve(__dirname, '..');
const publicDir = resolve(siteRoot, 'public');
const downloadsDir = resolve(publicDir, 'downloads');
const apkName = 'PREY_THE_ESCAPE_v1.0.6_RELEASE.apk';
const apkSource = resolve(projectRoot, 'Builds', 'Android', apkName);

if (!existsSync(apkSource)) {
  console.warn(`[sync-apk] WARNING: expected APK not found at ${apkSource}`);
  console.warn('[sync-apk] copy or point the script at the built APK manually.');
  process.exit(0);
}

mkdirSync(downloadsDir, { recursive: true });
cpSync(apkSource, resolve(downloadsDir, apkName), { recursive: true });

const size = statSync(resolve(downloadsDir, apkName)).size;
console.log(`[sync-apk] copied ${apkName} (${size} bytes) → ${downloadsDir}/${apkName}`);

// Read the manifest to report the version packaged with the file.
import { execFileSync } from 'node:child_process';
try {
  const manifest = execFileSync(
    process.platform === 'win32' ? 'unzip' : 'unzip',
    ['-p', apkSource, 'AndroidManifest.xml'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  // The manifest is a protobuf; pull out the versionName value tokens.
  const m = manifest.match(/"1\.0\.6"/g);
  if (m) console.log('[sync-apk] built versionName in APK: 1.0.6');
} catch (e) {
  // best effort — the page already shows the version
}
