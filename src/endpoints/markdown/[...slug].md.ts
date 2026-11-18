/**
 * [INPUT]: 同一 docs 内容集合的正文与 frontmatter。
 * [OUTPUT]: 稳定的双语 Markdown 地址；英文 en 路由映射回原端点，沿用摘要契约。
 * [POS]: Agent 阅读接口，不另维护一份文档正文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
export async function getStaticPaths() {
  return (await getCollection('docs')).map((entry) => ({ params: { slug: entry.id === 'en' ? 'index' : entry.id.replace(/^en\//, '') }, props: { entry } }));
}
export const GET: APIRoute = ({ props }) => {
  const { entry } = props;
  const zh = entry.id === 'zh' || entry.id.startsWith('zh/');
  const lead = entry.data.showDescription && entry.data.description ? `${entry.data.description}\n\n` : '';
  const body = (entry.body ?? '')
    .replace(/^import .+;\s*$/gm, '')
    .replace(/<DocFigure\b([^>]*?)\/>/gs, (_: string, attrs: string) => {
      const value = (key: string) => attrs.match(new RegExp(`${key}="([^"]*)"`))?.[1] ?? '';
      return `![${value('alt')}](${value('src')})\n\n${value('caption')}`;
    })
    .replace(/<GateExplorer\s*\/>/g, zh
      ? '*网页版提供可操作的门禁教学模拟，不会连接真实网络。下方状态表说明了相同的变化过程。*'
      : '*The web version includes an explicitly labeled lifecycle simulation. The state table below is its text equivalent.*')
    .replace(/<\/?(?:Tabs|TabItem)[^>]*>/g, '');
  return new Response(`---\ntitle: ${JSON.stringify(entry.data.title)}\nlang: ${zh ? 'zh-CN' : 'en'}\nkind: ${entry.data.kind}\naudience: ${entry.data.audience}\nprerequisites: ${JSON.stringify(entry.data.prerequisites)}\noutcome: ${JSON.stringify(entry.data.outcome)}\nevidence: ${entry.data.evidence}\nbaseline: 2026-11-17\n---\n\n# ${entry.data.title}\n\n${lead}${body}`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
