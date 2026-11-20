// Turns dist/index.html into a page fragment (no doctype/html/head/body wrappers) for hosts that add their own.
import { readFileSync, writeFileSync } from 'node:fs';
// the install files (manifest, icons, service worker) only exist on a real web host, so both single-page versions drop their links
const noInstall = (h) => h.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/gi, '');
let html = noInstall(readFileSync('dist/index.html', 'utf8'));
html = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?(html|head|body)[^>]*>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
writeFileSync('dist/tide-rush.html', html);
console.log('wrote dist/tide-rush.html', html.length, 'bytes');

// Also write a single-file version that opens with a double-click (no server needed).
const js = readFileSync('dist/game.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const page = noInstall(readFileSync('dist/index.html', 'utf8')).replace(/<script type="module"[^>]*src="[^"]*game\.js"[^>]*><\/script>/, () => '').replace('</body>', () => `<script type="module">\n${js}\n</script>\n</body>`);
writeFileSync('dist/tide-rush-standalone.html', page);
console.log('wrote dist/tide-rush-standalone.html', page.length, 'bytes');
