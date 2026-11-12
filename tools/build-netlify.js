#!/usr/bin/env node
/**
 * build-netlify.js
 * Makes a clean upload folder for Netlify: netlify-deploy/
 * Copies only the site (pages, blog/, assets/). Leaves out information/,
 * partials/, tools/ and CLAUDE.md, which must never be published.
 * Adds staging files so search engines do not index the draft:
 *   _headers    X-Robots-Tag: noindex on every URL
 *   robots.txt  Disallow: /
 * Then checks every local link with exact letter case, because Netlify
 * runs on Linux where "Logo.png" and "logo.png" are different files.
 *
 * Usage:  node tools/build-netlify.js
 * Upload: drag the netlify-deploy folder onto https://app.netlify.com/drop
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'netlify-deploy');

// 1. Fresh output folder (only ever this one generated folder is removed)
if (path.basename(out) !== 'netlify-deploy' || path.dirname(out) !== root) throw new Error('unexpected output path');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

// 2. Copy the site
for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.html')) fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.cpSync(path.join(root, 'blog'), path.join(out, 'blog'), { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

// 3. Staging files (remove both for a real launch on Netlify)
fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n');
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

// 4. Case-sensitive link check
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
function existsExact(file) {
  const rel = path.relative(out, file);
  if (rel.startsWith('..')) return false;
  let dir = out;
  for (const part of rel.split(path.sep)) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(part)) return false; // exact case
    dir = path.join(dir, part);
  }
  return true;
}
const files = walk(out);
let links = 0;
const problems = [];
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|viber:|#|data:)/.test(url)) continue;
    if (url.startsWith('/')) { problems.push(`${path.relative(out, file)}: root-absolute link ${url}`); continue; }
    const clean = decodeURI(url.split('#')[0].split('?')[0]);
    if (!clean) continue;
    links++;
    if (!existsExact(path.resolve(path.dirname(file), clean))) problems.push(`${path.relative(out, file)} -> ${url}`);
  }
}
for (const f of files) {
  const rel = path.relative(out, f);
  if (/[^\x21-\x7e]|\s/.test(rel.replace(/\\/g, '/'))) problems.push(`awkward file name: ${rel}`);
}

const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
console.log(`netlify-deploy: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`checked ${links} local links (exact case): ${problems.length} problem(s)`);
problems.forEach((p) => console.log('  PROBLEM', p));
process.exit(problems.length ? 1 : 0);
