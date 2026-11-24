/**
 * [INPUT]: 依赖 three 的几何体、EdgesGeometry、LineSegments 与 LineBasicMaterial；./home-tokens.mjs 的 PALETTE。
 * [OUTPUT]: 对外提供 PARTS（每个章节一件线框零件的工厂，单位尺寸约 1）与 createRoom(c) 黑色蓝图房间。
 *           零件返回 {group, set?(state), focus?(key)}：恢复开关按三态扳动拉杆，会话窗与观测图响应联动高亮。
 * [POS]: 首页 3D 的零件库，只造物不调度：每件零件都是 ClaudeBar 自己的领域对象（菜单栏面板、检查站、两扇会话窗、
 *        观测图、三态开关、待检纸页、工作台、安装包）画成的技术线稿，并带一条尺寸标注线；
 *        摆放、卷曲与渲染归 home-scene。不再使用应用图标的门框几何——品牌标记只留在页头。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { PALETTE } from './home-tokens.mjs';

// ============================================================================
//  线稿原语：任何几何体都只取边，统一象牙色细线；尺寸线是"技术图纸"的识别符
// ============================================================================
const ink = (opacity = 0.62) => new THREE.LineBasicMaterial({ color: PALETTE.ivory, transparent: true, opacity, depthWrite: false });
const edges = (geometry, material = ink(), at = [0, 0, 0], rot = [0, 0, 0]) => {
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), material);
  line.position.set(...at); line.rotation.set(...rot); geometry.dispose();
  return line;
};
const box = (w, h, d, at, material) => edges(new THREE.BoxGeometry(w, h, d), material, at);

/** 尺寸标注：一条竖线加两端短横，立在零件右侧。 */
function dimension(h, x) {
  const t = 0.06, v = [x, -h / 2, 0, x, h / 2, 0, x - t, -h / 2, 0, x + t, -h / 2, 0, x - t, h / 2, 0, x + t, h / 2, 0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(g, ink(0.35));
}
const assemble = (children, h, w) => { const group = new THREE.Group(); group.add(...children, dimension(h, w / 2 + 0.18)); return group; };

// ============================================================================
//  零件：每章一件，都是 ClaudeBar 世界里的东西
// ============================================================================
export const PARTS = {
  // 首屏：菜单栏一条，状态项下面挂出面板
  hero: () => ({ group: assemble([
    box(1.7, 0.08, 0.3, [0, 0.5, 0]), box(0.12, 0.08, 0.32, [0.55, 0.5, 0]),
    box(0.8, 0.85, 0.05, [0.32, -0.02, 0.08]), box(0.62, 0.1, 0.06, [0.32, 0.26, 0.1]), box(0.62, 0.1, 0.06, [0.32, 0.08, 0.1]),
  ], 1.1, 1.7) }),

  // 出口门禁：两根立柱、横梁与一根闸杆
  gate: () => ({ group: assemble([
    box(0.16, 1.15, 0.16, [-0.5, 0, 0]), box(0.16, 1.15, 0.16, [0.5, 0, 0]), box(1.3, 0.12, 0.22, [0, 0.62, 0]),
    box(0.95, 0.05, 0.05, [0, 0.05, 0.12]), box(0.32, 0.05, 0.5, [-0.5, -0.6, 0]), box(0.32, 0.05, 0.5, [0.5, -0.6, 0]),
  ], 1.3, 1.3) }),

  // 会话隔离：两扇浏览器窗前后错开，各有标题栏；联动 lane:i 时点亮对应一扇
  sessions: () => {
    const lit = [ink(), ink()];
    const win = (i, x, z) => [box(0.95, 0.62, 0.04, [x, -0.05 * i, z], lit[i]), box(0.95, 0.1, 0.05, [x, 0.21 - 0.05 * i, z], lit[i])];
    return {
      group: assemble([...win(0, -0.18, 0.3), ...win(1, 0.22, -0.3), box(0.02, 0.9, 0.9, [0.02, 0, 0], ink(0.25))], 0.9, 1.4),
      focus(key) { lit.forEach((m, i) => { m.opacity = key === `lane:${i}` ? 1 : key.startsWith('lane:') ? 0.25 : 0.62; }); },
    };
  },

  // 检查与修复：观测图（二十面体的边即连接），联动 node:i 时把标记移到对应顶点
  observe: () => {
    const geo = new THREE.IcosahedronGeometry(0.62, 1), points = geo.getAttribute('position');
    const marker = edges(new THREE.OctahedronGeometry(0.07), ink(1));
    const graph = edges(geo.clone());
    const group = assemble([graph, marker], 1.25, 1.25);
    return {
      group,
      focus(key) {
        const i = key.startsWith('node:') ? Number(key.slice(5)) % points.count : 0;
        marker.position.set(points.getX(i), points.getY(i), points.getZ(i));
        marker.material.opacity = key.startsWith('node:') ? 1 : 0.4;
      },
    };
  },

  // 恢复条件：三态开关，拉杆按 放行 / 等待 / 隔离 扳到三个位置
  recovery: () => {
    const lever = new THREE.Group();
    lever.add(edges(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), ink(), [0, 0.375, 0]), edges(new THREE.IcosahedronGeometry(0.09, 0), ink(), [0, 0.78, 0]));
    lever.position.set(0, -0.2, 0);
    const marks = [-0.62, 0, 0.62].map((a) => box(0.04, 0.02, 0.18, [Math.sin(a) * 0.5, -0.06, 0]));
    const group = assemble([box(1.1, 0.26, 0.5, [0, -0.33, 0]), ...marks, lever], 1.25, 1.1);
    return { group, set(state) { lever.rotation.z = [0.62, 0, -0.62][state] ?? 0; } };
  },

  // 发送前检查：一叠待检纸页与一枚放大镜
  preflight: () => ({ group: assemble([
    ...[0, 1, 2, 3].map((i) => box(0.72, 0.96, 0.012, [i * 0.05, -i * 0.04, -i * 0.12])),
    edges(new THREE.TorusGeometry(0.24, 0.025, 6, 28), ink(), [0.38, 0.18, 0.22]),
    box(0.05, 0.36, 0.05, [0.6, -0.12, 0.22]),
  ], 1.1, 1.2) }),

  // 工作台：显示屏、支架与底座
  product: () => ({ group: assemble([
    box(1.45, 0.92, 0.06, [0, 0.18, 0]), box(1.3, 0.76, 0.02, [0, 0.18, 0.04], ink(0.3)),
    box(0.1, 0.36, 0.1, [0, -0.45, -0.04]), box(0.6, 0.03, 0.32, [0, -0.64, -0.04]),
  ], 1.3, 1.45) }),

  // 下载：一只安装包纸箱，封箱带十字
  finale: () => ({ group: assemble([
    box(0.9, 0.62, 0.7, [0, 0, 0]), box(0.92, 0.02, 0.12, [0, 0.31, 0]), box(0.12, 0.02, 0.72, [0, 0.31, 0]),
  ], 0.62, 0.9) }),
};

// ============================================================================
//  蓝图房间：一组随深度后退的矩形截面、四条墙角线与地面/顶面的纵线。截面随滚动向观者推进，
//  移动的是房间，纸带始终贴着视口——这是"在纸面上前进"的错觉来源
// ============================================================================
export function createRoom(c) {
  const hw = c.vw * 0.8, hh = c.vh * 0.72, cell = c.vh * 0.6, count = 16, deep = -cell * count;
  const v = [];
  for (let k = 0; k <= count; k++) {
    const z = -k * cell;
    v.push(-hw, -hh, z, hw, -hh, z, hw, -hh, z, hw, hh, z, hw, hh, z, -hw, hh, z, -hw, hh, z, -hw, -hh, z);
  }
  for (let i = -6; i <= 6; i++) {
    const x = (i / 6) * hw;
    v.push(x, -hh, cell, x, -hh, deep, x, hh, cell, x, hh, deep);
  }
  for (let i = -3; i <= 3; i++) {
    const y = (i / 3) * hh;
    v.push(-hw, y, cell, -hw, y, deep, hw, y, cell, hw, y, deep);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: PALETTE.ivory, transparent: true, opacity: 0.07, depthWrite: false }));
  return { object: lines, cell };
}
