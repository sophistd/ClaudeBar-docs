/**
 * [INPUT]: Starlight loader、schema 与 Astro 内容集合。
 * [OUTPUT]: en/zh 双语文档路由、集合与界面词条；摘要默认展示，允许保留检索描述而省略重复开场。
 * [POS]: HTML 和机器可读文档共用的内容契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { i18nLoader } from '@astrojs/starlight/loaders';

export const collections = {
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  docs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema: docsSchema({ extend: z.object({
      audience: z.string(),
      showDescription: z.boolean().default(true),
      kind: z.enum(['Overview', 'Tutorial', 'How-to', 'Reference', 'Explanation']),
      prerequisites: z.string(),
      outcome: z.string(),
      evidence: z.string().default('Source reviewed'),
    }) }),
  }),
};
