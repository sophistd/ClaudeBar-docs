/**
 * [INPUT]: 依赖 three 的 WebGLRenderer/PerspectiveCamera/ShaderMaterial；./home-tokens.mjs 的 PALETTE/REALMS；
 *          ./home-ribbon.mjs 的 bend（与 DOM 纸片同一条纸带）；./home-kit.mjs 的 env（写回帧数遥测）；
 *          ./home-world.mjs 的 createGround 程序化地面（网格与光脉冲）与 createCubes 翻滚方块；./home-graph.mjs 的首屏关系图谱；./figures/stage.mjs 的舞台物件（与场景配图同一套物理材质）；
 *          three addons 的 RoomEnvironment（舞台物件的环境光，程序生成、不下载贴图）。
 * [OUTPUT]: 对外提供 mountScene(canvas) → {render(view), setRecovery(state), dispose()}。
 *           view = {scroll, c, sheet:{w, top, bottom}, stops:[{y0, y1, from, to}], anchors:[{id, y, p}], graph:{top, h, w}, focus, recovery}，
 *           由 home.mjs 每帧给出；视图没变就不画，所以落定之后零帧。
 * [POS]: 首页 3D 的渲染器：相机就是纸带模型里的俯视镜头（放在原点、看向 −z，视场与 CSS perspective 相同），
 *        只画三样东西——与 DOM 纸片同形的连续纸面（顶点每帧按 bend 重算，按越界段换色）、
 *        随滚动后退的地面网格、按章节的行站到纸带两侧的舞台物件（近景贴纸边、中景在两侧地面），
 *        每件物件的时间轴取本节进度 p（p = 1 是顷刻，道闸在这一刻放平）。物件单独一遍渲染：保留深度、sRGB 输出加 ACES 色调映射，
 *        纸面与地面那一遍仍按原色值直出；物件与离线配图同一套材质，环境光不同（RoomEnvironment 对摄影棚 HDRI），颜色近似一致。不写文案与 DOM。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { PALETTE, REALMS, RIBBON } from './home-tokens.mjs';
import { bend } from './home-ribbon.mjs';
import { env } from './home-kit.mjs';
import { createGround, createCubes } from './home-world.mjs';
import { createGraph } from './home-graph.mjs';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STAGE } from './figures/stage.mjs';
import { frame } from './home-kit.mjs';

// 颜色按 sRGB 原值进出：纸面渐变与 CSS linear-gradient 同一插值空间，两相颜色一致
THREE.ColorManagement.enabled = false;
const rgb = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const SHEET = Object.fromEntries(REALMS.map((realm) => [realm.id, rgb(realm.sheet)]));
const MAX_STOPS = 4, ROWS = 220;

const vertex = /* glsl */`
attribute float aDoc;
attribute float aLit;
varying float vDoc;
varying float vLit;
void main() { vDoc = aDoc; vLit = aLit; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fragment = /* glsl */`
uniform float uTop, uBottom; uniform vec3 uBase; uniform vec2 uSpan[${MAX_STOPS}]; uniform vec3 uTo[${MAX_STOPS}]; uniform int uCount;
varying float vDoc;
varying float vLit;
void main() {
  if (vDoc < uTop || vDoc > uBottom) discard;
  vec3 color = uBase;
  for (int i = 0; i < ${MAX_STOPS}; i++) {
    if (i >= uCount) break;
    color = mix(color, uTo[i], clamp((vDoc - uSpan[i].x) / max(1.0, uSpan[i].y - uSpan[i].x), 0.0, 1.0));
  }
  gl_FragColor = vec4(color * vLit, 1.0);
}`;

function sheetGeometry() {
  const index = [];
  for (let r = 0; r < ROWS; r++) { const a = r * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((ROWS + 1) * 6), 3));
  g.setAttribute('aDoc', new THREE.Float32BufferAttribute(new Float32Array((ROWS + 1) * 2), 1));
  g.setAttribute('aLit', new THREE.Float32BufferAttribute(new Float32Array((ROWS + 1) * 2), 1));
  g.setIndex(index);
  return g;
}

/** CSS 3D 落点 → 镜头坐标（相机在原点看 −z）：u = H/2 − Y，深度 g = P − Z。 */
const cam = (c, x, Y, Z) => [x, c.vh / 2 - Y, Z - c.P];

export function mountScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(PALETTE.ink, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(RIBBON.fov, 1, 1, 1e5);

  const uniforms = {
    uTop: { value: 0 }, uBottom: { value: 0 }, uBase: { value: SHEET.text }, uCount: { value: 0 },
    uSpan: { value: Array.from({ length: MAX_STOPS }, () => new THREE.Vector2()) },
    uTo: { value: Array.from({ length: MAX_STOPS }, () => new THREE.Vector3()) },
  };
  const geometry = sheetGeometry();
  const sheet = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, side: THREE.DoubleSide }));
  sheet.frustumCulled = false;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);   // 顶点每帧重算：给一个恒定包围球，渲染排序不再去算它
  scene.add(sheet);

  let ground = null;
  const cubes = createCubes(), graph = createGraph();
  scene.add(cubes.object, graph.object);
  // 舞台物件是物理材质，单独一层：环境光取 three 自带的 RoomEnvironment（不下载贴图），主光从左上前方来，与配图同向
  const props = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  props.environment = environment.texture; props.environmentIntensity = 0.9; room.dispose(); pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff6ec, 2.2); key.color.convertSRGBToLinear(); key.position.set(-0.6, 1, 0.5); props.add(key);   // 本页关了色彩管理：手动换成线性值，与离线配图的主光同色
  const stage = [];
  const build = (library) => Object.entries(library).forEach(([id, spec]) => {
    const made = spec.make();
    stage.push({ id, ...spec, made, p: -1 });
    props.add(made.group);
  });
  build(STAGE);
  // 图谱标签画在画布上：等 Geist Mono 到位再画，免得先用系统字体画一遍
  document.fonts.load('500 96px "Geist Mono"').finally(() => { graph.useFont('"Geist Mono", ui-monospace, monospace'); seen = ''; frame.wake(); });
  let seen = '', size = '';

  const resize = (c) => {
    const next = `${c.vw}x${c.vh}`;
    if (next === size) return;
    size = next;
    renderer.setSize(c.vw, c.vh, false);
    camera.aspect = c.vw / c.vh; camera.far = c.P * 40; camera.updateProjectionMatrix();
    if (ground) { scene.remove(ground.object); ground.object.geometry.dispose(); ground.object.material.dispose(); }
    ground = createGround(c); scene.add(ground.object);
  };

  return {
    render(view) {
      const { c, scroll, sheet: s } = view;
      const next = `${scroll.toFixed(1)}|${c.vw}|${c.vh}|${s.w}|${s.top}|${s.bottom}|${view.focus}|${view.recovery}|${view.anchors.map((a) => `${a.y.toFixed(0)}:${(a.p ?? 1).toFixed(3)}`).join()}`;
      if (next === seen) return;
      seen = next;
      resize(c);

      // ---- 纸面：从远端到屏幕底边外，逐行按同一条纸带落点重算顶点 ----
      const pos = geometry.getAttribute('position'), doc = geometry.getAttribute('aDoc'), lit = geometry.getAttribute('aLit');
      const q0 = -c.vh * 0.2, q1 = c.qBottom + c.vh * 0.1, half = (s.w / 2) * c.m;
      for (let r = 0; r <= ROWS; r++) {
        const q = q0 + ((q1 - q0) * r) / ROWS, [Y, Z, , , light] = bend(q, c);
        const [, u, z] = cam(c, 0, Y, Z);
        pos.setXYZ(r * 2, -half, u, z); pos.setXYZ(r * 2 + 1, half, u, z);
        doc.setX(r * 2, q + scroll); doc.setX(r * 2 + 1, q + scroll);
        lit.setX(r * 2, light); lit.setX(r * 2 + 1, light);
      }
      pos.needsUpdate = true; doc.needsUpdate = true; lit.needsUpdate = true;
      uniforms.uTop.value = s.top; uniforms.uBottom.value = s.bottom;
      uniforms.uBase.value = SHEET[view.stops[0]?.from ?? 'text'];
      uniforms.uCount.value = Math.min(MAX_STOPS, view.stops.length);
      view.stops.slice(0, MAX_STOPS).forEach((stop, i) => { uniforms.uSpan.value[i].set(stop.y0, stop.y1); uniforms.uTo.value[i].copy(SHEET[stop.to]); });

      // ---- 地面网格随滚动向远处退：纸带近端就躺在这片地面上 ----
      ground.move(scroll * c.m);
      ground.column(half / 2);
      cubes.place(view, c, half);
      graph.place(view, c);

      // ---- 舞台素材：按章节的行站到纸带旁。近景贴着纸边、中景是两侧的建筑、远景在地平线上空、纸面层贴着纸带外缘 ----
      const H = c.vh, anchor = new Map(view.anchors.map((a) => [a.id, a]));
      // 素材按旧章节造：观测的电缆缠斗归"流量绕路"，预检的巴别塔与红笔归"时区错位"（语言错位）
      for (const item of stage) {
        const a = anchor.get(item.chapter) ?? { y: scroll + H * 0.9, p: 1 };
        const q = item.chapter === 'any' ? H * 0.5 : a.y - scroll, far = item.layer === 'far';
        const g = item.made.group;
        g.visible = c.vw >= 720 && q > (far ? -H * 0.9 : -H * 0.3) && q < c.qBottom + (far ? H : H * 0.35);
        if (!g.visible) continue;
        const row = q * c.m, side = item.side || 1;
        if (item.layer === 'sheet') {
          // 纸面批注：顺着纸带此处的倾角，躺在纸带外缘
          const [Y, Z, tilt] = bend(q, c), [x, u, z] = cam(c, side * (half + H * 0.04) + (side > 0 ? 0 : -H * 0.5), Y, Z);
          g.position.set(x, u, z); g.rotation.set(-tilt, 0, 0); g.scale.setScalar(H * 0.32);
        } else {
          const PLACE = { near: [H * 0.16, 0.1, H * 0.26], mid: [H * 0.7, -0.25, H * 0.62], far: [H * 1.7, -3.2, H * 1.1] }[item.layer];
          const [, f] = c.world(row + PLACE[1] * H);
          const [u, depth] = c.toCam(far ? H * (0.9 + (stage.indexOf(item) % 3) * 0.22) : 0, f);
          const x = item.side === 0 ? 0 : side * (half + PLACE[0]);
          g.position.set(x, u, -depth);
          // 先绕世界竖轴转出轴测角，再整体俯仰到镜头坐标（世界的"上"在镜头里朝观者倾 30°）
          g.rotation.set(-c.pitch, item.layer === 'near' ? side * -0.35 : side * -0.62, 0, 'XYZ');
          g.scale.setScalar(PLACE[2]);
        }
        const p = item.chapter === 'any' ? 1 : a.p ?? 1;
        if (Math.abs(p - item.p) > 1e-3) { item.p = p; item.made.scrub?.(p); }
        item.made.focus?.(view.focus);
        item.made.set?.(view.recovery);
      }

      renderer.render(scene, camera);
      // 第二遍画物理材质的舞台物件：保留第一遍的深度，纸带照常遮挡；只有这一遍做 sRGB 输出与色调映射
      renderer.autoClear = false; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.render(props, camera);
      renderer.autoClear = true; renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
      env.set({ frames: env.get('frames') + 1 });
    },
    setRecovery() { seen = ''; },
    dispose() { environment.dispose(); renderer.dispose(); },
  };
}
