/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 REALMS（每一界的风声频段、和弦与震动型）、./home-kit.mjs 的 env 与 reduced；
 *          浏览器的 WebAudio 与 Vibration API（后者 iOS Safari 不提供，缺失时静默跳过）。
 * [OUTPUT]: 对外提供 sense：enable(on) 开关、tick() 轻点、cross(realmId) 越界、state(level) 状态升级。
 * [POS]: 首页的听觉与触觉相。全部声音现场合成，不带任何音频文件；默认关闭，必须由用户手势开启。
 *        与画面同一条规矩：只由事件触发——风声的音量就是滚动速度，停下即无声。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { REALMS, MOTION } from './home-tokens.mjs';
import { env, reduced } from './home-kit.mjs';

let ctx = null, master = null, windGain = null, windFilter = null;
const realm = (id) => REALMS.find((r) => r.id === id) ?? REALMS[0];
const live = () => ctx && env.get('sense');

// ============================================================================
//  声场：褐噪声经带通成为"穿行的风"，音量跟随滚动速度；其余都是一次性的短音
// ============================================================================
function boot() {
  ctx = new AudioContext();
  const limiter = ctx.createDynamicsCompressor();
  master = ctx.createGain(); master.gain.value = 0.55;
  master.connect(limiter).connect(ctx.destination);

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0, lastOut = 0; i < data.length; i++) {      // 褐噪声：白噪声的积分，低频更厚
    lastOut = (lastOut + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = lastOut * 3.5;
  }
  const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
  windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.Q.value = 0.9;
  windGain = ctx.createGain(); windGain.gain.value = 0;
  noise.connect(windFilter).connect(windGain).connect(master); noise.start();

  env.on('velocity', (v) => windGain.gain.setTargetAtTime(Math.min(v * 0.1, 0.22), ctx.currentTime, 0.06));
  env.on('realm', (id) => windFilter.frequency.setTargetAtTime(realm(id).wind, ctx.currentTime, MOTION.settle / 4));
}

/** 一个带包络的短音：起音 8ms，按 duration 指数衰减到无声。 */
function note(frequency, { duration = 0.12, gain = 0.1, type = 'sine', delay = 0, glideTo = 0 } = {}) {
  const at = ctx.currentTime + delay, osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(frequency, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + duration);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(master); osc.start(at); osc.stop(at + duration + 0.02);
}
const buzz = (pattern) => { if (!reduced) navigator.vibrate?.(pattern); };

export const sense = {
  /** 开关必须来自用户手势：浏览器只在手势里允许出声。 */
  enable(on) {
    if (on && !ctx) boot();
    if (ctx) (on ? ctx.resume() : ctx.suspend());
    env.set({ sense: on });
    if (on) { note(880, { duration: 0.09, gain: 0.07 }); buzz(8); }
  },
  /** 轻点：章节切换、联动命中。对应 snap 档。 */
  tick() { if (!live()) return; note(1320, { duration: 0.05, gain: 0.045 }); buzz(5); },
  /** 越界：该界的三音和弦依次亮起，在 settle 档内收尽。 */
  cross(id) {
    if (!live()) return;
    const { chord, haptic } = realm(id);
    chord.forEach((f, i) => note(f, { duration: MOTION.settle, gain: 0.07, delay: i * 0.05, type: id === 'code' ? 'triangle' : 'sine' }));
    buzz(haptic);
  },
  /** 恢复三态升级：等待是一声提示，隔离是一记下坠的闷响。降级不出声。 */
  state(level) {
    if (!live()) return;
    if (level === 1) { note(520, { duration: 0.18, gain: 0.07 }); buzz(12); }
    if (level === 2) { note(180, { duration: MOTION.settle, gain: 0.16, glideTo: 62 }); buzz([24, 40, 48]); }
  },
};
