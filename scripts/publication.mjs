/**
 * [INPUT]: 明确允许的文档站源文件，不遍历父仓库。
 * [OUTPUT]: 文件大小与 SHA-256 清单，供公开披露批准和打包核对。
 * [POS]: 发布边界；默认失败关闭，新增根文件必须登记。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const allowedRoots = ['.github', 'src', 'scripts', 'tests', 'public'];
const allowedFiles = ['.gitignore', '.nvmrc', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'astro.config.mjs', 'package.json', 'package-lock.json', 'playwright.config.ts', 'tsconfig.json'];
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
const entries = await Promise.all(files.map(async (file) => {
  const bytes = await readFile(file);
  return { path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
console.log(JSON.stringify({
  proposedRepository: 'sophistd/ClaudeBar-docs',
  proposedVisibility: 'public',
  approval: 'required-before-public-disclosure',
  sourceHistoryIncluded: false,
  generatedSite: 'GitHub Actions derives HTML, JS, CSS, search indexes, Markdown and llms.txt from these files.',
  files: entries,
}, null, 2));
