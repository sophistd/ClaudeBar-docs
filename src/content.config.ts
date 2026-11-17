/**
 * [INPUT]: Starlight loader、schema 与 Astro 内容集合。
 * [OUTPUT]: 强制声明受众、前提、成果与证据状态的双语文档集合，以及中文界面词条。
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
      kind: z.enum(['Overview', 'Tutorial', 'How-to', 'Reference', 'Explanation']),
      prerequisites: z.string(),
      outcome: z.string(),
      evidence: z.string().default('Source reviewed'),
    }) }),
  }),
};
