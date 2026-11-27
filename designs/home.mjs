/**
 * [INPUT]: 依赖 ./home-kit.mjs 的 env/frame/spring/mountKit/reduced/clamp、./home-sense.mjs 的 sense、./home-scene.mjs 的 mountScene、
 *          ./home-ribbon.mjs 的 curve/rest/project/measure/pinShift/createRibbon/createLeaders、./home-tokens.mjs 的 RIBBON；
 *          读取 home-source.mjs 生成的 data-* 结构（data-world / data-track / data-spacer / data-snap / data-chapter / data-threshold /
 *          data-fade / data-hold / data-pin / data-recovery / data-gallery / data-tilt / data-split / data-magnet /
 *          data-chapter-link / data-leaders / data-sense）。
 * [OUTPUT]: 首页运行入口（无导出）：把滚动翻译成环境（全页进度、速度、当前章节、章节进度 --p、三界 from/to/mix、恢复三态），
 *           再把环境交给纸带（DOM 纸片卷曲）、3D（纸面/房间/线框）、引线、声音与触感。
 *           卷曲版把世界固定在视口，原生滚动只推动一根空杆，显示位置由弹簧跟随；停下时若离某节的最佳展示位不远，
 *           就被轻轻吸正（远一点不干预）；滚轮跟手速率取 Lenis 的 lerp 0.1。按钮与索引项带指针磁吸。所有动效由事件触发，落定即零帧。
 * [POS]: designs 首页的 DOM 编排层：不画微件、不算曲线（曲线归 home-ribbon），只把滚动与选择变成环境；
 *        无 WebGL 或减弱动态时退化为平整纸带，内容、三界配色与恢复三态照常可用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RIBBON, rate } from './home-tokens.mjs';
import { env, frame, spring, mountKit, reduced, clamp } from './home-kit.mjs';
import { sense } from './home-sense.mjs';
import { mountScene } from './home-scene.mjs';
import { curve, rest, project, measure, pinShift, createRibbon, createLeaders } from './home-ribbon.mjs';

const root = document.documentElement;
root.classList.add('motion');   // 脚本真正执行时才允许 CSS 隐藏待入场内容
const fine = matchMedia('(pointer: fine)').matches;
const $ = (selector) => document.querySelector(selector), $$ = (selector) => [...document.querySelectorAll(selector)];

// ============================================================================
//  标题逐字入场：拆分只改视觉层，整句仍由 aria-label 朗读
// ============================================================================
for (const heading of $$('[data-split]')) {
  heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ''));
  let index = 0;
  for (const node of [...heading.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const fragment = document.createDocumentFragment();
    for (const char of node.textContent) {
      const span = document.createElement('span');
      span.className = 'char'; span.textContent = char; span.style.setProperty('--i', index++); span.setAttribute('aria-hidden', 'true');
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
}
void root.offsetWidth;
root.classList.add('is-ready');

// ============================================================================
//  3D 与纸带：有 WebGL 且未要求减弱动态才卷曲；失败即保留平整纸带
// ============================================================================
let scene = null;
try {
  const probe = document.createElement('canvas');
  if (!reduced && (probe.getContext('webgl2') || probe.getContext('webgl'))) { scene = mountScene($('[data-stage]')); root.classList.add('has-webgl'); }
} catch (error) {
  scene = null; root.classList.remove('has-webgl');
  console.warn('[ClaudeBar] 3D 场景不可用，保留平整纸带。', error);
}
// 2D / 3D：能卷曲时默认 3D，读者的选择记在本机；本机存储不可用时按默认走
const canCurl = Boolean(scene), MODE_KEY = 'claudebar.home.mode';
const stored = () => { try { return localStorage.getItem(MODE_KEY); } catch (error) { console.warn('[ClaudeBar] 读不到视图偏好，按默认显示。', error); return null; } };
let curled = canCurl && stored() !== '2d';
root.classList.toggle('has-webgl', curled);
const track = $('[data-track]'), spacer = $('[data-spacer]');
let leaders = curled ? createLeaders($('[data-leaders]')) : null;

// ---- 版面：一次量完，滚动时只做算术。尺寸、字体、图片变化时重量 ----
let c = curve(root.clientWidth, innerHeight), footTop = Infinity, layout = null, ribbon = null, snaps = [], stops = [], anchors = [], railDots = new Map(), graphBox = null;
const sheetBox = () => { const first = $('main .sheet'), last = [...$$('main .sheet')].at(-1); return { top: first.offsetTop, bottom: last.offsetTop + last.offsetHeight }; };

function relayout() {
  c = curve(root.clientWidth, innerHeight);
  layout = measure(track);
  footTop = $('.foot').offsetTop;
  for (const pin of layout.pins) pin.a = pin.top - (curled ? rest(pin.h, c) : c.vh * 0.18);
  if (curled) { spacer.style.height = `${layout.height}px`; ribbon = createRibbon(layout); }
  const max = Math.max(0, (curled ? layout.height : root.scrollHeight) - c.vh);
  snaps = [];
  for (const [id, box] of layout.sections) {
    const pin = layout.pins.find((p) => box.el.contains(p.el));
    if (pin) [0, 0.5, 1].forEach((f) => snaps.push({ id, s: pin.a + pin.H * f }));
    else if (box.cH !== undefined) snaps.push({ id, s: id === 'top' ? 0 : box.cTop - rest(box.cH, c) });
  }
  snaps.forEach((snap) => { snap.s = clamp(snap.s, 0, max); });
  stops = $$('[data-threshold]').map((el) => { const fade = layout.slabs.find((slab) => el.contains(slab.el) && slab.el.matches('[data-fade]')); const mid = fade.top + fade.h / 2; return { el, y0: mid, y1: mid + 1, from: el.dataset.from, to: el.dataset.to }; });   // 硬切：两界在 fade 片的中线交接
  anchors = [...layout.sections].filter(([id]) => !id.startsWith('to-')).map(([id, box]) => ({ key: id, id: id === 'top' ? 'hero' : id === 'download' ? 'finale' : id, y: box.cTop + box.cH / 2, pin: layout.pins.find((p) => box.el.contains(p.el)) ?? null }));
  const slot = layout.slabs.find((slab) => slab.el.matches('[data-graph]'));
  graphBox = slot ? { top: slot.top, h: slot.h, w: slot.w } : null;   // 首屏图谱占的那块纸片：图在 WebGL 里画，DOM 只留位置
  railDots = new Map($$('[data-chapter-link]').map((a) => { const r = a.querySelector('i').getBoundingClientRect(); return [a.getAttribute('href').slice(1), { x: r.right + 4, y: r.top + r.height / 2 }]; }));
  frame.wake();
}

// ============================================================================
//  滚动：卷曲版的显示位置由弹簧跟随原生滚动（滚轮跟手用 snap 档，磁吸归位用 glide 档）
// ============================================================================
const view = spring(scrollY, 'snap', 0.05).tune(RIBBON.lerp);   // 跟手手感取 Lenis 的 lerp 0.1（每秒 6）
let expected = null;   // 磁吸或锚点发起的程序滚动目标：到达前保持 glide 档
const goTo = (s, tier = 'settle') => { expected = Math.round(s); view.tune(tier); scrollTo({ top: s, behavior: 'instant' }); };
const snapOf = (id) => snaps.find((snap) => snap.id === id)?.s;

addEventListener('scroll', () => {
  if (expected === null || Math.abs(scrollY - expected) > 1) { expected = null; view.tune(RIBBON.lerp); }
  view.target = scrollY;
  if (!fine && expected === null) view.value = scrollY;   // 触控：手指在哪纸就在哪，不加拖尾
  frame.wake();
}, { passive: true });

// 磁吸：只在停得离最佳展示位很近（capture 屏以内）时轻轻吸正；远一点就不管，滚动手感交给用户
addEventListener('scrollend', () => {
  if (!curled || expected !== null || !snaps.length) return;
  const nearest = snaps.reduce((a, b) => (Math.abs(b.s - scrollY) < Math.abs(a.s - scrollY) ? b : a));
  const d = Math.abs(nearest.s - scrollY);
  if (d > 1 && d < c.vh * RIBBON.capture) goTo(nearest.s);
});

// 锚点与键盘焦点：世界固定在视口里，浏览器不会替它滚动，这里换算成文档滚动
document.addEventListener('click', (e) => {
  const link = e.target.closest?.('a[href^="#"]');
  const s = link && curled ? snapOf(link.getAttribute('href').slice(1)) : undefined;
  if (s === undefined) return;
  e.preventDefault(); history.replaceState(null, '', link.getAttribute('href')); goTo(s);
});
document.addEventListener('focusin', (e) => {
  if (!curled || !track.contains(e.target)) return;
  const slab = layout.slabs.find((item) => item.el.contains(e.target));
  if (!slab) return;
  const yv = slab.top + slab.h / 2 - scrollY + pinShift(slab.pin, scrollY);
  if (yv < c.qAt(c.vh * 0.14) || yv > c.qAt(c.vh * 0.88)) goTo(Math.max(0, slab.top + slab.h / 2 - c.qAt(c.vh * 0.5)));
});

// ============================================================================
//  恢复三态：滚动（驻留段进度）与手动选择共用一个出口；升级时图版边缘脉冲一次并出声，降级静默
// ============================================================================
const recovery = $('[data-recovery]'), recoveryText = $('[data-recovery-text]'), recoveryChips = $$('[data-recovery-chip]');
const RECOVERY_COPY = [
  '出口已核验。新的受管连接可以握手。',
  '上游断了。新的握手先等恢复探测，默认等 4 秒。',
  '出口变了，或探测被拒、到期没恢复。新的握手一律拒绝。',
];
let recoveryState = -1, pinnedState = null;
const setRecovery = (state) => {
  if (state === recoveryState) return;
  if (recoveryState >= 0 && state > recoveryState) {
    sense.state(state);
    if (!reduced) {
      const plate = recovery.querySelector('.states-plate');
      plate.classList.remove('is-escalated'); void plate.offsetWidth; plate.classList.add('is-escalated');
      plate.addEventListener('animationend', () => plate.classList.remove('is-escalated'), { once: true });
    }
  }
  recoveryState = state;
  recovery.dataset.state = String(state);
  recoveryChips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === state)));
  recoveryText.textContent = RECOVERY_COPY[state];
  env.set({ recovery: state });
};
recoveryChips.forEach((chip, i) => chip.addEventListener('click', () => { pinnedState = i; setRecovery(i); frame.wake(); }));

// ============================================================================
//  每帧：滚动位置 → 环境 → 纸带 / 3D / 引线。全部由共享调度器驱动，弹簧与速度落定即停
// ============================================================================
const progress = $('[data-progress]');
const links = new Map($$('[data-chapter-link]').map((a) => [a.getAttribute('href').slice(1), a]));
const setVar = (el, name, value, digits = 3) => {
  const text = value.toFixed(digits);
  if (el.dataset[name] !== text) { el.dataset[name] = text; el.style.setProperty(`--${name}`, text); }
};
let lastS = scrollY, velocity = 0;
const phase = new Map();

const update = (dt) => {
  const moving = curled ? view.step(dt) : false;
  const s = curled ? view.value : scrollY, vh = c.vh;
  const max = Math.max(1, (curled ? layout.height : root.scrollHeight) - vh);
  setVar(progress, 'p', clamp(s / max), 4);
  root.classList.toggle('is-scrolled', s > 24);
  root.classList.toggle('is-end', s + vh * 0.75 > footTop);   // 到页脚时收起索引与引线，不压住页脚文字

  const instant = Math.abs(s - lastS) / vh / dt; lastS = s;
  velocity += (instant - velocity) * (1 - Math.exp(-rate('snap') * dt));
  if (velocity < 0.004) velocity = 0;

  // 章节：内容框在视口里的顶边（驻留段要加上驻留位移）；到达最佳展示位时 --p 恰好为 1
  const bottom = curled ? c.qBottom : vh, reading = curled ? c.qAt(vh * 0.5) : vh * 0.55;
  const topOf = (id) => { const box = layout.sections.get(id), pin = layout.pins.find((p) => box.el.contains(p.el)); return box.cTop - s + (curled ? pinShift(pin, s) : 0); };
  let active = null;
  for (const [id, box] of layout.sections) {
    if (id.startsWith('to-') || box.cH === undefined) continue;
    const top = topOf(id);
    if (top < reading) active = id;
    const p = clamp((bottom - top) / Math.max(1, bottom - (curled ? rest(box.cH, c) : vh * 0.3)));
    phase.set(id, p);   // 舞台素材的时间轴：p = 1 即本节停在最佳展示位，那一刻就是"最富包孕性的顷刻"
    if (!box.el.matches('[data-chapter]')) continue;
    setVar(box.el, 'p', p);
  }
  links.forEach((link, id) => (id === active ? link.setAttribute('aria-current', 'step') : link.removeAttribute('aria-current')));

  const pin = layout.pins[0];
  if (pin && pinnedState === null) { const local = pin.H ? clamp((s - pin.a) / pin.H) : 0; setRecovery(local < 0.25 ? 0 : local < 0.75 ? 1 : 2); }
  if (pin && pinnedState !== null && (s < pin.a - vh * 0.5 || s > pin.a + pin.H + vh * 0.5)) pinnedState = null;   // 离开本章后交还给滚动

  // 三界：读线处的纸色就是当前所在；越界段内两界混合
  const line = s + (curled ? c.qAt(vh * 0.55) : vh * 0.6);
  let from = stops[0]?.from ?? 'text', to = from, mix = 0;
  for (const stop of stops) {
    setVar(stop.el, 'p', clamp((line - stop.y0) / (stop.y1 - stop.y0 + vh * 0.2)));
    if (line <= stop.y0) break;
    if (line >= stop.y1) { from = to = stop.to; mix = 0; continue; }
    from = stop.from; to = stop.to; mix = (line - stop.y0) / (stop.y1 - stop.y0); break;
  }
  env.set({ progress: clamp(s / max), velocity, chapter: active ?? '', from, to, mix, realm: mix < 0.5 ? from : to, depth: s / 1000 });

  if (curled) {
    ribbon.apply(s, c);
    const sheet = { w: layout.sheetW, ...sheetBox() };
    scene.render({ scroll: s, c, sheet, stops, anchors: anchors.map((a) => ({ id: a.id, y: a.y + pinShift(a.pin, s), p: phase.get(a.key) ?? 1 })), graph: graphBox, focus: env.get('focus'), recovery: recoveryState });
    const dot = railDots.get(active), box = layout.sections.get(active);
    leaders.draw(dot ?? { x: 0, y: 0 }, dot && box ? box.anchors.map((slab) => {
      const yv = slab.top + Math.min(slab.h / 2, 24) - s + pinShift(slab.pin, s);
      const [x, y, k] = project(-sheet.w / 2, yv, c);
      return { x, y, alpha: k > 0 && y > 72 && y < vh - 40 ? 1 : 0 };
    }) : []);
  }
  return moving || velocity > 0;
};

// ============================================================================
//  指针磁吸：按钮与索引项在指针靠近时朝它偏一点（至多 8px），离开后以弹簧归位。只改位移，不改尺寸
// ============================================================================
const magnets = fine && !reduced ? $$('[data-magnet]').map((el) => ({ el, x: spring(0, 'snap'), y: spring(0, 'snap') })) : [];
if (magnets.length) {
  addEventListener('pointermove', (e) => {
    for (const m of magnets) {
      const r = m.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, near = Math.abs(dx) < r.width / 2 + 36 && Math.abs(dy) < r.height / 2 + 28;
      m.x.target = near ? clamp(dx * 0.22, -8, 8) : 0; m.y.target = near ? clamp(dy * 0.3, -6, 6) : 0;
    }
    frame.wake();
  }, { passive: true });
  frame.add((dt) => magnets.reduce((moving, m) => {
    const a = m.x.step(dt), b = m.y.step(dt);
    m.el.style.setProperty('--mx', `${m.x.value.toFixed(2)}px`); m.el.style.setProperty('--my', `${m.y.value.toFixed(2)}px`);
    return a || b || moving;
  }, false));
}

// ============================================================================
//  2D / 3D 切换：同一份 DOM，切换只换"纸片写不写变换"。切换前记下当前章节，切换后回到同一章
// ============================================================================
const modeButtons = $$('[data-mode]');
const showMode = () => modeButtons.forEach((button) => {
  button.setAttribute('aria-pressed', String((button.dataset.mode === '3d') === curled));
  if (button.dataset.mode === '3d' && !canCurl) { button.disabled = true; button.title = '3D 需要 WebGL，且系统未开启"减弱动态效果"'; }
});
function flatten() {
  for (const slab of layout.slabs) {
    slab.key = ''; slab.lit = ''; slab.grow = '';
    const style = slab.el.style;
    style.transform = ''; style.transformOrigin = ''; style.opacity = ''; style.setProperty('--lit', '1');
  }
  ribbon = null;
}
function setMode(next) {
  if (next === curled || (next && !canCurl)) return;
  const here = env.get('chapter') || 'top';
  curled = next;
  root.classList.toggle('has-webgl', curled);
  if (curled) { leaders ??= createLeaders($('[data-leaders]')); scene.setRecovery(); } else flatten();
  try { localStorage.setItem(MODE_KEY, curled ? '3d' : '2d'); } catch (error) { console.warn('[ClaudeBar] 记不住视图偏好，只在这一页生效。', error); }
  relayout();
  const flatTop = (document.getElementById(here)?.getBoundingClientRect().top ?? 0) + scrollY - c.vh * 0.12;
  const target = Math.max(0, curled ? snapOf(here) ?? 0 : flatTop);
  view.value = view.target = target; expected = null;
  scrollTo({ top: target, behavior: 'instant' });
  showMode(); frame.wake();
}
modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode === '3d')));
showMode();

frame.add(update);
addEventListener('resize', relayout);
new ResizeObserver(() => relayout()).observe(track);
document.fonts?.ready.then(relayout);
mountKit();
relayout();
if (curled && location.hash && snapOf(location.hash.slice(1)) !== undefined) { const s = snapOf(location.hash.slice(1)); view.value = view.target = s; scrollTo({ top: s, behavior: 'instant' }); }
update(1 / 60);

// ============================================================================
//  环境 → 页面与感官：界变了换强调色并响一次和弦；章节变了、联动命中了各轻点一下
// ============================================================================
env.on('realm', (id) => { root.dataset.realm = id; });
env.on('realm', (id) => sense.cross(id), { immediate: false });
env.on('chapter', () => sense.tick(), { immediate: false });
env.on('focus', (focus) => { if (focus) sense.tick(); frame.wake(); }, { immediate: false });
const senseButton = $('[data-sense]');
senseButton?.addEventListener('click', () => sense.enable(!env.get('sense')));
env.on('sense', (on) => senseButton?.setAttribute('aria-pressed', String(on)));

// ============================================================================
//  工作台画廊：选中态来自共享 cb-segmented（aria-selected）；方向键在标签间移动，符合 ARIA tabs 约定
// ============================================================================
for (const gallery of $$('[data-gallery]')) {
  const tabs = [...gallery.querySelectorAll('[role=tab]')];
  const select = (tab, focus = false) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on)); other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
    sense.tick(); if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
    });
  });
}

// ---- 截图倾斜：只改变换，不改尺寸；离开后由 CSS 弹簧落定 ----
if (fine && !reduced) {
  for (const el of $$('[data-tilt]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`); el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`); el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
}
