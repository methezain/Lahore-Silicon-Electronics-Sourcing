/**
 * Fails when src/ uses a color function outside tokens.css,
 * a visual style attribute, or a Tailwind arbitrary value in a class.
 * See docs/engineering.md (Design tokens in code).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const colorFn = /\b(?:oklch|rgba?)\(/i;
const styleAttr = /\bstyle\s*=/;
const classAttr = /\bclass(?:Name)?(?::[A-Za-z]+)?\s*=/;
const arbitrary = /-\[[^\]]+\]/;
const sourceFile = /\.(?:astro|css|tsx?|jsx?|mjs|cjs|html|vue|svelte)$/;

/** @param {string} dir */
async function walk(dir) {
  /** @type {string[]} */
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (sourceFile.test(entry.name)) files.push(full);
  }
  return files;
}

/** @param {string} file */
function rel(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

const failures = [];

for (const file of await walk(root)) {
  const name = rel(file);
  const tokens = name === 'src/styles/tokens.css';
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const where = `${name}:${index + 1}`;
    if (!tokens && colorFn.test(line)) failures.push(`${where} color function outside tokens.css`);
    if (styleAttr.test(line)) failures.push(`${where} visual style attribute`);
    if (classAttr.test(line) && arbitrary.test(line)) {
      failures.push(`${where} Tailwind arbitrary value in a class`);
    }
  });
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} source check${failures.length === 1 ? '' : 's'} failed.`);
  process.exit(1);
}

console.log('src color functions, style attributes, and class values are clean.');
