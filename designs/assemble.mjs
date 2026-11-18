/**
 * [INPUT]: build.mjs 生成的静态页、publication 清单与 Astro dist。
 * [OUTPUT]: 同一 dist 下的 designs 页面及许可，资源链接复用站点共享目录。
 * [POS]: 全站构建最后一步；只复制明确的运行文件，不发布测试或维护记录。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import './build.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {siteFiles} from './publication.mjs';
for (const file of siteFiles) {
  let bytes = await readFile(new URL(file, import.meta.url));
  if (/\.(html|css|js|mjs)$/.test(file)) bytes = Buffer.from(bytes.toString().replaceAll('../public/', '../'));
  const output = new URL(`../dist/designs/${file}`, import.meta.url);
  await mkdir(new URL('.', output), {recursive:true});
  await writeFile(output, bytes);
}
console.log(`Published ${siteFiles.length} showcase files under dist/designs/.`);
