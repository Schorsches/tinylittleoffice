import process from 'node:process';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const files = readdirSync('dist/assets').filter((f) => /\.(js|css)$/.test(f));
const sizes = files.map((file) => ({ file, gzip: gzipSync(readFileSync(`dist/assets/${file}`)).length }));
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const initial = new Set();
function visit(key) {
  const item = manifest[key];
  if (!item || initial.has(item.file)) return;
  initial.add(item.file);
  for (const dependency of item.imports || []) visit(dependency);
}
visit('index.html');
const initialBytes = [...initial].reduce((n, file) => n + gzipSync(readFileSync(`dist/${file}`)).length, 0);
const css = sizes.filter((x) => x.file.endsWith('.css')).reduce((n, x) => n + x.gzip, 0);
process.stdout.write(sizes.map((x) => `${x.file}: ${(x.gzip / 1024).toFixed(1)} KiB gzip`).join('\n') + '\n');
process.stdout.write(`Initial JavaScript: ${(initialBytes / 1024).toFixed(1)} KiB gzip\n`);
if (!initial.size || initialBytes > 90 * 1024 || css > 15 * 1024) throw Error('JavaScript or CSS budget exceeded');
