#!/usr/bin/env node
/**
 * Guard: banned HTTP / fetch-wrapper packages.
 *
 * The project uses native fetch exclusively. The packages below are banned
 * because they duplicate native capabilities or carry known supply-chain /
 * security risk. Add new entries to BANNED_PACKAGES to extend coverage.
 *
 * Checked locations:
 *  - dependencies / devDependencies / peerDependencies / optionalDependencies
 *    / overrides in every package.json under apps/ and packages/ (and root).
 *  - Any source file import/require of a banned name in those same trees.
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = ['apps', 'packages'];
// Only scan root package.json for banned deps — the lockfile is managed by
// npm and will naturally contain transitive dep names that are not violations.
const extraFiles = ['package.json'];

const ignoreDirs = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.git',
  '.expo',
  'bin',
  'obj',
  'dist',
  'build',
]);

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yaml',
  '.yml',
]);

/**
 * Map of banned package name → reason shown in the error message.
 * Keep sorted alphabetically for easy review.
 */
const BANNED_PACKAGES = new Map([
  ['axios',          'Use native fetch instead.'],
  ['cross-fetch',    'Use native fetch instead.'],
  ['got',            'Use native fetch instead.'],
  ['isomorphic-fetch', 'Use native fetch instead.'],
  ['node-fetch',     'Use native fetch instead (Node 18+ has it built-in).'],
  ['request',        'Deprecated and unmaintained; use native fetch instead.'],
  ['superagent',     'Use native fetch instead.'],
  ['ky',             'Use native fetch instead.'],
  ['wretch',         'Use native fetch instead.'],
]);

/**
 * Regex that matches any banned package name appearing in an ES/CJS import.
 * Forms matched:
 *   import ... from 'pkg'
 *   import 'pkg'
 *   require('pkg')   require("pkg")
 * We anchor on the module specifier so generic identifiers (e.g. a local
 * function called `request`) never produce false positives.
 */
const BANNED_IMPORT_RE = new RegExp(
  `(?:from\\s*|require\\s*\\(\\s*)['"](${[...BANNED_PACKAGES.keys()].map(escapeRe).join('|')})['"]`,
  'i',
);

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const findings = [];

function isIgnoredDir(dirName) {
  return ignoreDirs.has(dirName);
}

function scanFile(filePath) {
  const fileName = path.basename(filePath);

  if (fileName === 'package.json') {
    const raw = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(raw);
    const depFields = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
      'overrides',
    ];

    for (const field of depFields) {
      const deps = pkg[field];
      if (!deps || typeof deps !== 'object') continue;
      for (const [banned, reason] of BANNED_PACKAGES) {
        if (Object.prototype.hasOwnProperty.call(deps, banned)) {
          const relative = path.relative(repoRoot, filePath);
          findings.push(`- ${relative} (${field}.${banned}): ${reason}`);
        }
      }
    }

    return;
  }

  const ext = path.extname(filePath);
  if (!textExtensions.has(ext)) return;
  if (filePath.endsWith('.tsbuildinfo')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  if (!BANNED_IMPORT_RE.test(content)) return;

  // Report which banned names were imported in this file.
  const matched = [...BANNED_PACKAGES.keys()].filter((name) =>
    new RegExp(
      `(?:from\\s*|require\\s*\\(\\s*)['"](${escapeRe(name)})['"]`,
      'i',
    ).test(content),
  );
  const relative = path.relative(repoRoot, filePath);
  findings.push(`- ${relative} (imports: ${matched.join(', ')})`);
}

function walkDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) continue;
      walkDir(fullPath);
      continue;
    }

    if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

for (const root of scanRoots) {
  walkDir(path.join(repoRoot, root));
}

for (const file of extraFiles) {
  const fullPath = path.join(repoRoot, file);
  if (fs.existsSync(fullPath)) scanFile(fullPath);
}

if (findings.length > 0) {
  console.error('Banned HTTP-wrapper package usage detected. Please remove these references:');
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log('No banned HTTP-wrapper packages detected.');
