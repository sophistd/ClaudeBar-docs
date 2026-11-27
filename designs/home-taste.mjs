/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 REALMS/SCENE_REALM/CROSSINGS/ENV_DEFAULTS/MOTION、./home-source.mjs 的 renderHome，
 *          以及 node:fs 读取本目录的首页源文件（只在 Node 里运行，不进浏览器运行包）。
 * [OUTPUT]: 对外提供 HOME_SOURCES 受审文件清单、visibleText 可见文字抽取、SELF_NOTES 自我标注词表、TEXT_BUDGET 每节字数上限、BAD / GOOD 两组规则、audit({files, html}) → 违规清单、
 *           auditHome() 读盘并审当前首页。
 * [POS]: 首页四层柔性编码的最上层（Taste Contract）。双向门禁：BAD 拦住不许出现的东西（印到页面上的自我标注、复述、超出字数预算的章节、时钟、无限循环、
 *        过冲、悬停改尺寸、散落的帧循环）；GOOD 要求必须存在的东西（减弱动态退路、三界定义完整、
 *        每个声明都有环境承接、分形文档头）。build.mjs 构建前审一次，tests/home-taste.test.mjs 再审一次。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs';
import { REALMS, SCENE_REALM, CROSSINGS, ENV_DEFAULTS, MOTION } from './home-tokens.mjs';
import { renderHome } from './home-source.mjs';

export const HOME_SOURCES = [
  'home-tokens.mjs', 'home-kit.mjs', 'home-sense.mjs', 'home-ribbon.mjs', 'home-world.mjs', 'home-graph.mjs',
  'home-scene.mjs', 'home-source.mjs', 'home.mjs', 'home-taste.mjs', 'home.css',
  'figures/studio-kit.mjs', 'figures/studio-scenes.mjs', 'figures/render.mjs', 'figures/stage.mjs',
];

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');   // 规则只看代码，不看注释
const scripts = (files) => Object.entries(files).filter(([name]) => name.endsWith('.mjs') && name !== 'home-taste.mjs');
const hits = (files, pattern, only = () => true) => scripts(files).filter(([name]) => only(name))
  .filter(([, text]) => pattern.test(strip(text))).map(([name]) => name);

/** 页面上真正看得见的字：去掉 head、脚本、样式与标签，只留文字（读屏专用的 .sr 也算，它同样会被读到）。 */
export const visibleText = (html) => html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
  .replace(/<[^>]+>/g, '\n').replace(/&[a-z]+;/g, ' ').split('\n').map((line) => line.trim()).filter(Boolean);
/** 设计过程里的标注词：三界、遥测、刻度、引注都只许驱动环境，不许印到页面上。 */
export const SELF_NOTES = [/\b(TEXT|CODE|TOKEN)\b/, /人 · 现实|机器 · 心智|AI · 符号/, /零帧|渲染中|静止 ·/, /^\[\d+\]$/, /^(深度|速度|帧)$/, /项已检查/];
/** 每一节可见字数上限：一节只讲一件事，其余交给入口（按钮、链接、文档）。 */
export const TEXT_BUDGET = 140;
const sections = (html) => [...html.matchAll(/<section [^>]*id="([\w-]+)"[\s\S]*?<\/section>/g)].map(([block, id]) => ({ id, text: visibleText(block).join('') }));

// ============================================================================
//  BAD：出现即违规
// ============================================================================
export const BAD = [
  { id: 'clock', why: '动效只由事件触发，不由时钟驱动',
    find: ({ files }) => hits(files, /\b(setInterval|setTimeout)\s*\(/) },
  { id: 'stray-frame-loop', why: '整页只有 home-kit 的调度器可以请求帧，落定后才能真正零帧',
    find: ({ files }) => hits(files, /requestAnimationFrame/, (name) => name !== 'home-kit.mjs') },
  { id: 'infinite', why: '不许有无限循环的动画（呼吸灯、流光骨架、装饰性旋转）',
    find: ({ files }) => (/\binfinite\b/.test(strip(files['home.css'])) ? ['home.css'] : []) },
  { id: 'bezier', why: '过渡只取 snap / glide / settle 三档弹簧，不写贝塞尔曲线与散落的毫秒数',
    find: ({ files }) => {
      const css = strip(files['home.css']).replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/, '');
      const loose = [...css.matchAll(/(?:^|[;{\s])(?:transition|animation)\s*:\s*([^;{}]+)/g)]
        .filter(([, value]) => /cubic-bezier|\d+m?s\b/.test(value.replace(/var\([^)]*\)/g, '')));
      return loose.map(([rule]) => `home.css: ${rule.trim().slice(0, 60)}`);
    } },
  { id: 'hover-resize', why: '悬停只改填充、描边与光，不改尺寸与位置',
    find: ({ files }) => [...strip(files['home.css']).matchAll(/[^{}]*:hover[^{}]*\{([^}]*)\}/g)]
      .filter(([, body]) => /(^|[;\s])(width|height|padding|margin|font-size|transform)\s*:/.test(body)).map(([rule]) => `home.css: ${rule.trim().slice(0, 60)}`) },
  { id: 'self-note', why: '给自己的标注（三界名、遥测读数、刻度、引注编号）不是内容，不许出现在页面上',
    find: ({ html }) => visibleText(html).filter((line) => SELF_NOTES.some((pattern) => pattern.test(line))).map((line) => `页面文字「${line.slice(0, 24)}」`) },
  { id: 'restated', why: '同一句话只说一次：八个字以上的句子在页面上重复出现即为复述',
    find: ({ html }) => {
      const seen = new Map();
      for (const sentence of visibleText(html).join('').split(/[。！？]/).map((t) => t.trim()).filter((t) => t.length >= 8)) seen.set(sentence, (seen.get(sentence) ?? 0) + 1);
      return [...seen].filter(([, n]) => n > 1).map(([sentence]) => `「${sentence.slice(0, 24)}」出现了不止一次`);
    } },
  { id: 'text-budget', why: `一节只讲一件事：每节可见文字不超过 ${TEXT_BUDGET} 字，多的交给入口逐层展开`,
    find: ({ html }) => sections(html).filter(({ text }) => text.replace(/\s/g, '').length > TEXT_BUDGET).map(({ id, text }) => `章节 ${id} 有 ${text.replace(/\s/g, '').length} 字`) },
  { id: 'file-size', why: '单文件不超过 800 行，超出即重构契机',
    find: ({ files }) => Object.entries(files).filter(([, text]) => text.split('\n').length > 800).map(([name]) => name) },
];

// ============================================================================
//  GOOD：缺失即违规
// ============================================================================
export const GOOD = [
  { id: 'reduced-motion', why: '减弱动态时位移与缩放退化为淡入淡出，一次性脉冲取消',
    find: ({ files }) => {
      const block = files['home.css'].match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*$/)?.[0] ?? '';
      return block.includes(`${MOTION.fade * 1000}ms`) && /animation:\s*none/.test(block) ? [] : ['home.css 缺少减弱动态退路'];
    } },
  { id: 'realms-complete', why: '每一界都同时规定纸面与纸上文字色、强调色、风声、和弦、震动与一句去处',
    find: () => REALMS.filter((realm) => !['id', 'glyph', 'name', 'who', 'what', 'line', 'sheet', 'on', 'soft', 'accent', 'wind', 'chord', 'haptic'].every((key) => realm[key] !== undefined && realm[key] !== ''))
      .map((realm) => `REALMS.${realm.id}`) },
  { id: 'scenes-mapped', why: '每个章节都归属某一界，越界段两端与相邻章节一致',
    find: ({ html }) => {
      const order = [...html.matchAll(/data-scene="([\w-]+)" data-realm="(\w+)"/g)].map(([, id, realm]) => ({ id, realm }));
      const wrong = order.filter(({ id, realm }) => SCENE_REALM[id] !== realm).map(({ id }) => `章节 ${id} 的界与 SCENE_REALM 不符`);
      const gaps = order.slice(1).filter((scene, i) => scene.realm !== order[i].realm
        && !CROSSINGS.some(([before, from, to]) => before === scene.id && from === order[i].realm && to === scene.realm))
        .map(({ id }) => `章节 ${id} 之前换了界却没有越界段`);
      return [...wrong, ...gaps, ...(order.length ? [] : ['首页没有任何 data-scene 章节'])];
    } },
  { id: 'declarations-bound', why: '视图声明的每个微件与环境键，都必须有环境承接',
    find: ({ files, html }) => {
      const registered = new Set([...files['home-kit.mjs'].matchAll(/register\('([\w-]+)'/g)].map(([, name]) => name));
      const kits = [...new Set([...html.matchAll(/data-kit="([\w-]+)"/g)].map(([, name]) => name))].filter((name) => !registered.has(name));
      const binds = [...new Set([...html.matchAll(/data-bind="([\w-]+)"/g)].map(([, key]) => key))].filter((key) => !(key in ENV_DEFAULTS));
      return [...kits.map((name) => `未登记的微件 ${name}`), ...binds.map((key) => `未登记的环境键 ${key}`)];
    } },
  { id: 'fractal-header', why: '每个文件开头都有 INPUT / OUTPUT / POS / PROTOCOL 契约',
    find: ({ files }) => Object.entries(files).filter(([, text]) => !['[INPUT]', '[OUTPUT]', '[POS]', '[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md'].every((mark) => text.slice(0, 2400).includes(mark)))
      .map(([name]) => name) },
];

/** 审一遍，返回违规清单；空数组即通过。 */
export function audit(input) {
  return [...BAD.map((rule) => ['BAD', rule]), ...GOOD.map((rule) => ['GOOD', rule])]
    .flatMap(([side, rule]) => rule.find(input).map((where) => `[${side} · ${rule.id}] ${rule.why} —— ${where}`));
}

/** 读取当前首页的全部源文件并审一遍。 */
export function auditHome() {
  const files = Object.fromEntries(HOME_SOURCES.map((name) => [name, readFileSync(new URL(name, import.meta.url), 'utf8')]));
  return audit({ files, html: renderHome() });
}
