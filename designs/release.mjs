/**
 * [INPUT]: 依赖 ../public/releases.json（应用内更新与站点共用的发布源）。
 * [OUTPUT]: 对外提供 RELEASE：最新一条正式版的 version / notes / dmg / sha（8 位前缀）。
 * [POS]: designs 生成页的唯一版本事实来源；首页与获取页在构建时读取，发版只需更新 releases.json。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs';

const feed = JSON.parse(readFileSync(new URL('../public/releases.json', import.meta.url), 'utf8'));
const latest = feed.find((entry) => !entry.draft && !entry.prerelease);
if (!latest?.dmg_url || !latest?.sha256) throw new Error('releases.json 缺少可用的正式版条目（dmg_url / sha256）');

export const RELEASE = Object.freeze({
  version: latest.tag_name,
  notes: latest.html_url,
  dmg: latest.dmg_url,
  sha: latest.sha256.slice(0, 8),
});
