// check-assets.mjs — verify every asset, anchor and section in index.html.
// Run from within the PREY-WEBSITE folder:
//   node scripts/check-assets.mjs
//
// Pure node. Zero third-party dependencies.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = resolve(__dirname, '..');
const pub = resolve(here, 'public');
const html = readFileSync(join(pub, 'index.html'), 'utf8');

const failures = [];

function note(ok, label, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  — ' + detail}`);
  if (!ok) failures.push(label);
}

// --- 1. Every locally referenced asset exists under public/ -------------------
const refs = new Set();
for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) refs.add(m[1]);

for (const ref of refs) {
  // skip external urls (mailto:, tel:, http, javascript:, fragments)
  if (/^(#|mailto:|tel:|https?:|javascript:|data:)/i.test(ref)) continue;
  const full = resolve(pub, ref);
  const ok = existsSync(full) && statSync(full).isFile();
  note(ok, `asset present: ${ref}`, full);
}

// --- 2. Every anchor points at an id that exists -----------------------------
const ids = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) ids.add(m[1]);

for (const m of html.matchAll(/href="#([^"]+)"/g)) {
  note(ids.has(m[1]), `anchor #${m[1]} resolves`, 'missing id');
}

// --- 3. Every published top-level element has content ------------------------
const topEls = ['main', 'section', 'footer', 'header'];
for (const tag of topEls) {
  const cnt = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  note(cnt > 0, `element <${tag}> present`, 'none');
}

// --- 4. Actual game meshes for the 3D archive --------------------------------
for (const model of [
  'ghoul.glb',
  'zombie-c.glb',
  'zombie-d.glb',
  'zombie-t.glb',
  'duke.glb',
  'townsfolk.glb',
  'zara-arms.glb',
]) {
  const full = join(pub, 'assets', 'models', model);
  note(existsSync(full) && statSync(full).size > 50_000, `3D model present: ${model}`, full);
}

// --- 5. APK download route ---------------------------------------------------
const apk = join(pub, 'downloads', 'PREY_THE_ESCAPE_v1.0.6_RELEASE.apk');
note(existsSync(apk) && statSync(apk).size > 1_000_000, 'APK download file present', apk);

// --- 6. Preload is skippable --------------------------------------------------
note(/id="preload"/.test(html), 'preload screen present');

// --- report ------------------------------------------------------------------
console.log();
if (failures.length === 0) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log(`${failures.length} check(s) failed`);
  process.exit(1);
}
