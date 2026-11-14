// validate.mjs — lightweight pre-publish checks for the PREY: THE ESCAPE site.
// Run from the PREY-WEBSITE folder with `npm run validate`.
//
// Checks performed (all offline):
//  - index.html exists and is readable
//  - HTML comment balance is correct
//  - every locally-referenced asset exists on disk
//  - every in-page anchor link targets an element id that is present
//  - the APK download route points at a real, non-trivial file
//
// If a server is running, a separate live smoke test can be added later;
// this script deliberately stays offline so it never blocks forever on a
// network probe.

import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const publicDir = resolve(__dirname, '..', 'public');
const htmlPath = resolve(publicDir, 'index.html');
const failures = [];

function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  — ' + detail}`);
  if (!ok) failures.push(name);
}

// 1. index.html exists and is readable
if (!existsSync(htmlPath)) {
  check('index.html exists', false, 'missing');
} else {
  const html = readFileSync(htmlPath, 'utf8');
  check('index.html readable', true);
}

// 2. HTML comment balance
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8');
  const opens = (html.match(/<!--/g) || []).length;
  const closes = (html.match(/-->/g) || []).length;
  check('HTML comments balanced', opens === closes, `open=${opens} close=${closes}`);
}

// 3. every local asset referenced in index.html exists
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8');
  const refs = [...html.matchAll(/href="([^"]+)"/g), ...html.matchAll(/src="([^"]+)"/g)];
  const seen = new Set();
  // Skip things that are links rather than files: fragments, mail/tel, absolute URLs, inline data.
  const isFileRef = (p) =>
    !/^(#|mailto:|tel:|https?:|javascript:|data:)/i.test(p);
  for (const m of refs) {
    const p = m[1];
    if (!isFileRef(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    const full = resolve(publicDir, p);
    check(`asset present: ${p}`, existsSync(full), 'missing');
  }
}

// 4. every in-page anchor targets an element that exists
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf8');
  const ids = new Set();
  for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);
  const links = [...html.matchAll(/href="#([^"]+)"/g)];
  for (const m of links) {
    check(`anchor #${m[1]} targets an element`, ids.has(m[1]), `missing id="${m[1]}"`);
  }
}

// 5. the APK download route points at a real, non-trivial file
const apk = resolve(publicDir, 'downloads', 'PREY_THE_ESCAPE_v1.0.6_RELEASE.apk');
check('APK exists', existsSync(apk), apk);
if (existsSync(apk)) {
  const size = statSync(apk).size;
  check('APK non-trivial size', size > 1_000_000, `size=${size}`);
}

// 6. required folders are present
for (const f of [
  'assets/images',
  'assets/icons',
  'assets/models',
  'downloads',
  'css/styles.css',
  'css/archive.css',
  'js/main.js',
  'js/viewer.js',
  'js/vendor/three/three.module.js',
  'assets/models/ghoul.glb',
  'assets/models/zombie-c.glb',
  'assets/models/zombie-d.glb',
  'assets/models/zombie-t.glb',
  'assets/models/duke.glb',
  'assets/models/townsfolk.glb',
  'assets/models/zara-arms.glb',
]) {
  check(`folder/file present: ${f}`, existsSync(resolve(publicDir, f)), 'missing');
}

console.log('\n' + (failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} check(s) failed`));
process.exit(failures.length === 0 ? 0 : 1);
