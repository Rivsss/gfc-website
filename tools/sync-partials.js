#!/usr/bin/env node
/**
 * sync-partials.js
 * Copies partials/header.html and partials/footer.html into every page,
 * replacing whatever sits between the marker comments:
 *   <!-- header:start --> ... <!-- header:end -->
 *   <!-- footer:start --> ... <!-- footer:end -->
 * Pages in subfolders (blog/) get their relative paths fixed automatically.
 *
 * Usage:  node tools/sync-partials.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const header = fs.readFileSync(path.join(root, 'partials', 'header.html'), 'utf8').trim();
const footer = fs.readFileSync(path.join(root, 'partials', 'footer.html'), 'utf8').trim();

function listHtml(dir, depth) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || ['partials', 'assets', 'tools', 'information', 'node_modules', 'netlify-deploy'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listHtml(p, depth + 1);
    return e.name.endsWith('.html') ? [{ file: p, depth }] : [];
  });
}

function relativize(block, depth) {
  if (depth === 0) return block;
  const prefix = '../'.repeat(depth);
  // href/src that are site-relative (not http, #, mailto, tel, viber, or already ../)
  return block.replace(/(href|src)="(?!https?:|#|mailto:|tel:|viber:|\.\.\/|\/)([^"]+)"/g, (m, attr, url) => `${attr}="${prefix}${url}"`);
}

const headerRe = /<!-- header:start[\s\S]*?<!-- header:end -->/;
const footerRe = /<!-- footer:start[\s\S]*?<!-- footer:end -->/;

let touched = 0;
for (const { file, depth } of listHtml(root, 0)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  if (headerRe.test(after)) after = after.replace(headerRe, relativize(header, depth));
  if (footerRe.test(after)) after = after.replace(footerRe, relativize(footer, depth));
  if (after !== before) {
    fs.writeFileSync(file, after);
    touched++;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`done: ${touched} file(s) updated`);
