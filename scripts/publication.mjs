/**
 * [INPUT]: 明确允许的文档站源文件，不遍历父仓库。
 * [OUTPUT]: 公开内容的大小与 SHA-256 清单；--stage 导出同一份字节。
 * [POS]: 发布边界；按明确清单收录授权展示页，不遍历私有设计附加文件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readdir, readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {publicationFiles} from '../designs/publication.mjs';
const allowedRoots = ['.github', 'src', 'scripts', 'tests', 'public'];
const allowedFiles = ['.gitignore', '.nvmrc', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'DESIGN.md', 'astro.config.mjs', 'package.json', 'package-lock.json', 'playwright.config.ts', 'tsconfig.json', ...publicationFiles.map(file => `designs/${file}`)];
for (const entry of [...allowedRoots, ...allowedFiles]) {
  let cursor = '';
  for (const part of entry.split('/')) {
    cursor = path.posix.join(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Symlink is not publishable: ${cursor}`);
  }
}
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.posix.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not publishable: ${name}`);
    if (entry.isDirectory()) out.push(...await walk(name));
    else if (entry.isFile()) out.push(name);
  }
  return out;
}
const files = [...allowedFiles, ...(await Promise.all(allowedRoots.map(walk))).flat()].sort();
const stageIndex = process.argv.indexOf('--stage');
const stage = stageIndex === -1 ? undefined : process.argv[stageIndex + 1];
if (stageIndex !== -1 && !stage) throw new Error('--stage requires a destination');
if (stage) {
  const sourceRoot = await realpath(process.cwd());
  const destination = path.resolve(stage);
  if (destination === sourceRoot || destination.startsWith(sourceRoot + path.sep) || sourceRoot.startsWith(destination + path.sep)) {
    throw new Error('Stage must not overlap the source tree or its ancestors');
  }
  // ---- 先检查完整路径链；不沿符号链接写入，也不覆盖已有导出内容 ----
  let cursor = path.parse(destination).root;
  for (const part of destination.slice(cursor.length).split(path.sep)) {
    cursor = path.join(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Stage path contains a symlink: ${cursor}`);
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
  }
  try {
    if ((await readdir(destination)).length) throw new Error('Stage directory must be empty');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(destination, { recursive: true });
}
const entries = await Promise.all(files.map(async (file) => {
  const source = await readFile(file);
  let bytes = source;
  if (stage) {
    const target = path.resolve(stage, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return {
    path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    ...(!bytes.equals(source) ? { sourceSha256: createHash('sha256').update(source).digest('hex') } : {}),
  };
}));
console.log(JSON.stringify({
  proposedRepository: 'sophistd/ClaudeBar-docs',
  proposedVisibility: 'public',
  approval: 'required-before-public-disclosure',
  sourceHistoryIncluded: false,
  generatedSite: 'GitHub Actions derives HTML, JS, CSS, search indexes, Markdown and llms.txt from these files.',
  files: entries,
}, null, 2));
