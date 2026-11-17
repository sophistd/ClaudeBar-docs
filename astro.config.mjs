/**
 * [INPUT]: Astro/Starlight 的静态文档构建能力与表格键盘访问转换。
 * [OUTPUT]: 独立仓库的路由、搜索、导航与组件覆盖配置。
 * [POS]: 文档站唯一构建入口，发布路径不依赖私有应用仓库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import rehypeTables from './src/lib/rehype-tables.mjs';

export default defineConfig({
  site: 'https://sophistd.github.io',
  base: '/ClaudeBar-docs',
  trailingSlash: 'always',
  markdown: { processor: unified({ rehypePlugins: [rehypeTables] }) },
  integrations: [{
    name: 'claudebar-static-endpoints',
    hooks: { 'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/llms.txt', entrypoint: './src/endpoints/llms.txt.ts', prerender: true });
      injectRoute({ pattern: '/markdown/[...slug].md', entrypoint: './src/endpoints/markdown/[...slug].md.ts', prerender: true });
    } },
  }, starlight({
    title: 'ClaudeBar / Docs',
    description: 'Understand, configure, and verify managed network sessions on macOS.',
    defaultLocale: 'root',
    locales: { root: { label: 'English', lang: 'en' } },
    customCss: ['./src/styles/custom.css'],
    components: { PageTitle: './src/components/PageTitle.astro' },
    sidebar: [
      { label: 'Overview', link: '/' },
      { label: 'Get started', items: [{ autogenerate: { directory: 'start' } }] },
      { label: 'Concepts', items: [{ autogenerate: { directory: 'concepts' } }] },
      { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
      { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      { label: 'Developers', items: [{ autogenerate: { directory: 'developers' } }] },
      { label: 'Project', items: [{ autogenerate: { directory: 'project' } }] },
    ],
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    lastUpdated: false,
  })],
});
