/**
 * [INPUT]: 依赖 three；./studio-kit.mjs 的 materials/kit（与场景图同一套物件与材质）；../home-tokens.mjs 的 SCENE_REALM（mark 漆按章节所在的界取色）。
 * [OUTPUT]: 对外提供 STAGE：纸带两侧的舞台物件，契约与旧 props 相同——{ chapter, layer: near|mid, side: ±1, make() → { group, scrub?(p) } }；
 *           group 原点在接地点、最长边约 1，自带一片柔和的接地影。
 * [POS]: 首页 3D 舞台的素材库：每章一件、左右交替，是这一章痛点里的实物（错国的图钉、道闸、代理管、秒表、三个账号、夜里的钟），与中间配图互补而不照抄，
 *        与配图同一套物理材质，只是在页面里实时渲染、随滚动出场；道闸随本章进度 p 落下，p = 1 是顷刻。只造物，摆放与光照归 ../home-scene.mjs。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { SCENE_REALM } from '../home-tokens.mjs';
import { materials, kit } from './studio-kit.mjs';

const MARK = { text: 0xffb21e, code: 0xff7a45, token: 0xd2410f };
const TOP = 2.1;

/** 实时渲染用的材质：去掉透射（省掉一次额外渲染）。色彩管理开着时 three 自己把 sRGB 色值换成线性值；若建材质时它已被关掉，这里手动换，两种求值顺序结果相同。 */
function liveMaterials(mark) {
  const M = materials({ mark });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, roughness: 0.3, clearcoat: 1, transparent: true, opacity: 0.7 });
  if (!THREE.ColorManagement.enabled) {
    for (const m of Object.values(M)) ['color', 'emissive', 'sheenColor', 'attenuationColor'].forEach((k) => m[k]?.convertSRGBToLinear());
  }
  return M;
}
const KITS = Object.fromEntries(Object.entries(MARK).map(([realm, mark]) => [realm, kit(liveMaterials(mark))]));

let blob = null;
/** 接地影：一张径向渐变贴图，压扁成物件底面的椭圆；不用阴影贴图，滚动时零额外开销。 */
function shadow(w, d) {
  if (!blob) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.6, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    blob = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, d * 1.4).rotateX(-Math.PI / 2), blob);
  m.position.y = 0.05; m.renderOrder = -1;
  return m;
}

/** 把一组物件收成"原点在接地点、最长边 1"的道具，并垫上接地影。 */
function prop(objects, { gate = null } = {}) {
  const inner = new THREE.Group(); objects.forEach((o) => inner.add(o));
  const box = new THREE.Box3().setFromObject(inner), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  inner.position.set(-center.x, -box.min.y, -center.z);
  inner.add(shadow(size.x, size.z).translateX(center.x).translateZ(center.z));
  // 归一化放在中间一层：最外层 group 的缩放留给 home-scene 按景深摆放
  const unit = new THREE.Group(); unit.add(inner); unit.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  const group = new THREE.Group(); group.add(unit);
  // 道闸横杆随本章进度从竖起落到放平：顷刻就是拦下的那一刻
  const arm = gate?.userData.arm;
  return { group, scrub: arm ? (p) => { arm.rotation.z = gate.userData.open * (1 - p); } : undefined };
}

const at = (object, x, y, z, ry = 0) => { object.position.set(x, y, z); object.rotation.y = ry; return object; };
const K = (chapter) => KITS[SCENE_REALM[chapter] ?? 'text'];
const piece = (chapter, layer, side, build) => ({ chapter, layer, side, make: () => build(K(chapter)) });

export const STAGE = {
  // 每章一件、左右交替：挑这一章痛点里最能代表"出事"或"拦下"的那一件实物，与中间的配图互补而不照抄
  'hero-pin': piece('hero', 'near', 1, (k) => prop([at(k.land(46, 36, 'there', 4), 0, 0, 0), at(k.pin({ mark: true, s: 1.4 }), 0, TOP, 0)])),
  'gate-barrier': piece('gate', 'mid', -1, (k) => { const g = k.gate('open', 34); return prop([g], { gate: g }); }),
  'leak-tube': piece('leak', 'near', 1, (k) => prop([at(k.tube(56), 0, 6, 0), at(k.pin(), 34, 0, 0)])),
  'recovery-watch': piece('recovery', 'near', -1, (k) => prop([at(k.stand(6), 0, 0, 0), at(k.watch(0.75), 0, 14, 0)])),
  'sessions-accounts': piece('sessions', 'near', 1, (k) => prop([...[-12, 0, 12].map((x) => at(k.token(), x, 0, 0))])),
  'locale-night': piece('locale', 'near', -1, (k) => prop([at(k.stand(16), 0, 0, 0), at(k.clock(11.2, { night: true, mark: true, r: 9 }), 0, 24, 0)])),
};
