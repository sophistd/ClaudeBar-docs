/**
 * [INPUT]: 真实发布脚本与隔离文件夹中的模拟文档源。
 * [OUTPUT]: 导出清单的字节证明，以及拒绝危险目标时无写入的回归。
 * [POS]: 发布边界验收；不操作应用仓库或实际公开 checkout。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync, existsSync, realpathSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

import {publicationFiles} from '../designs/publication.mjs';
const script = fileURLToPath(new URL('../scripts/publication.mjs', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'claudebar-publication-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  mkdirSync(source);
  for (const dir of ['.github', 'src', 'scripts', 'tests', 'public']) mkdirSync(path.join(source, dir));
  for (const file of ['.gitignore', '.nvmrc', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'DESIGN.md', 'astro.config.mjs', 'package-lock.json', 'playwright.config.ts', 'tsconfig.json']) {
    writeFileSync(path.join(source, file), 'fixture\n');
  }
  writeFileSync(path.join(source, 'package.json'), JSON.stringify({ scripts: { build: 'astro build', 'designs:build': 'node designs/build.mjs' } }));
  for (const file of publicationFiles) {
    const target = path.join(source, 'designs', file);
    mkdirSync(path.dirname(target), {recursive:true});
    writeFileSync(target, 'approved fixture');
  }
  writeFileSync(path.join(source, 'designs/private-note.txt'), 'not for publication');
  const run = (destination) => spawnSync(process.execPath, [script, ...(destination ? ['--stage', destination] : [])], { cwd: source, encoding: 'utf8' });
  return { root, source, run };
}

test('exported bytes match every manifest hash and include only approved showcase files', (t) => {
  const { root, source, run } = fixture(t);
  const original = readFileSync(path.join(source, 'package.json'));
  const destination = path.join(root, 'release');
  const result = run(destination);
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout);
  for (const file of manifest.files) {
    const bytes = readFileSync(path.join(destination, file.path));
    assert.equal(bytes.length, file.bytes);
    assert.equal(hash(bytes), file.sha256);
  }
  assert.equal(existsSync(path.join(destination, 'designs/ui-kit.html')), true);
  assert.equal(existsSync(path.join(destination, 'designs/private-note.txt')), false);
  assert.deepEqual(readFileSync(path.join(destination, 'package.json')), original);
  assert.deepEqual(readFileSync(path.join(source, 'package.json')), original);
  assert.equal(manifest.files.find((f) => f.path === 'package.json').sha256, hash(original));
});

test('source, ancestor and descendant targets are rejected before writing', (t) => {
  const { root, source, run } = fixture(t);
  const sentinel = path.join(root, 'CLAUDE.md');
  writeFileSync(sentinel, 'keep this');
  for (const destination of [root, source, path.join(source, 'new-export')]) assert.notEqual(run(destination).status, 0);
  assert.equal(readFileSync(sentinel, 'utf8'), 'keep this');
  assert.equal(existsSync(path.join(source, 'new-export')), false);
});

test('symlinks in the destination path cannot redirect writes', (t) => {
  const { root, source, run } = fixture(t);
  const alias = path.join(root, 'alias');
  symlinkSync(source, alias, 'dir');
  assert.notEqual(run(alias).status, 0);
  assert.notEqual(run(path.join(alias, 'nested')).status, 0);
  assert.equal(existsSync(path.join(source, 'nested')), false);
});

test('nonempty targets preserve their extra files and receive no exported files', (t) => {
  const { root, run } = fixture(t);
  const destination = path.join(root, 'release');
  mkdirSync(destination);
  writeFileSync(path.join(destination, 'private.txt'), 'keep this');
  assert.notEqual(run(destination).status, 0);
  assert.deepEqual(readdirSync(destination), ['private.txt']);
});

test('root source symlinks are rejected rather than copied', (t) => {
  const { root, source, run } = fixture(t);
  rmSync(path.join(source, 'README.md'));
  writeFileSync(path.join(root, 'private.txt'), 'not for publication');
  symlinkSync(path.join(root, 'private.txt'), path.join(source, 'README.md'));
  const destination = path.join(root, 'release');
  assert.notEqual(run(destination).status, 0);
  assert.equal(existsSync(destination), false);
});

// ---- 嵌套白名单也必须拒绝祖先目录符号链接 ----
test('showcase directory symlinks cannot disclose files outside the source', (t) => {
  for (const relative of ['designs', 'designs/assets']) {
    const {root, source, run} = fixture(t);
    const target = path.join(source, relative);
    const external = path.join(root, 'external');
    renameSync(target, external);
    symlinkSync(external, target, 'dir');
    const destination = path.join(root, 'release');
    assert.notEqual(run(destination).status, 0);
    assert.equal(existsSync(destination), false);
  }
});
