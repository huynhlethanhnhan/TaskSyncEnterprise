import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../docs/evidence/phase-4');
const requiredJson = [
  'chrome/layout_matrix.json',
  'edge/layout_matrix.json',
  'firefox/layout_matrix.json',
  'responsive/viewport_matrix.json',
  'notifications/latency_benchmark.json',
];
const forbidden = /(access[_-]?token|refresh[_-]?token|authorization\s*[:=]|secret[_-]?key|mssql_sa_password)/i;

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

for (const relative of requiredJson) {
  const full = path.join(root, relative);
  assert.ok((await stat(full)).size > 20, `${relative} is missing or empty`);
  const parsed = JSON.parse(await readFile(full, 'utf8'));
  if (Array.isArray(parsed.results)) {
    assert.ok(parsed.results.length > 0, `${relative} contains no result rows`);
    assert.ok(parsed.results.every((row) => row.pass === true), `${relative} contains failed rows`);
  } else {
    assert.equal(parsed.status, 'ok', `${relative} does not report ok`);
  }
}

const files = await walk(root);
for (const file of files) {
  const metadata = await stat(file);
  assert.ok(metadata.size > 0, `${path.relative(root, file)} is empty`);
  if (/\.(json|txt|log|md)$/i.test(file)) {
    const content = await readFile(file, 'utf8');
    assert.equal(forbidden.test(content), false, `${path.relative(root, file)} may contain a secret`);
  }
}

console.log(JSON.stringify({ status: 'ok', root, files: files.length, requiredJson: requiredJson.length }, null, 2));
