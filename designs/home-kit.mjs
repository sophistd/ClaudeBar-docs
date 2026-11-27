/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 ENV_DEFAULTS 与 rate()。
 * [OUTPUT]: 对外提供 reduced、clamp、env（环境键值与订阅）、frame（全页唯一的事件唤醒帧调度器）、
 *           spring（三档临界阻尼跟随器，可换档、可设落定阈值）。
 * [POS]: 首页四层柔性编码的第二层（Kit）：可感知的物理原语。怎么动由这里统一决定；整页只有这里允许调用 requestAnimationFrame。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ENV_DEFAULTS, rate } from './home-tokens.mjs';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ============================================================================
//  环境：一张键值表加订阅。值没变就不通知，所以微件只在数据真的变化时写 DOM
// ============================================================================
const state = { ...ENV_DEFAULTS };
const listeners = new Map();
export const env = {
  get: (key) => state[key],
  set(patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (Object.is(state[key], value)) continue;
      state[key] = value;
      listeners.get(key)?.forEach((fn) => fn(value));
    }
  },
  /** 订阅一个键；默认立刻用当前值回调一次，让视图首帧就是对的。 */
  on(key, fn, { immediate = true } = {}) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    if (immediate) fn(state[key]);
    return () => listeners.get(key).delete(fn);
  },
};

// ============================================================================
//  帧调度器：事件（滚动/指针/状态跃迁）调用 wake()，每个 ticker 返回"我还在动吗"。
//  全部落定后循环自行停止，窗口不再产生任何一帧——没有时钟，只有事件
// ============================================================================
const tickers = new Set();
let running = false, last = 0;
const loop = (now) => {
  // 上限 0.25s：指数跟随对任意步长都稳定；慢设备上按真实耗时推进，落定所需的墙上时间不被拉长
  const dt = last ? Math.min((now - last) / 1000, 0.25) : 1 / 60; last = now;
  let moving = false;
  for (const tick of tickers) moving = tick(dt, now) || moving;
  if (moving) requestAnimationFrame(loop);
  else { running = false; last = 0; }
  env.set({ moving });
};
export const frame = {
  add(tick) { tickers.add(tick); return () => tickers.delete(tick); },
  wake() { if (!running) { running = true; requestAnimationFrame(loop); } },
};

/** 临界阻尼跟随器：只取 snap / glide / settle 三档，无过冲；减弱动态时一步到位。 */
export function spring(value = 0, tier = 'settle', epsilon = 1e-4) {
  let k = reduced ? 1e3 : rate(tier);
  const self = {
    value, target: value,
    /** 换档：同一个跟随器在不同场合用不同的弹簧（三档之一，或滚轮跟手这类按每秒速率给定的跟随）。 */
    tune(next) { k = reduced ? 1e3 : typeof next === 'number' ? next : rate(next); return self; },
    step(dt) {
      self.value += (self.target - self.value) * (1 - Math.exp(-k * dt));
      if (Math.abs(self.target - self.value) > epsilon) return true;
      self.value = self.target; return false;
    },
  };
  return self;
}
