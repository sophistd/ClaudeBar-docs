/**
 * [INPUT]: build.mjs 生成的静态页、publication 清单与 Astro dist。
 * [OUTPUT]: 根地址产品首页、展示页及英文旧路由别名；复用同一生成内容。
 * [POS]: 全站构建最后一步；只复制明确的运行文件，不发布测试或维护记录。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './build.mjs';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {load} from 'cheerio';
import {siteFiles} from './publication.mjs';
for (const file of siteFiles) {
  let bytes = await readFile(new URL(file, import.meta.url));
  if (/\.(html|css|js|mjs)$/.test(file)) bytes = Buffer.from(bytes.toString().replaceAll('../public/', '../'));
  const output = new URL(`../dist/designs/${file}`, import.meta.url);
  await mkdir(new URL('.', output), {recursive:true});
  await writeFile(output, bytes);
}
console.log(`Published ${siteFiles.length} showcase files under dist/designs/.`);

// ---- 产品首页直接位于根地址；相对资源按原目录解析，不复制实现 ----
const home = load(await readFile(new URL('../dist/designs/index.html', import.meta.url), 'utf8'));
home('[href],[src]').each((_, node) => {
  for (const attribute of ['href', 'src']) {
    const value = home(node).attr(attribute);
    if (value && !/^(?:#|\/|[a-z]+:)/i.test(value)) {
      home(node).attr(attribute, new URL(value, 'https://sophistd.github.io/ClaudeBar-docs/designs/').pathname);
    }
  }
});
await writeFile(new URL('../dist/index.html', import.meta.url), home.html());

// ---- 保留所有既有英文文章 URL；规范路径、语言互链由 Starlight 统一生成 ----
const dist = new URL('../dist/', import.meta.url);
for (const file of await readdir(new URL('en/', dist), {recursive:true})) {
  if (!file.endsWith('.html') || file === 'index.html') continue;
  const alias = new URL(file, dist);
  const html = load(await readFile(new URL(`en/${file}`, dist), 'utf8'));
  html('head').append('<meta name="robots" content="noindex"/>');
  await mkdir(new URL('.', alias), {recursive:true});
  await writeFile(alias, html.html());
}
