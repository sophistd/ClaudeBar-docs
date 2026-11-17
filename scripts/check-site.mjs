/**
 * [INPUT]: dist 生成的 HTML、静态资源及 Markdown。
 * [OUTPUT]: 双语覆盖、语言内导航、页内锚点、资源与敏感串检查报告。
 * [POS]: 发布前静态门禁，不以首页通过代替全站链接检查。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
const root = path.resolve('dist');
const base = '/ClaudeBar-docs';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
const all = await files(root);
const html = all.filter((file) => file.endsWith('.html'));
const errors = [];
let checked = 0;
for (const file of html) {
  const source = await readFile(file, 'utf8');
  const $ = load(source);
  const chinese = path.relative(root, file).startsWith('zh/');
  if ($('html').attr('lang') !== (chinese ? 'zh-CN' : 'en')) errors.push(`${file}: incorrect document language`);
  if (chinese) {
    for (const anchor of $('.sl-markdown-content a[href]').toArray()) {
      const href = $(anchor).attr('href');
      const sharedImage = /\/(?:diagrams|screenshots)\/[^?#]+\.(?:svg|png)(?:[?#]|$)/.test(href ?? '');
      if (href?.startsWith(`${base}/`) && !href.startsWith(`${base}/zh/`) && !sharedImage) errors.push(`${file}: Chinese body links to English ${href}`);
    }
  }
  const current = new URL(`${base}/${path.relative(root, file).replace(/index\.html$/, '')}`, 'https://sophistd.github.io');
  for (const element of $('[href],[src]').toArray()) {
    const ref = $(element).attr('href') ?? $(element).attr('src');
    if (!ref || /^(mailto:|data:|tel:|javascript:)/.test(ref)) continue;
    const url = new URL(ref, current);
    if (url.origin !== current.origin) continue;
    if (!url.pathname.startsWith(base + '/') && url.pathname !== base) { errors.push(`${file}: outside base ${ref}`); continue; }
    let target = path.join(root, decodeURIComponent(url.pathname.slice(base.length)));
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      const targetSource = await readFile(target, 'utf8');
      if (url.hash && target.endsWith('.html')) {
        const targetHTML = load(targetSource);
        if (!targetHTML('[id]').toArray().some((node) => targetHTML(node).attr('id') === decodeURIComponent(url.hash.slice(1)))) errors.push(`${file}: missing anchor ${ref}`);
      }
      checked++;
    } catch { errors.push(`${file}: missing target ${ref}`); }
  }
  if ($('h1').length !== 1) errors.push(`${file}: expected one H1`);
  const body = $('.sl-markdown-content').clone();
  body.find('pre,code').remove();
  if (body.text().includes('**')) errors.push(`${file}: unrendered Markdown emphasis`);
}
const contentRoot = path.resolve('src/content/docs');
const contentFiles = (await files(contentRoot)).filter((file) => file.endsWith('.mdx')).map((file) => path.relative(contentRoot, file));
const englishPages = contentFiles.filter((file) => !file.startsWith('zh/'));
const chinesePages = contentFiles.filter((file) => file.startsWith('zh/')).map((file) => file.slice(3));
for (const file of new Set([...englishPages, ...chinesePages])) {
  if (!englishPages.includes(file) || !chinesePages.includes(file)) errors.push(`Missing language counterpart: ${file}`);
}
const forbidden = [/\/Users\//, /TeamIdentifier=[A-Z0-9]{10}/, /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/, /gh[pousr]_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /ref-[a-z-]*(?:ban|fingerprint)[a-z-]*report/, /\.claude\/scratch/];
for (const file of all.filter((f) => /\.(?:html|md|txt|json|js|css|svg)$/.test(f))) {
  const source = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(source)) errors.push(`${file}: forbidden pattern ${pattern}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ pages: html.length, languagePairs: englishPages.length, checkedReferences: checked, sensitivePatternHits: 0, result: 'pass' }, null, 2));
