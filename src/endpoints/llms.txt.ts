/**
 * [INPUT]: 文档集合的稳定路由、标题、描述。
 * [OUTPUT]: 静态 llms.txt 索引，无聊天与检索服务。
 * [POS]: Agent 入口，从同源文档生成并保留证据边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ site }) => {
  const base = `${site!.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
  const docs = (await getCollection('docs')).sort((a, b) => a.id.localeCompare(b.id));
  return new Response([
    '# ClaudeBar documentation',
    '> Independent macOS network egress, session isolation, diagnostics, and recovery utility.',
    '',
    'Baseline: 2026-11-17. Source-reviewed behavior is not a whole-device security guarantee.',
    'Read prerequisites and command side effects before acting. Simulations do not observe a real machine.',
    'No public binary availability, MCP endpoint, or search API is implied. Not affiliated with Anthropic.',
    '',
    '## Pages',
    ...docs.map((entry) => `- [${entry.data.title}](${base}/markdown/${entry.id}.md): ${entry.data.description}`),
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
