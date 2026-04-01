#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = ['apps', 'packages'];
const extraFiles = ['package.json', 'package-lock.json'];

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
      if (Object.prototype.hasOwnProperty.call(deps, 'axios')) {
        const relative = path.relative(repoRoot, filePath);
        findings.push(`- ${relative} (${field}.axios)`);
      }
    }

    return;
  }

  const ext = path.extname(filePath);
  if (!textExtensions.has(ext)) return;
  if (filePath.endsWith('.tsbuildinfo')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  if (!/\baxios\b/i.test(content)) return;

  const relative = path.relative(repoRoot, filePath);
  findings.push(`- ${relative}`);
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
  console.error('Axios usage detected. Please remove these references:');
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log('No axios references detected.');
