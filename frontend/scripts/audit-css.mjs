import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/styles', import.meta.url).pathname;
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (file.endsWith('.css')) files.push(file);
  }
}
walk(root);
const selectorCounts = new Map();
const summary = files.map((file) => {
  const text = readFileSync(file, 'utf8');
  const rel = file.replace(process.cwd() + '/', '');
  const selectors = text.match(/(^|\n)\s*[^@{}][^{]+\{/g) ?? [];
  for (const raw of selectors) {
    const selector = raw.replace('{', '').trim();
    if (!selector || selector.startsWith('/*')) continue;
    selectorCounts.set(selector, (selectorCounts.get(selector) ?? 0) + 1);
  }
  return {
    file: rel,
    lines: text.split('\n').length,
    important: (text.match(/!important/g) ?? []).length,
    media: (text.match(/@media/g) ?? []).length,
  };
});
const totals = summary.reduce((acc, item) => {
  acc.lines += item.lines;
  acc.important += item.important;
  acc.media += item.media;
  return acc;
}, { lines: 0, important: 0, media: 0 });
console.log('CSS audit');
console.log('=========');
console.log(`Files: ${summary.length}`);
console.log(`Lines: ${totals.lines}`);
console.log(`!important: ${totals.important}`);
console.log(`@media: ${totals.media}`);
console.log('\nLargest CSS files:');
for (const item of summary.sort((a, b) => b.lines - a.lines).slice(0, 12)) {
  console.log(`- ${item.file}: ${item.lines} lines, ${item.important} !important, ${item.media} @media`);
}
console.log('\nMost repeated selectors:');
for (const [selector, count] of [...selectorCounts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`- ${selector}: ${count}`);
}
