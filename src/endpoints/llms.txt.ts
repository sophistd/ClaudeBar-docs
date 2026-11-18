/**
 * [INPUT]: 文档集合的稳定路由、标题、描述。
 * [OUTPUT]: 双语总索引与中文 llms.txt；英文 en 路由仍链接既有 Markdown 地址。
 * [POS]: Agent 入口，从同源文档生成并保留证据边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ site, url }) => {
  const base = `${site!.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
  const docs = (await getCollection('docs')).sort((a, b) => a.id.localeCompare(b.id));
  const zhOnly = url.pathname.endsWith('/zh/llms.txt');
  const chinese = docs.filter((entry) => entry.id === 'zh' || entry.id.startsWith('zh/'));
  const english = docs.filter((entry) => !chinese.includes(entry));
  const links = (entries: typeof docs) => entries.map((entry) => `- [${entry.data.title}](${base}/markdown/${entry.id === 'en' ? 'index' : entry.id.replace(/^en\//, '')}.md): ${entry.data.description}`);
  if (zhOnly) return new Response([
    '# ClaudeBar 中文文档',
    '> macOS 网络出口控制、会话隔离、环境诊断与故障恢复工具。',
    '',
    '文档依据 2026 年 11 月 17 日核对的代码编写，不代表已经验证所有设备流量都受保护。',
    '操作前请先阅读前提和命令副作用。教学模拟不会观察或改变真实机器。',
    '本索引不代表提供公开安装包、MCP 接口或搜索 API。ClaudeBar 与 Anthropic 无隶属或背书关系。',
    '', '## 中文页面', ...links(chinese),
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response([
    '# ClaudeBar documentation',
    '> Independent macOS network egress, session isolation, diagnostics, and recovery utility.',
    '',
    'Baseline: 2026-11-17. Source-reviewed behavior is not a whole-device security guarantee.',
    'Read prerequisites and command side effects before acting. Simulations do not observe a real machine.',
    'No public binary availability, MCP endpoint, or search API is implied. Not affiliated with Anthropic.',
    '',
    '## English', ...links(english),
    '', '## 简体中文', ...links(chinese),
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
