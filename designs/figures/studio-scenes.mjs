/**
 * [INPUT]: 依赖 three 与 addons 的 HDRLoader；./studio-kit.mjs 的 materials/kit；../home-tokens.mjs 的 REALMS/SCENE_REALM（每张图落在哪一界的纸上、mark 漆取哪一色）。
 * [OUTPUT]: 对外提供 FIGURE_SCENES 五张场景的标签与组合，以及 renderFigure(id, canvas, { hdr, width, height }) → Promise：在 canvas 上渲一帧透明底的 PBR 图。
 * [POS]: 场景图的 View 层（三维版）：每张只摆出痛点的顷刻——网络一抖出口跳国、四条旁路被拦、断网后的宽限期、一个窗口三个号共用一套指纹、两地的钟对不上。
 *        光环境 = Poly Haven 的 CC0 摄影棚 HDRI（反射与环境光）+ 一盏左上前方的主光（软阴影落向右后，与共享 UI Kit 的投影方向一致）；
 *        背景透明，只留接触阴影，所以同一张图能放在任何一界的纸上。只由 render.mjs 离线调用，不进首页运行包。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { REALMS, SCENE_REALM } from '../home-tokens.mjs';
import { materials, kit } from './studio-kit.mjs';

const TOP = 2.1;   // 国土片的上表面
const MARK = { text: 0xffb21e, code: 0xff7a45, token: 0xd2410f };   // 立体物件放在米白釉面上，比纸面上的 --mark 再浓一档，才压得住白

const at = (object, x, y, z, ry = 0) => { object.position.set(x, y, z); object.rotation.y = ry; return object; };

export const FIGURE_SCENES = {
  drift: {
    chapter: 'hero',
    label: '示意：网络一抖，本机连出去的线将要落到另一国的出口上，道闸在它出去之前放下',
    compose: (K) => [
      at(K.land(96, 56, 'here', 1), -38, 0, 0), at(K.land(48, 38, 'there', 4), 66, 0, -4),
      at(K.mac(), -62, TOP, -4, 0.35), at(K.token(), -76, TOP, 16),
      K.wobble(-46, -20, TOP + 1, 6), at(K.gate('shut', 26), -16, TOP, 0),
      K.cable([[-14, TOP + 1, 6], [20, TOP + 1, 8], [64, TOP + 1, 0]], { dashed: true }),
      at(K.pin({ mark: true, s: 1.5 }), 66, TOP, -4),
    ],
  },
  leak: {
    chapter: 'leak',
    label: '示意：代理管道照常通往另一国的出口，四条从本机绕出去的旁路被一道放平的道闸一起拦住',
    compose: (K) => [
      at(K.land(100, 78, 'here', 2), -40, 0, 12), at(K.land(40, 32, 'there', 5), 78, 0, -14),
      at(K.mac(), -64, TOP, -8, 0.3), at(K.tube(84), 14, TOP + 6, -14), at(K.pin(), 78, TOP, -14),
      ...[0, 1, 2, 3].map((i) => K.cable([[-58, TOP + 1, 4], [-62 + i * 9, TOP + 0.8, 18], [-62 + i * 9, TOP + 0.8, 33]], { mark: true })),
      at(K.gate('shut', 36), -72, TOP, 33),
    ],
  },
  recovery: {
    chapter: 'recovery',
    label: '示意：线路断开，道闸斜在半空等待，宽限期秒表已走过四分之三',
    compose: (K) => [
      at(K.land(150, 52, 'here', 3), 2, 0, 0),
      at(K.mac(), -58, TOP, -2, 0.35), K.cut([-40, TOP + 0.8, 4], [6, TOP + 0.8, 4]),
      at(K.gate('hold', 26), 14, TOP, -2), at(K.tube(36), 46, TOP + 6, 4),
      at(K.stand(6), -17, TOP, -6), at(K.watch(0.75), -17, TOP + 14, -6),
    ],
  },
  sessions: {
    chapter: 'sessions',
    label: '示意：一个浏览器里的三个账号，各自的线都连到同一套指纹上',
    compose: (K) => [
      at(K.land(150, 60, 'here', 8), -4, 0, 0),
      at(K.window(44, 30), -46, TOP, -14, 0.2),
      ...[-62, -46, -30].map((x) => at(K.token(), x, TOP, 8)),
      ...[-62, -46, -30].map((x) => K.cable([[x, TOP + 1, 10], [x + 22, TOP + 1, 18], [38, TOP + 1, 6]], { mark: true })),
      at(K.print(0, { mark: true, s: 1.5 }), 48, TOP, 0, -0.25),
    ],
  },
  locale: {
    chapter: 'locale',
    label: '示意：出口在另一国的白天，本机的钟还停在原来时区的夜里',
    compose: (K) => [
      at(K.land(72, 52, 'here', 6), -50, 0, 0), at(K.land(64, 44, 'there', 7), 50, 0, -4),
      at(K.mac(), -56, TOP, 2, 0.3), at(K.stand(18), -62, TOP, -18), at(K.clock(11.2, { night: true, mark: true, r: 9 }), -62, TOP + 26, -18),
      at(K.pin(), 42, TOP, 4), at(K.stand(12), 62, TOP, -12), at(K.clock(3.5, { r: 9 }), 62, TOP + 20, -12),
      K.cable([[-40, TOP + 2, 10], [0, 30, 6], [40, TOP + 14, 4]], { dashed: true }),
    ],
  },
};

const realmOf = (id) => SCENE_REALM[FIGURE_SCENES[id].chapter] ?? 'text';
const sheetOf = (id) => REALMS.find((r) => r.id === realmOf(id)).sheet;

/** 让整组物件在画面里留足边距：按包围盒八角投影后的最大跨度推远或拉近镜头。 */
function fit(camera, object, margin = 0.86) {
  const box = new THREE.Box3().setFromObject(object), center = box.getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(0.18, 0.42, 1).normalize();
  let distance = box.getSize(new THREE.Vector3()).length() * 2;
  for (let i = 0; i < 6; i++) {
    camera.position.copy(center).addScaledVector(dir, distance); camera.lookAt(center); camera.updateMatrixWorld();
    let span = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(camera); span = Math.max(span, Math.abs(p.x), Math.abs(p.y));
    }
    distance *= span / margin;
  }
}

export async function renderFigure(id, canvas, { hdr, width = 1920, height = 720 } = {}) {
  const spec = FIGURE_SCENES[id];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = await new HDRLoader().loadAsync(hdr);
  const environment = pmrem.fromEquirectangular(texture);
  scene.environment = environment.texture; scene.environmentIntensity = 0.85; scene.environmentRotation.y = 0.6;
  texture.dispose(); pmrem.dispose();

  const M = materials({ mark: MARK[realmOf(id)] });
  const K = kit(M);
  const props = new THREE.Group(); spec.compose(K).forEach((o) => props.add(o)); scene.add(props);

  const box = new THREE.Box3().setFromObject(props), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const key = new THREE.DirectionalLight(0xfff6ec, 2.4);
  key.position.set(center.x - size.x * 0.5, size.x * 0.9, center.z + size.x * 0.55); key.target.position.copy(center);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 12; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -size.x * 1.5, right: size.x * 1.5, top: size.x * 1.5, bottom: -size.x * 1.5, near: 1, far: size.x * 6 });
  scene.add(key, key.target);
  // 纸面的颜色从下方回弹一点：物件底部带上所在那一界的纸色，像真的放在那张纸上
  scene.add(new THREE.HemisphereLight(0xffffff, sheetOf(id), 0.5));

  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 6, size.x * 6), new THREE.ShadowMaterial({ opacity: 0.32 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = box.min.y + 0.01; catcher.receiveShadow = true; scene.add(catcher);

  const camera = new THREE.PerspectiveCamera(24, width / height, 1, 5000);
  fit(camera, props);
  renderer.render(scene, camera);
  return { dispose: () => { environment.dispose(); renderer.dispose(); } };
}
