/**
 * [INPUT]: 依赖 three 的 Mesh/ShaderMaterial/LineSegments/Group；./home-tokens.mjs 的 PALETTE 与 GROUND；
 *          调用方传入的纸带几何 c（home-ribbon 的 curve：toCam、camF、world、pitch）。
 * [OUTPUT]: 对外提供 createGround(c) → {object, move(distance), column(big)} 程序化地面网格（细格 / 粗格 / 对角线 + 沿粗格纵线跑的光脉冲；粗格 = 纸面一栏），
 *           createCubes() → {object, place(view, c, half)} 纸带两侧地面上翻滚的小方块。
 * [POS]: 首页 3D 的地面：纸带近端平铺、舞台素材站立的那片地。写法照参考稿的 grid 着色器与 cubes 层（参数同名、代码原创）；
 *        参考稿的脉冲与翻滚按时钟循环，这里改由滚动距离推动——停下即静止，守住"落定零帧"。素材本身由 props/ 提供，摆放归 home-scene。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { PALETTE, GROUND } from './home-tokens.mjs';

const ivory = new THREE.Color(PALETTE.ivory);

// ============================================================================
//  地面：一整块平面，网格在片元里按世界坐标算（与参考稿同一套"线覆盖率"写法，抗锯齿靠 fwidth）。
//  粗格 = 细格 × every；对角线穿过粗格交点；一部分粗格纵线上跑着亮头拖尾的脉冲，方向朝远处
// ============================================================================
const vertex = /* glsl */`
attribute vec2 aGround;
varying vec2 vGround;
varying float vDepth;
void main() {
  vGround = aGround;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}`;
const fragment = /* glsl */`
uniform vec3 uColor; uniform float uCell, uEvery, uShift, uRun, uFade0, uFade1;
uniform float uMinor, uMajor, uDiagonal, uAmount, uLength, uBright;
varying vec2 vGround;
varying float vDepth;
float lines(float c, float s, float w) {
  float fw = max(fwidth(c), 1e-4);
  float d = abs(fract(c / s + 0.5) - 0.5) * s;
  float cover = 1.0 - smoothstep((w * 0.5 - 0.5) * fw, (w * 0.5 + 0.5) * fw, d);
  return cover * min(w, 1.0) * smoothstep(3.0, 9.0, s / fw);
}
float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  vec2 p = vec2(vGround.x, vGround.y + uShift);
  float big = uCell * uEvery;
  float grid = max(lines(p.x, uCell, 1.0), lines(p.y, uCell, 1.0)) * uMinor
             + max(lines(p.x, big, 1.0), lines(p.y, big, 1.0)) * uMajor
             + max(lines(p.x + p.y, big * 2.0, 1.0), lines(p.x - p.y, big * 2.0, 1.0)) * uDiagonal;
  float id = floor(p.x / big + 0.5) + 100.0;
  float on = step(1.0 - uAmount, hash(id * 3.0 + 1.0));
  float period = big * 12.0;
  float run = uRun * (hash(id * 5.0 + 3.0) * 0.8 + 0.6) + hash(id) * period - p.y;
  float behind = run - period * floor(run / period);
  float pulse = on * exp(-behind / uLength) * (lines(p.x, big, 1.6) + lines(p.x, big, 7.0) * 0.25) * uBright;
  float fog = 1.0 - smoothstep(uFade0, uFade1, vDepth);
  gl_FragColor = vec4(uColor, clamp(grid + pulse, 0.0, 1.0) * fog);
}`;

export function createGround(c) {
  const H = c.vh, cell = (c.vw * c.m) / (GROUND.columns * GROUND.every), near = c.camF - H * 0.3, far = -H * 9, span = H * 6;
  // 地面是刚体变换下的一块平面：四个角换到镜头坐标即可，网格坐标作为属性带过去
  const corners = [[-span, near], [span, near], [-span, far], [span, far]];
  const pos = [], uv = [];
  for (const [x, f] of corners) { const [u, depth] = c.toCam(0, f); pos.push(x, u, -depth); uv.push(x, f); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aGround', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 1, 3, 2]);   // 逆时针朝向镜头
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const uniforms = {
    uColor: { value: ivory }, uCell: { value: cell }, uEvery: { value: GROUND.every }, uShift: { value: 0 }, uRun: { value: 0 },
    uFade0: { value: H * 2.5 }, uFade1: { value: H * 8 },
    uMinor: { value: GROUND.minor }, uMajor: { value: GROUND.major }, uDiagonal: { value: GROUND.diagonal },
    uAmount: { value: GROUND.pulse.amount }, uLength: { value: GROUND.pulse.length * c.m }, uBright: { value: GROUND.pulse.bright },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });   // 纸带近端就躺在地面上：地面往后让，免得两者抢深度
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  /** distance：版面滚动距离 × m（世界单位）。网格随之后退，脉冲以 GROUND.pulse.run 倍速朝远处跑。 */
  const move = (distance) => { uniforms.uShift.value = -distance; uniforms.uRun.value = distance * GROUND.pulse.run; };
  /** big：一栏宽（世界单位）。纸面版式是四栏，地面粗格就取一栏，于是纸上的栏线一出纸边就接上地面的纵线。 */
  const column = (big) => { uniforms.uCell.value = big / GROUND.every; };
  return { object: mesh, move, column };
}

// ============================================================================
//  翻滚的小方块：纸带两侧的地面上每隔一段有一小片 cols × rows 的格子，格子里一只方块绕着底边翻到相邻格。
//  参考稿按时钟翻、停一停再翻；这里一步对应一段滚动距离，每步前半段静止、后半段翻滚，于是停下滚动它就停在格子里
// ============================================================================
const hash2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const ease = (t) => t * t * (3 - 2 * t);

function walk(seed, n, cols, rows) {
  let i = Math.floor(hash2(seed, 1) * cols), j = Math.floor(hash2(seed, 2) * rows), way = 0;
  for (let k = 0; k < n; k++) {
    way = Math.floor(hash2(seed, k + 3) * 4);
    for (let tries = 0; tries < 4; tries++) {
      const [di, dj] = STEPS[way], ni = i + di, nj = j + dj;
      if (ni >= 0 && nj >= 0 && ni < cols && nj < rows) break;
      way = (way + 1) % 4;
    }
    i += STEPS[way][0]; j += STEPS[way][1];
  }
  const next = Math.floor(hash2(seed, n + 3) * 4);
  let w = next;
  for (let tries = 0; tries < 4; tries++) {
    const [di, dj] = STEPS[w], ni = i + di, nj = j + dj;
    if (ni >= 0 && nj >= 0 && ni < cols && nj < rows) break;
    w = (w + 1) % 4;
  }
  return [i, j, w];
}

function patch(seed, cols, rows, line, box, edge) {
  const v = [];
  for (let i = 0; i <= cols; i++) v.push(i, 0, 0, i, 0, -rows);
  for (let j = 0; j <= rows; j++) v.push(0, 0, -j, cols, 0, -j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const floor = new THREE.LineSegments(g, line);
  const pivot = new THREE.Group(), cube = new THREE.Group();
  const solid = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), box);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edge);
  cube.add(solid, edges); pivot.add(cube);
  const group = new THREE.Group(); group.add(floor, pivot);
  return { group, pivot, cube, seed, cols, rows, step: -1 };
}

export function createCubes() {
  const line = new THREE.LineBasicMaterial({ color: PALETTE.ivory, transparent: true, opacity: GROUND.cubes.alpha, depthWrite: false });
  const edge = new THREE.LineBasicMaterial({ color: PALETTE.ivory, transparent: true, opacity: GROUND.cubes.edge, depthWrite: false });
  const box = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const root = new THREE.Group();
  const patches = Array.from({ length: GROUND.cubes.count }, (_, k) => patch(k * 7919 + 1, GROUND.cubes.cols, GROUND.cubes.rows, line, box, edge));
  patches.forEach((p) => root.add(p.group));

  /** 每片格子挂在文档的某一行旁边（左右交替），随那一行在纸带上远去；翻滚进度取滚动距离。 */
  const place = (view, c, half) => {
    const H = c.vh, big = half / 2, size = big / 5, apart = H * GROUND.cubes.apart;   // 方块边长 = 两个细格，格子吸附在地面细格上
    patches.forEach((p, k) => {
      const docY = view.sheet.top + apart * (k + 0.6), q = docY - view.scroll, side = k % 2 ? 1 : -1;
      p.group.visible = c.vw >= 720 && q > -H * 0.6 && q < c.qBottom + H * 0.4;
      if (!p.group.visible) return;
      const [, f] = c.world(q * c.m);
      const [u, depth] = c.toCam(0, f);
      const out = half + big * (0.2 + Math.round(hash2(p.seed, 9) * 6) / 10);
      const x = side > 0 ? out : -out - p.cols * size;
      p.group.position.set(x, u, -depth);
      p.group.rotation.set(-c.pitch, 0, 0);
      p.group.scale.setScalar(size);
      // 翻滚：第 n 步，前一半停在格子里，后一半绕着朝向那一侧的底边转 90°
      const t = view.scroll / GROUND.cubes.step + hash2(p.seed, 5) * 7, n = Math.max(0, Math.floor(t)), f2 = t - n;
      const [i, j, way] = walk(p.seed, n, p.cols, p.rows);
      const roll = ease(Math.max(0, (f2 - 0.5) * 2)), [di, dj] = STEPS[way];
      // 转轴在方块底面朝前进方向的那条边上：局部 x 右、z 朝镜头（行 j 往远处是 −z）
      p.pivot.position.set(i + 0.5 + di * 0.5, 0, -(j + 0.5) - dj * 0.5);
      p.cube.position.set(-di * 0.5, 0.5, dj * 0.5);
      p.pivot.rotation.set(-dj * roll * Math.PI / 2, 0, -di * roll * Math.PI / 2);
    });
  };
  return { object: root, place };
}
