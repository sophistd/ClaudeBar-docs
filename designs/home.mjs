/**
 * [INPUT]: 依赖 ./home-scene.mjs 的 mountScene；读取 home-source.mjs 生成的 data-* 结构
 *          （data-split / data-reveal / data-scene / data-recovery / data-gallery / data-tilt / data-spot / data-chapter-link）。
 * [OUTPUT]: 首页运行入口（无导出）：首次出现的文字入场、滚动显现、章节导轨、巨型序号字重与解密标题（滚动相位）、
 *           恢复三态、工作台画廊、截图倾斜与 3D 场景挂载。
 *           所有动效由事件触发（滚动/指针/选择/状态跃迁），无时钟驱动与无限循环。
 * [POS]: designs 首页的 DOM 编排层；无 WebGL 或减少动态时内容与恢复三态仍完整可用，场景只是增强。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mountScene } from './home-scene.mjs';

const root = document.documentElement;
// 脚本真正执行时才允许 CSS 隐藏待入场内容；模块加载失败时页面保持全部可见
root.classList.add('motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ============================================================================
//  标题逐字入场：拆分只改视觉层，整句仍由 aria-label 朗读
// ============================================================================
for (const heading of document.querySelectorAll('[data-split]')) {
  heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ''));
  let index = 0;
  for (const node of [...heading.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const fragment = document.createDocumentFragment();
    for (const char of node.textContent) {
      const span = document.createElement('span');
      span.className = 'char'; span.textContent = char; span.style.setProperty('--i', index++);
      span.setAttribute('aria-hidden', 'true');
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
}
requestAnimationFrame(() => root.classList.add('is-ready'));

// ============================================================================
//  滚动显现：进入视口一次即固定，避免来回闪烁
// ============================================================================
const reveal = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-in'); reveal.unobserve(entry.target); }
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

// ============================================================================
//  3D 场景：失败即保留静态海报，页面不依赖它
// ============================================================================
let scene = null;
const canvas = document.querySelector('[data-stage]');
try {
  const probe = document.createElement('canvas');
  // 减弱动态：不挂载镜头穿越，保留静态门框海报（信息不丢，只是不动）
  if (canvas && !reduced && (probe.getContext('webgl2') || probe.getContext('webgl'))) {
    scene = mountScene(canvas, { reduced });
    root.classList.add('has-webgl');
  }
} catch (error) {
  root.classList.remove('has-webgl');
  console.warn('[ClaudeBar] 3D 场景不可用，保留静态版本。', error);
}

// ============================================================================
//  滚动驱动：顶部进度、章节导轨高亮、恢复三态。每帧最多计算一次。
// ============================================================================
const progress = document.querySelector('[data-progress]');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const links = new Map([...document.querySelectorAll('[data-chapter-link]')].map((a) => [a.getAttribute('href').slice(1), a]));
const recovery = document.querySelector('[data-recovery]');
const recoveryText = recovery?.querySelector('[data-recovery-text]');
const recoveryChips = recovery ? [...recovery.querySelectorAll('[data-recovery-chip]')] : [];
const RECOVERY_COPY = [
  '已有核验基线，允许新的受管连接握手。',
  '上游中断后，新的握手等待恢复探测。默认宽限期为 4 秒。',
  '实测出口漂移，或探测被拒且到期未恢复，门禁拒绝新的握手。',
];
let recoveryState = -1, pinnedState = null, ticking = false;

const setRecovery = (state) => {
  if (state === recoveryState) return;
  // 严重度升级时浮卡边缘脉冲一次；降级或首次赋值静默切换
  if (recoveryState >= 0 && state > recoveryState && !reduced) {
    const panel = recovery.querySelector('.panel');
    panel.classList.remove('is-escalated'); void panel.offsetWidth; panel.classList.add('is-escalated');
    panel.addEventListener('animationend', () => panel.classList.remove('is-escalated'), { once: true });
  }
  recoveryState = state;
  recovery.dataset.state = String(state);
  recoveryChips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === state)));
  recoveryText.textContent = RECOVERY_COPY[state];
  scene?.setRecovery(state);
};

const update = () => {
  ticking = false;
  const max = Math.max(1, root.scrollHeight - innerHeight);
  progress?.style.setProperty('--p', (scrollY / max).toFixed(4));
  root.classList.toggle('is-scrolled', scrollY > 24);

  let active = null;
  for (const chapter of chapters) if (chapter.getBoundingClientRect().top < innerHeight * 0.55) active = chapter;
  links.forEach((link, id) => (id === active?.id ? link.setAttribute('aria-current', 'step') : link.removeAttribute('aria-current')));
  scrub();

  if (recovery && pinnedState === null) {
    const rect = recovery.getBoundingClientRect();
    const local = clamp((innerHeight * 0.5 - rect.top) / rect.height);
    setRecovery(local < 0.38 ? 0 : local < 0.58 ? 1 : 2);
  }
};
// ---- 巨型序号字重 + 解密标题：都以章节内滚动进度为相位，只在数值变化时写 DOM ----
const numerals = chapters.map((chapter) => [chapter, chapter.querySelector('.numeral')]).filter(([, n]) => n);
const NOISE = '#%&@$*+=/\\|<>01門禁出口隔離検査░▒▓';
const decrypts = [...document.querySelectorAll('[data-decrypt]')].map((el) => {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ''));
  const nodes = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => {
    const span = document.createElement('span'); span.setAttribute('aria-hidden', 'true');
    span.textContent = n.textContent; n.replaceWith(span); return [span, [...n.textContent]];
  });
  return { el, chapter: el.closest('[data-chapter]'), nodes, total: nodes.reduce((sum, [, chars]) => sum + chars.length, 0), key: '' };
});
const hash = (i, j) => Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
const scrub = () => {
  for (const [chapter, numeral] of reduced ? [] : numerals) {
    const rect = chapter.getBoundingClientRect();
    const w = Math.round(100 + 800 * clamp(-rect.top / Math.max(1, rect.height - innerHeight)));
    if (numeral.dataset.w !== String(w)) { numeral.dataset.w = String(w); numeral.style.setProperty('--w', w); }
  }
  for (const d of decrypts) {
    const rect = d.chapter.getBoundingClientRect();
    // 相位从章节进入视口起算：顶边到达视口顶部时已解出约八成，再滚 0.3 屏完全解出
    const p = reduced ? 1 : clamp((innerHeight - rect.top) / (innerHeight * 1.3));
    const resolved = Math.floor(p * d.total), frame = Math.floor(p * 40), key = `${resolved}:${frame}`;
    if (key === d.key) continue;
    d.key = key; let index = 0;
    for (const [span, chars] of d.nodes) {
      span.textContent = chars.map((ch) => {
        const i = index++;
        return i < resolved || /[\s，。、,.]/.test(ch) ? ch : NOISE[Math.floor(hash(i, frame) * NOISE.length)];
      }).join('');
    }
  }
};

const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
update();

// 手动选择的状态优先于滚动；离开章节后交还给滚动
recoveryChips.forEach((chip, i) => chip.addEventListener('click', () => { pinnedState = i; setRecovery(i); }));
if (recovery) new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) { pinnedState = null; schedule(); } }).observe(recovery);

// ============================================================================
//  工作台画廊：选中指示条是同一个几何体在标签间滑动（而非一个消失一个出现）；
//  方向键在标签间移动，符合 ARIA tabs 约定。
// ============================================================================
for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const tabs = [...gallery.querySelectorAll('[role=tab]')];
  const indicator = gallery.querySelector('.views-indicator');
  const place = (tab) => {
    indicator.style.setProperty('--ix', `${tab.offsetLeft}px`);
    indicator.style.setProperty('--iw', `${tab.offsetWidth}px`);
  };
  const select = (tab, focus = false) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on)); other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
    place(tab); if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
    });
  });
  // 首次定位不播动画；字体加载或尺寸变化后重新对齐
  indicator.classList.add('is-static'); place(tabs[0]);
  requestAnimationFrame(() => indicator.classList.remove('is-static'));
  const realign = () => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  document.fonts?.ready.then(realign); addEventListener('resize', realign);
}

// ============================================================================
//  指针细节：截图倾斜与面板聚光。只改变换与填充，不改尺寸；离开后以弹簧落定。
// ============================================================================
if (fine && !reduced) {
  for (const el of document.querySelectorAll('[data-tilt]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
}
for (const el of document.querySelectorAll('[data-spot]')) {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - r.left}px`); el.style.setProperty('--sy', `${e.clientY - r.top}px`);
  });
}
