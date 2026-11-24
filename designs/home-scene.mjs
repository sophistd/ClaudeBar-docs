/**
 * [INPUT]: 依赖 three 的 WebGLRenderer/EffectComposer/UnrealBloomPass/RoomEnvironment，
 *          依赖 ./home-world.mjs 的 PALETTE/WORLD 与全部场景构件、./home-fx.mjs 的 X 光检查后期；
 *          读取页面上带 data-scene 的章节锚点。
 * [OUTPUT]: 对外提供 mountScene(canvas, {reduced}) → {setRecovery(state), dispose()}。
 *           渲染完全由事件唤醒（滚动/指针/尺寸/状态跃迁），临界阻尼落定后停止出帧；无时钟驱动的动画。
 * [POS]: designs 首页的 3D 调度器：滚动位置 → 镜头轨道（含每章检查模式）→ 每帧动画 → 泛光 → X 光合成；不写任何文案与 DOM 文本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createInspection } from './home-fx.mjs';
import {
  PALETTE, WORLD, ceramic, createPortal, createOrb, createStream, createDust,
  createTunnel, createSessions, createConstellation, createSheets,
} from './home-world.mjs';

// ============================================================================
//  镜头机位：每个 data-scene 章节对应一个"停驻"位置。章节之间按 Catmull-Rom 曲线飞行，
//  到达锚点时速度归零，读者在文字停留处看到稳定的构图。
// ============================================================================
const v = (x, y, z) => new THREE.Vector3(x, y, z);
// fx：该章节的"检查模式"。sweep = X 光扫描线的屏幕高度（以下被 1-bit 抖动），ascii = 字符化程度。
const POSES = {
  hero:      { at: v(0, 0, 7.6),                     look: v(0, 0, 0),                       fx: { sweep: 0, ascii: 0 } },
  gate:      { at: v(0.4, -0.2, -10),                look: v(0, 0, -34),                     fx: { sweep: 0.56, ascii: 0 } },
  sessions:  { at: v(1.1, 3.2, -66),                 look: v(0, -0.4, -98),                  fx: { sweep: 0, ascii: 0 } },
  observe:   { at: v(8.2, 2.4, WORLD.graphZ + 9),    look: v(0, 0, WORLD.graphZ),            fx: { sweep: 0, ascii: 1 } },
  recovery:  { at: v(0, 0.5, WORLD.recoveryZ + 11),  look: v(0, 0, WORLD.recoveryZ),         fx: { sweep: 0, ascii: 0 } },
  preflight: { at: v(-1.2, 0.6, WORLD.sheetsZ + 7),  look: v(0.6, 0, WORLD.sheetsZ - 2),     fx: { sweep: 1, ascii: 0 } },
  product:   { at: v(0, 0, WORLD.finaleZ + 31),      look: v(0, 0, WORLD.finaleZ),           fx: { sweep: 0, ascii: 0 } },
  finale:    { at: v(0, 0, WORLD.finaleZ + 23),      look: v(0, 0, WORLD.finaleZ),           fx: { sweep: 0, ascii: 0 } },
};

// 恢复章节的三个状态：开口程度、粒子随滚动的流速、粒子在门前的堆积、锚点颜色（序号即严重度）
const RECOVERY = [
  { open: 1, speed: 1, stop: 0, color: PALETTE.terracotta, intensity: 2.6, spill: 1 },
  { open: 1, speed: 0.06, stop: 0, color: PALETTE.amber, intensity: 2.2, spill: 0.8 },
  { open: 0, speed: 1, stop: 1, color: PALETTE.acid, intensity: 0.85, spill: 0.1 },   // 酸性绿只属于"隔离"，且只点亮锚点
];

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const damp = (current, target, rate, dt) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));

export function mountScene(canvas, { reduced = false } = {}) {
  // ---- 渲染器与后期：ACES 色调映射 + 阈值泛光，只让自发光部分溢光 ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.ink);
  scene.fog = new THREE.FogExp2(PALETTE.ink, 0.034);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.32;
  room.dispose(); pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 200);
  const key = new THREE.DirectionalLight(0xfff1e6, 1.6); key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(PALETTE.terracotta, 2.2); rim.position.set(4, -2, -6);
  scene.add(new THREE.HemisphereLight(0x2a2f3a, 0x0a0806, 0.6), key, rim, camera);
  camera.add(new THREE.PointLight(0xfff1e6, 0.35, 14, 1.6));   // 随镜头的补光，让近处门框保持可读

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const inspection = createInspection({ ink: PALETTE.ink, paper: PALETTE.ivory, onRedraw: () => wake() });
  composer.addPass(inspection.pass);

  // ---- 世界：主门、隧道、分流航道、超图、恢复门、纸页、终点大门、连接流与星尘 ----
  const hero = createPortal({ size: 3.4, material: ceramic() });
  const heroOrb = createOrb({ radius: hero.dotRadius, glow: 8 });
  heroOrb.group.position.copy(hero.dot); hero.group.add(heroOrb.group);
  scene.add(hero.group, createTunnel());
  const sessions = createSessions(); scene.add(sessions.group);
  const graph = createConstellation(); scene.add(graph.group);
  const sheets = createSheets(); scene.add(sheets.group);

  const recovery = createPortal({ size: 4.6, material: ceramic() }); recovery.own();
  recovery.group.position.z = WORLD.recoveryZ; scene.add(recovery.group);
  const recoveryOrb = createOrb({ radius: recovery.dotRadius, glow: 9 });
  recoveryOrb.group.position.copy(recovery.dot); recovery.group.add(recoveryOrb.group);

  const finale = createPortal({ size: 9, material: ceramic() });
  finale.group.position.z = WORLD.finaleZ; scene.add(finale.group);
  const finaleOrb = createOrb({ radius: finale.dotRadius, glow: 14 });
  finaleOrb.group.position.copy(finale.dot); finale.group.add(finaleOrb.group);

  const streams = [
    createStream({ count: 1400, start: v(0, 0, 14), length: 78, radius: 1.15, colorA: PALETTE.terracotta, colorB: PALETTE.ivory }),
    createStream({ count: 700, start: v(-WORLD.laneX, 0, WORLD.splitZ), length: 44, radius: 0.7, colorA: PALETTE.terracotta, colorB: PALETTE.ember }),
    createStream({ count: 700, start: v(WORLD.laneX, 0, WORLD.splitZ), length: 44, radius: 0.7, colorA: PALETTE.cool, colorB: PALETTE.ivory }),
  ];
  const recoveryStream = createStream({ count: 900, start: v(0, 0, WORLD.recoveryZ + 20), length: 34, radius: 1.05, colorA: PALETTE.terracotta, colorB: PALETTE.ivory });
  recoveryStream.uniforms.uStop.value = WORLD.recoveryZ + 0.35;
  const finaleStream = createStream({ count: 900, start: v(0, 0, WORLD.finaleZ + 30), length: 34, radius: 2.4, colorA: PALETTE.ember, colorB: PALETTE.ivory, size: 0.8 });
  const dust = createDust({ count: reduced ? 2400 : 5200 });
  const allStreams = [...streams, recoveryStream, finaleStream];
  scene.add(dust.points, ...allStreams.map((s) => s.points));

  // ---- 镜头轨道：位置与注视点各一条曲线，锚点由 DOM 章节测量 ----
  // data-hold 章节（恢复三态）有进入与离开两个停驻点，镜头在整段滚动中保持构图
  const keys = [...document.querySelectorAll('[data-scene]')].filter((el) => POSES[el.dataset.scene])
    .flatMap((el) => {
      const pose = POSES[el.dataset.scene];
      if (!('hold' in el.dataset)) return [{ el, at: pose.at, look: pose.look, fx: pose.fx, edge: 'center' }];
      const near = pose.at.clone().lerp(pose.look, 0.1);
      return [{ el, at: pose.at, look: pose.look, fx: pose.fx, edge: 'enter' }, { el, at: near, look: pose.look, fx: pose.fx, edge: 'leave' }];
    });
  const path = new THREE.CatmullRomCurve3(keys.map((k) => k.at), false, 'centripetal');
  const gaze = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  let stops = [], lastStops = '';
  const measure = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const vh = innerHeight;
    stops = keys.map(({ el, edge }, i) => {
      if (i === 0) return 0;
      const y = edge === 'enter' ? el.offsetTop + vh * 0.1
        : edge === 'leave' ? el.offsetTop + el.offsetHeight - vh * 1.1
        : el.offsetTop + el.offsetHeight / 2 - vh / 2;
      return Math.min(max, y);
    });
    for (let i = 1; i < stops.length; i++) stops[i] = Math.max(stops[i], stops[i - 1] + 1);
    const key = stops.join(',');
    const changed = key !== lastStops; lastStops = key;
    return changed;
  };
  const scrollToRail = (y) => {
    if (y <= stops[0]) return 0;
    for (let i = 1; i < stops.length; i++) {
      if (y <= stops[i]) return (i - 1 + smoother((y - stops[i - 1]) / (stops[i] - stops[i - 1]))) / (stops.length - 1);
    }
    return 1;
  };

  // 竖屏时文字面板贴底：把整条轨道下移，让每章主体落在画面上半部
  let portraitLift = 0;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); inspection.setResolution(w, h, pixelRatio);
    camera.aspect = w / h;
    camera.fov = w < 720 ? 64 : 52;               // 竖屏加宽视角，门框仍完整入画
    // 首屏构图：宽屏把门框让到右侧给标题留白，竖屏把门框抬到标题上方
    const wide = camera.aspect > 1.15;
    POSES.hero.at.set(wide ? -2.2 : 0, wide ? 0 : -2.5, wide ? 7.6 : 10.6);
    POSES.hero.look.set(wide ? -2.2 : 0, wide ? 0 : -2.5, 0);
    portraitLift = camera.aspect < 0.9 ? 1.5 : 0;
    camera.updateProjectionMatrix();
    allStreams.concat(dust).forEach((s) => { s.uniforms.uPixel.value = pixelRatio * (h / 900); });
    measure();
  };
  resize();
  addEventListener('resize', resize);
  // 只有锚点真的移动才唤醒；无关的版面变化（图片解码、审计注入的节点）不产生帧
  const ro = new ResizeObserver(() => { if (measure()) wake(); }); ro.observe(document.body);

  // ============================================================================
  //  事件驱动渲染：滚动、指针、尺寸与状态跃迁唤醒循环；一切落定后不再产生任何一帧。
  //  粒子流、超图脉冲、纸页扫描都以"滚动距离"为相位——只在穿越时流动，不由时钟驱动。
  // ============================================================================
  const SETTLE = reduced ? 40 : 8.5;          // 临界阻尼速率：≈0.48s 落定，无过冲
  const EPS = 1e-4;
  const pointer = new THREE.Vector2(), aim = new THREE.Vector2();
  const phaseOf = () => scrollY / Math.max(1, innerHeight);    // 以屏为单位的滚动相位
  let rail = scrollToRail(scrollY), phase = phaseOf(), lastPhase = phase;
  let recoveryTravel = 0, frame = 0, running = false, last = 0;

  let recoveryTarget = RECOVERY[0], recoveryIndex = 0, pulseFrom = -1;
  const live = { open: 1, speed: 1, stop: 0, spill: 1 };
  const tint = new THREE.Color(PALETTE.terracotta), tintTarget = new THREE.Color();

  // ---- 自适应画质：持续掉帧先降分辨率，再关泛光 ----
  let slowFrames = 0, degraded = 0;
  const adapt = (dt) => {
    slowFrames = dt > 1 / 40 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 90 || degraded > 1) return;
    slowFrames = 0; degraded++;
    if (degraded === 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); } else bloom.enabled = false;
  };

  const look = new THREE.Vector3();
  const step = (now) => {
    // 按真实耗时阻尼（上限 0.25s）：慢机器每帧跨度大、k 也大，落定始终约 0.5 秒而不是固定帧数
    const dt = last ? Math.min((now - last) / 1000, 0.25) : 1 / 60; last = now;
    adapt(dt);
    const k = 1 - Math.exp(-SETTLE * dt);
    const railTarget = scrollToRail(scrollY), phaseTarget = phaseOf();
    rail += (railTarget - rail) * k;
    phase += (phaseTarget - phase) * k;
    aim.x += (pointer.x - aim.x) * k; aim.y += (pointer.y - aim.y) * k;

    path.getPoint(rail, camera.position); gaze.getPoint(rail, look);
    const lift = portraitLift * THREE.MathUtils.clamp(rail * (keys.length - 1), 0, 1);
    camera.position.y -= lift; look.y -= lift;
    camera.position.x += aim.x * 0.6; camera.position.y -= aim.y * 0.4;
    camera.lookAt(look);
    camera.rotation.z += Math.sin(rail * Math.PI * 6) * 0.04;   // 穿越时的轻微滚转，随轨道而非时间
    hero.group.rotation.y = aim.x * 0.5; hero.group.rotation.x = aim.y * 0.3;

    // ---- 滚动相位驱动的流动 ----
    const travel = phase * 9;
    for (const s of streams) s.uniforms.uTravel.value = travel;
    finaleStream.uniforms.uTravel.value = travel * 0.7;
    recoveryTravel += (phase - lastPhase) * 9 * live.speed; lastPhase = phase;
    recoveryStream.uniforms.uTravel.value = recoveryTravel;
    graph.tick(phase * 1.6); sheets.tick(phase * 2.2);
    sessions.wall.material.uniforms.uTime.value = phase * 2;

    // ---- 数据跃迁：恢复三态以同一阻尼落定；升级时一次性 480ms 亮度脉冲 ----
    live.open += (recoveryTarget.open - live.open) * k;
    live.speed += (recoveryTarget.speed - live.speed) * k;
    live.stop += (recoveryTarget.stop - live.stop) * k;
    recovery.setOpen(live.open);
    recoveryStream.uniforms.uStopMix.value = live.stop;
    tint.lerp(tintTarget.set(recoveryTarget.color), k);
    const pulseT = pulseFrom < 0 ? 1 : (now - pulseFrom) / 480;
    const pulse = pulseT < 1 ? Math.sin(Math.PI * pulseT) * 2.4 : 0;
    if (pulseT >= 1) pulseFrom = -1;
    live.spill += (recoveryTarget.spill - live.spill) * k;
    recoveryOrb.setColor(tint, recoveryTarget.intensity + pulse, live.spill);

    // ---- 检查模式：随轨道在相邻章节之间插值；镜头追赶滚动的距离就是色散强度，落定即归零 ----
    const at = rail * (keys.length - 1), i = Math.min(Math.floor(at), keys.length - 2), t = at - i;
    const a = keys[i].fx, b = keys[i + 1].fx;
    inspection.apply({
      // 竖屏面板贴底：扫描线整体抬高（0→0、1→1 保持连续），被检查区落在面板上方
      sweep: Math.min(1, (a.sweep + (b.sweep - a.sweep) * t) * (portraitLift ? 1.45 : 1)),
      ascii: a.ascii + (b.ascii - a.ascii) * t,
      aberration: reduced ? 0 : Math.min(Math.abs(railTarget - rail) * 0.35, 0.012),
    });

    composer.render(dt);

    const moving = Math.abs(railTarget - rail) > EPS || Math.abs(phaseTarget - phase) > EPS
      || Math.abs(pointer.x - aim.x) > EPS || Math.abs(pointer.y - aim.y) > EPS
      || Math.abs(recoveryTarget.open - live.open) > 1e-3 || Math.abs(recoveryTarget.stop - live.stop) > 1e-3
      || Math.abs(recoveryTarget.speed - live.speed) > 1e-3 || pulseFrom >= 0;
    if (moving) frame = requestAnimationFrame(step);
    else { running = false; last = 0; }
  };
  const wake = () => { if (!running) { running = true; frame = requestAnimationFrame(step); } };

  const onPointer = (e) => { pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); wake(); };
  const onResize = () => { resize(); wake(); };
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('scroll', wake, { passive: true });
  removeEventListener('resize', resize); addEventListener('resize', onResize);
  wake();

  return {
    setRecovery(state) {
      const next = RECOVERY[state] ? state : 0;
      if (next > recoveryIndex && !reduced) pulseFrom = performance.now();   // 只在升级时脉冲，降级静默
      recoveryIndex = next; recoveryTarget = RECOVERY[next];
      wake();
    },
    dispose() {
      cancelAnimationFrame(frame); ro.disconnect();
      removeEventListener('resize', onResize); removeEventListener('pointermove', onPointer); removeEventListener('scroll', wake);
      composer.dispose(); renderer.dispose();
    },
  };
}
