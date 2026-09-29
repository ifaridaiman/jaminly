import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Legal pages, one Markdown file per language: src/content/legal/{en,ms}/<page>.md (PRD §5.2–5.4).
const legal = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    updated: z.coerce.date(),
    /** Plain-language points shown in the "In short" box (PRD LEGAL-2). */
    summary: z.array(z.string()).min(1),
  }),
});

export const collections = { legal };
