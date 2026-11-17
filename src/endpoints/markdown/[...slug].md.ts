/**
 * [INPUT]: 同一 docs 内容集合的正文与 frontmatter。
 * [OUTPUT]: 每页稳定的静态 Markdown 端点，替换浏览器专用交互。
 * [POS]: Agent 阅读接口，不另维护一份文档正文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
export async function getStaticPaths() {
  return (await getCollection('docs')).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}
export const GET: APIRoute = ({ props }) => {
  const { entry } = props;
  const body = (entry.body ?? '')
    .replace(/^import .+;\s*$/gm, '')
    .replace(/<GateExplorer\s*\/>/g, '*The web version includes an explicitly labeled lifecycle simulation. The state table below is its text equivalent.*')
    .replace(/<\/?(?:Tabs|TabItem)[^>]*>/g, '');
  return new Response(`---\ntitle: ${JSON.stringify(entry.data.title)}\nkind: ${entry.data.kind}\naudience: ${entry.data.audience}\nprerequisites: ${JSON.stringify(entry.data.prerequisites)}\noutcome: ${JSON.stringify(entry.data.outcome)}\nevidence: ${entry.data.evidence}\nbaseline: 2026-11-17\n---\n\n# ${entry.data.title}\n\n${entry.data.description}\n\n${body}`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
