import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.ini', '.js', '.jsx', '.json', '.md', '.mjs', '.py',
  '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const EXCLUDED_SEGMENTS = new Set([
  '.git', '.mypy_cache', '.pytest_cache', '.ruff_cache', '.venv', '__pycache__',
  'build', 'coverage', 'dist', 'node_modules',
]);
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const windows1252Continuation = '[\\u0080-\\u00bf\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e\\u0192\\u02c6\\u02dc\\u2013\\u2014\\u2018-\\u201a\\u201c-\\u201e\\u2020-\\u2022\\u2026\\u2030\\u2039\\u203a\\u20ac\\u2122]';
const mojibakePattern = new RegExp(`(?:\\u00c2|\\u00c3|\\u00c4|\\u00c6)${windows1252Continuation}|\\u00ef\\u00bf\\u00bd`, 'u');
const replacementPattern = /\ufffd/u;
const vietnameseDiacriticPattern = /[À-ỹĐđ]/u;
const embeddedQuestionPattern = /\p{L}\?\p{L}/u;

export function inspectText(text) {
  const findings = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    if (line.includes('utf8-check: intentional-corrupt-fixture')) return;
    if (replacementPattern.test(line)) findings.push({ line: index + 1, reason: 'replacement-character' });
    if (mojibakePattern.test(line)) findings.push({ line: index + 1, reason: 'known-mojibake-sequence' });
    if (vietnameseDiacriticPattern.test(line) && embeddedQuestionPattern.test(line)) {
      findings.push({ line: index + 1, reason: 'question-mark-inside-vietnamese-word' });
    }
  });
  return findings;
}

async function* walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) yield absolute;
  }
}

export async function scanRepository(root) {
  const failures = [];
  for await (const file of walk(root)) {
    let text;
    try {
      text = utf8Decoder.decode(await readFile(file));
    } catch {
      failures.push({ file, line: 0, reason: 'invalid-utf8' });
      continue;
    }
    for (const finding of inspectText(text)) failures.push({ file, ...finding });
  }
  return failures;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const failures = await scanRepository(root);
  for (const failure of failures) {
    console.error(`${path.relative(root, failure.file)}:${failure.line} ${failure.reason}`);
  }
  if (failures.length) process.exitCode = 1;
  else console.log('UTF-8 validation passed: no decoding, replacement, mojibake, or suspicious Vietnamese question-mark findings.');
}
