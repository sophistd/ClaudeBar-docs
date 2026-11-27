/**
 * [INPUT]: 依赖 ./home-kit.mjs 的 env/frame/spring/reduced、./home-trail.mjs 的 chapterState/mixOrbit、./home-scene.mjs 的 createScene、
 *          ./home-ribbon.mjs 的 createLeaders、./home-tokens.mjs 的 CAMERA/TRAIL/GATES/RIBBON；
 *          home-source 生成的结构：[data-chapter] 章节、[data-stage] 画布、[data-bead] 珠子、[data-chip] 层标签、[data-leaders] 引线层、
 *          [data-chapter-link] 索引、[data-mode] 2D/3D 开关、[data-gallery] 工作台画廊。
 * [OUTPUT]: 首页 DOM 编排入口（打包为 assets/home.bundle.js）：
 *           有 WebGL 才挂载空间层（html.has-webgl）；滚动换算成章节连续坐标 s，显示值以每秒 6 的速率跟随（Lenis lerp 0.1 的手感）；
 *           s 决定镜头、路头、分层、珠子状态、卡片显隐、索引当前项与引线；停下时离停驻中心不到 0.12 屏才以 settle 档轻轻吸正。
 *           2D/3D 是同一空间的一次变形（settle 档），选择记在本机；减弱动态强制 2D；触控窄屏默认 2D。
 * [POS]: 首页的编排层。帧只经 home-kit 的调度器；视图没变不画，落定即零帧。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { env, frame, spring, reduced } from './home-kit.mjs';
import { chapterState, mixOrbit } from './home-trail.mjs';
import { createLeaders } from './home-ribbon.mjs';
import { CAMERA, TRAIL, GATES, RIBBON } from './home-tokens.mjs';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const chapters = $$('[data-chapter]');
const links = $$('[data-chapter-link]');
const modeButtons = $$('[data-mode]');
const vw = () => document.documentElement.clientWidth;   // 不含常驻滚动条，与 position:fixed 的画布同宽
const phone = () => vw() < 760;

// ============================================================================
//  工作台画廊：与 WebGL 无关，先接上。方向键在标签间移动，符合 ARIA tabs 约定
// ============================================================================
for (const gallery of $$('[data-gallery]')) {
  const tabs = [...gallery.querySelectorAll('[role=tab]')];
  const select = (tab, focus = false) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on)); other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
    });
  });
}

// ============================================================================
//  空间层：只在拿得到 WebGL2 时挂载；拿不到就保持一页黑底长文
// ============================================================================
function webgl() {
  try { return Boolean(document.createElement('canvas').getContext('webgl2')); }
  catch (error) { console.warn('ClaudeBar 首页：WebGL 不可用，退回平面长文', error); return false; }
}
const listening = new AbortController();   // 空间层的全部监听器；出错退回长文时一次撤掉
if (webgl()) {
  const { createScene } = await import('./home-scene.mjs');
  try { mount(createScene($('[data-stage]'), { onRestore: () => frame.wake() })); }
  catch (error) { fallback(error); }
}

/** 空间层任何一处出错：退回一页长文，内容不能因为画面失败而消失。 */
function fallback(error) {
  console.error('ClaudeBar 首页：空间层出错，退回平面长文', error);
  listening.abort();   // 轻吸、滚动换算一并停掉：长文里不该再被拽动
  root.classList.remove('has-webgl');
  $$('[data-unfocusable]').forEach((el) => { el.removeAttribute('tabindex'); el.removeAttribute('data-unfocusable'); });
}
/** 看不见的卡片与索引：文字留在无障碍树里（读屏仍能顺读整篇），只让其中可交互的元素暂时不进 Tab 序列、不接点击。 */
function quiet(el, hidden) {
  if (!el || (el.dataset.hiddenNow === '1') === hidden) return;
  el.dataset.hiddenNow = hidden ? '1' : '0';
  el.style.pointerEvents = hidden ? 'none' : '';
  for (const a of el.querySelectorAll('a, button')) {
    if (hidden) { a.setAttribute('tabindex', '-1'); a.setAttribute('data-unfocusable', ''); }
    else { a.removeAttribute('tabindex'); a.removeAttribute('data-unfocusable'); }
  }
}

function mount(scene) {
  root.classList.add('has-webgl');
  const beads = Object.fromEntries($$('[data-bead]').map((el) => [el.dataset.bead, el]));
  const chips = $$('[data-chip]');
  const cardOf = chapters.map((section) => $('.card, .hero-copy, .board', section));
  const leaders = createLeaders($('[data-leaders]'));
  const count = $('[data-count]');
  const index = $('[data-index]');
  let tr = null, cams = [], centers = [], lastChapter = -1, broken = false, quietRect = null, quietFor = -1;
  /** 当前卡片在屏幕上的矩形（NDC），供着色器在卡片周围留出安静区；只在换章与尺寸变化时读一次布局。 */
  const readQuiet = (k) => {
    const r = cardOf[k]?.getBoundingClientRect();
    quietRect = r && r.width ? [(r.left / vw()) * 2 - 1, 1 - (r.bottom / innerHeight) * 2, (r.right / vw()) * 2 - 1, 1 - (r.top / innerHeight) * 2].map((x) => +x.toFixed(3)) : null;
    quietFor = k;
  };

  // ---- 2D / 3D：减弱动态强制 2D；否则本机记住的选择，默认触控窄屏 2D ----
  const saved = (() => { try { return localStorage.getItem('cb-home-mode'); } catch (error) { console.warn('读取视图偏好失败', error); return null; } })();
  const initial = reduced ? '2d' : saved ?? (matchMedia('(pointer: coarse)').matches && phone() ? '2d' : '3d');
  const mode = spring(initial === '3d' ? 1 : 0, 'settle');
  const show = (m) => modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  modeButtons.forEach((b) => { b.disabled = reduced && b.dataset.mode === '3d'; });
  show(initial);
  modeButtons.forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    show(b.dataset.mode); mode.target = b.dataset.mode === '3d' ? 1 : 0;
    try { localStorage.setItem('cb-home-mode', b.dataset.mode); } catch (error) { console.warn('保存视图偏好失败', error); }
    env.set({ mode: b.dataset.mode }); frame.wake();
  }));

  // ---- 滚动 → 章节连续坐标：视口中线在相邻两章中心之间的位置 ----
  const s = spring(0, 'settle').tune(RIBBON.lerp);
  const snap = spring(0, 'settle', 0.5);   // 单位是像素，半像素即落定
  let snapping = false;
  const measure = () => { centers = chapters.map((el) => el.offsetTop + el.offsetHeight / 2); };
  const target = () => {
    const mid = scrollY + innerHeight / 2, last = CAMERA.length - 1;
    if (mid <= centers[0]) return 0;
    for (let i = 0; i < Math.min(centers.length - 1, last); i++) {
      if (mid < centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
    }
    return last;
  };
  let pendingSnap = false, held = false;
  const nativeEnd = 'onscrollend' in window, opts = { passive: true, signal: listening.signal };
  // 手指或指针按住期间绝不吸附（Safari 回退路径没有 scrollend，只能靠这个判断「手已松开」）
  for (const type of ['touchstart', 'pointerdown']) addEventListener(type, () => { held = true; }, opts);
  for (const type of ['touchend', 'touchcancel', 'pointerup', 'pointercancel']) addEventListener(type, () => { held = false; frame.wake(); }, opts);
  addEventListener('scroll', () => {
    if (snapping && Math.abs(scrollY - snap.value) > 2) snapping = false;   // 别的来源改了滚动（拖滚动条、锚点、脚本），轻吸让位
    if (!snapping) pendingSnap = true;
    s.target = target(); frame.wake();
  }, opts);
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(type, () => { snapping = false; }, opts);
  function trySnap() {
    if (broken || held) return;
    pendingSnap = false;
    const mid = scrollY + innerHeight / 2, i = centers.reduce((best, c, k) => (Math.abs(c - mid) < Math.abs(centers[best] - mid) ? k : best), 0);
    const gap = centers[i] - mid;
    // 首章不吸（停在页顶就是停在页顶）；工作台是平常滚动，也不吸
    if (reduced || i === 0 || i > CAMERA.length - 1 || Math.abs(gap) < 1 || Math.abs(gap) > innerHeight * RIBBON.capture) return;
    snap.value = scrollY; snap.target = scrollY + gap; snapping = true; frame.wake();
  }
  // 有 scrollend 就在滚动停下的那一刻判断；没有（Safari）就等显示跟随落定再判断——仍是滚动事件驱动，不用时钟
  if (nativeEnd) addEventListener('scrollend', trySnap, opts);

  let first = true;
  function resize() {
    tr = scene.resize(vw(), innerHeight, phone());
    cams = CAMERA.map((spec) => tr.cameraFor(spec));
    measure();
    if (first) {
      // 深链进入：浏览器按平面布局滚过去，章节变高后要重新对准该章中心；然后直接落在当前章，不从第一章飞过去
      const hashed = location.hash && document.getElementById(location.hash.slice(1));
      const k = hashed ? chapters.indexOf(hashed.closest('[data-chapter]')) : -1;
      if (k >= 0) scrollTo(0, centers[k] - innerHeight / 2);
      s.target = target(); s.value = s.target; first = false;
    } else s.target = target();
    quietFor = -1;
    frame.wake();
  }
  addEventListener('resize', resize, opts);

  // ---- 珠子：起点、四道关、山顶。关卡色只表示核验结果 ----
  const pinList = () => [{ key: 's', tau: 0, layer: 0 }, ...GATES.map((g, k) => ({ key: g.key, tau: TRAIL.gates[k], layer: g.layer, gate: g, chapter: k + 2 })), { key: 'flag', tau: tr.T, layer: 3 }];
  const stateOf = (pin, st, sv) => {
    if (pin.key === 's') return 'start';
    if (pin.key === 'flag') return sv > 6.7 ? 'pass' : 'idle';
    if (st.head < pin.tau - 0.01) return st.head > pin.tau - 1.15 ? 'next' : 'idle';
    return sv < pin.chapter - 0.12 ? 'check' : pin.gate.result;
  };
  const place = (el, xy, alpha = 1) => {
    if (!xy) { if (!el.hidden) el.hidden = true; return; }
    if (el.hidden) el.hidden = false;
    el.style.transform = `translate(${xy[0].toFixed(1)}px,${xy[1].toFixed(1)}px)`;
    if (alpha !== 1) el.style.opacity = alpha.toFixed(3); else if (el.style.opacity) el.style.removeProperty('opacity');
  };
  const write = (el, key, value) => { if (el.dataset[key] !== value) el.dataset[key] = value; };

  function draw() {
    const sv = s.value, t = mode.value, st = chapterState(sv, tr.T);
    // 卡片是 sticky 的：换章那一刻它还没吸顶。停驻段里每帧重读一次矩形（在本帧写 DOM 之前，单次读，不引起强制回流链）
    if (quietFor !== Math.round(sv) || Math.abs(sv - Math.round(sv)) <= 0.3 || snapping) readQuiet(Math.round(sv));
    const orbit3 = mixOrbit(cams[st.i].three, cams[st.j].three, st.w), orbit2 = mixOrbit(cams[st.i].flat, cams[st.j].flat, st.w);
    const plate = Math.min(1, Math.max(0, (sv - 6.4) / 0.4));
    const near = Math.round(sv), quietOn = Number(cardOf[near]?.style.getPropertyValue('--o') || 0) * (quietRect && near >= 1 && near <= 6 ? 1 : 0);
    const view = { t, ex: st.ex * t, head: st.head, route: st.route, plate, quiet: quietRect, quietOn: +quietOn.toFixed(2), orbit: mixOrbit(orbit2, orbit3, t) };
    const pins = pinList(), screen = scene.render(view, pins);
    // 卡片：停驻中心前后 ±0.3 章全显，±0.48 章外全隐；只写 opacity
    chapters.forEach((_, i) => {
      const card = cardOf[i]; if (!card) return;
      const near = i > CAMERA.length - 1 ? 1 : 1 - Math.min(1, Math.max(0, (Math.abs(sv - i) - 0.3) / 0.18));
      const o = near.toFixed(3); if (card.style.getPropertyValue('--o') !== o) card.style.setProperty('--o', o);
      quiet(card, near === 0);
    });
    // 当前章按视口中线所在的章节算（工作台没有自己的镜头，但仍是一章）
    const mid = scrollY + innerHeight / 2;
    const current = centers.reduce((best, c, k) => (Math.abs(c - mid) < Math.abs(centers[best] - mid) ? k : best), 0);
    if (current !== lastChapter) {
      lastChapter = current; env.set({ chapter: current });
      links.forEach((a, k) => (k === current ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
      if (count) count.textContent = String(current + 1).padStart(2, '0');
    }
    const showIndex = !(sv < 0.55 || sv > 6.6);
    root.style.setProperty('--index-o', showIndex ? '1' : '0');
    quiet(index, !showIndex);
    // 珠子状态只取决于叙事位置；位置只在视图变化时重算（画面没变时沿用上一帧的投影）
    pins.forEach((pin) => write(beads[pin.key], 'state', stateOf(pin, st, sv)));
    if (!screen) return;
    const xy = {};
    const heroFlat = (1 - t) * Math.max(0, 1 - sv * 2);   // 平面首屏只看山，不放珠子
    pins.forEach((pin, k) => { xy[pin.key] = screen[k]; place(beads[pin.key], screen[k], pin.key === 'flag' ? 1 - heroFlat : (1 - plate * 0.9) * (1 - heroFlat)); });
    // 层标签：揭层时出现在每层纸的左缘
    chips.forEach((chip, i) => {
      const p = scene.project(tr.surface(tr.aRest - 0.4, -1.5, { t, ex: view.ex, layer: i, head: st.head }));
      place(chip, view.ex > 0.02 ? p : null, view.ex);
    });
    // 引线：索引当前项 → 本章落点（关卡章连到珠子左缘，拆层章连到四张层标签）
    const from = links[current]?.getBoundingClientRect();
    const alpha = Number(cardOf[current]?.style.getPropertyValue('--o') || 0) * (phone() ? 0 : 1);
    let targets = [];
    if (from && current >= 1 && current <= 5) {
      const key = current === 1 ? 's' : GATES[current - 2].key, p = xy[key];
      if (p) targets = [{ x: p[0] - 16, y: p[1] - 13, alpha }];
    } else if (from && current === 6) {
      targets = chips.map((chip) => { const r = chip.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, alpha: alpha * view.ex }; });
    }
    leaders.draw({ x: (from?.right ?? 0) + 6, y: (from?.top ?? 0) + (from?.height ?? 0) / 2 }, targets);
  }

  frame.add((dt) => {
    let moving = false;
    if (broken) return false;
    if (snapping) { moving = snap.step(dt) || moving; scrollTo(0, snap.value); if (!moving) snapping = false; }
    const following = s.step(dt);
    if (!following && pendingSnap && !snapping && !nativeEnd) trySnap();
    moving = following || snapping || moving;
    moving = mode.step(dt) || moving;
    try { draw(); } catch (error) { broken = true; fallback(error); return false; }
    return moving;
  });
  resize();
}
