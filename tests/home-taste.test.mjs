/**
 * [INPUT]: designs/home-taste.mjs 的 BAD / GOOD 规则与 auditHome()，以及当前首页源文件。
 * [OUTPUT]: 首页品味门禁的回归：现状零违规；每条 BAD 规则对一份故意写坏的样本确实会报。
 * [POS]: 防止门禁沦为摆设——规则既要放行好的，也要真的拦住坏的。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { audit, auditHome, HOME_SOURCES } from '../designs/home-taste.mjs';
import { renderHome } from '../designs/home-source.mjs';

const files = () => Object.fromEntries(HOME_SOURCES.map((name) => [name, readFileSync(new URL(`../designs/${name}`, import.meta.url), 'utf8')]));
const ids = (input) => audit(input).map((line) => line.match(/· ([\w-]+)\]/)[1]);

test('the homepage passes both sides of the taste contract', () => {
  assert.deepEqual(auditHome(), []);
});

test('each bad-taste rule fires on a deliberately bad sample', () => {
  const html = renderHome();
  const broken = (name, extra) => ids({ files: { ...files(), [name]: files()[name] + extra }, html });
  assert.ok(broken('home.mjs', '\nsetInterval(() => {}, 16);').includes('clock'));
  assert.ok(broken('home.mjs', '\nrequestAnimationFrame(() => {});').includes('stray-frame-loop'));
  assert.ok(broken('home.css', '\n.x { animation: spin 2s linear infinite; }').includes('infinite'));
  // 减弱动态区块在文件末尾且不受此规则约束，所以坏样本要放在它之前
  assert.ok(ids({ files: { ...files(), 'home.css': files()['home.css'].replace('@media (prefers-reduced-motion', '.x { transition: opacity 400ms cubic-bezier(.4, 0, .2, 1); }\n@media (prefers-reduced-motion') }, html }).includes('bezier'));
  assert.ok(broken('home.css', '\n.x:hover { transform: scale(1.05); }').includes('hover-resize'));
  assert.ok(broken('home.mjs', '\n'.repeat(801)).includes('file-size'));
  const page = (extra) => ids({ files: files(), html: html.replace('</main>', `${extra}</main>`) });
  assert.ok(page('<aside><b>码</b><span>CODE</span><em>机器 · 心智</em></aside>').includes('self-note'));
  assert.ok(page('<p>帧</p><p>静止 · 零帧</p>').includes('self-note'));
  assert.ok(page('<p>出口先核验，再放行连接到上游。</p><p>出口先核验，再放行连接到上游。</p>').includes('restated'));
  assert.ok(ids({ files: files(), html: html.replace('<section class="chapter" id="gate"', `<section class="chapter" id="gate"><p>${'字'.repeat(200)}</p>`) }).includes('text-budget'));
});

test('each good-taste rule fires when what it requires is missing', () => {
  const html = renderHome(), all = files();
  assert.ok(ids({ files: { ...all, 'home.css': all['home.css'].replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, '') }, html }).includes('reduced-motion'));
  assert.ok(ids({ files: all, html: html.replace('data-chapter data-shot="5"', 'data-chapter data-shot="99"') }).includes('chapter-has-shot'));
  assert.ok(ids({ files: all, html: html.replace('data-chapter data-shot="6"', 'data-chapter data-shot="2"') }).includes('chapter-has-shot'));
  assert.ok(ids({ files: all, html: html.replace('data-bead="leak"', 'data-bead="ghost"') }).includes('bead-has-gate'));
  assert.ok(ids({ files: { ...all, 'home.css': all['home.css'].replace('.card{', '.card{border-radius:26px;') }, html }).includes('square-corners'));
  assert.ok(ids({ files: { ...all, 'home.css': all['home.css'].replace('.card{', '.card{border-radius:999px;') }, html }).includes('square-corners'));
  assert.ok(ids({ files: { ...all, 'home.mjs': all['home.mjs'].replace('[POS]', '[WHERE]') }, html }).includes('fractal-header'));
});
