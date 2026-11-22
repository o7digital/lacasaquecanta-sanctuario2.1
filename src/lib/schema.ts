import { z } from 'zod';

export const locales = ['en', 'es'] as const;
export type Locale = typeof locales[number];
export const categories = ['chef', 'taste', 'recipe', 'hotel', 'hideaway', 'ritual', 'place'] as const;
export const pairSchema = z.object({ en: z.string().max(10000), es: z.string().max(10000) });
const day = z.iso.date();
const safeUrl = z.url().refine((v) => v.startsWith('https://'), 'Use an HTTPS URL');
const mediaPath = z.string().refine((v) => {
  if (/^\/(?:assets|media)\/[\w./-]+$/.test(v) && !v.includes('..')) return true;
  try { const url = new URL(v); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use /assets/…, /media/… or HTTPS');
export const articleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(categories),
  status: z.enum(['draft', 'review', 'sample', 'published']),
  featured: z.boolean(),
  author: pairSchema,
  date: day,
  updatedAt: day,
  image: z.object({ src: mediaPath, alt: pairSchema, credit: z.string(), source: safeUrl }),
  source: safeUrl,
  locales: z.object({
    en: z.object({ title: z.string().max(200), intro: z.string().max(1000), body: z.string().max(60000) }),
    es: z.object({ title: z.string().max(200), intro: z.string().max(1000), body: z.string().max(60000) }),
  }),
}).superRefine((article,ctx) => {
  if (article.status === 'draft' || article.status === 'review') return;
  for (const locale of locales) {
    for (const key of ['title','intro','body'] as const) if (!article.locales[locale][key].trim()) ctx.addIssue({code:'custom',path:['locales',locale,key],message:'Required before publication'});
    if (!article.author[locale].trim()) ctx.addIssue({code:'custom',path:['author',locale],message:'Author required before publication'});
    if (!article.image.alt[locale].trim()) ctx.addIssue({code:'custom',path:['image','alt',locale],message:'Image description required before publication'});
  }
  if (!article.image.credit.trim()) ctx.addIssue({code:'custom',path:['image','credit'],message:'Image credit required before publication'});
});
export const eventSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: pairSchema, description: pairSchema, location: pairSchema,
  start: day, end: day,
  status: z.enum(['scheduled', 'cancelled', 'draft']),
  category: z.enum(['music', 'community', 'culture']).default('culture'),
  source: safeUrl, verifiedAt: day,
}).refine(v => v.end > v.start, 'End is exclusive and must be after start').superRefine((event,ctx) => {
  if (event.status === 'draft') return;
  for (const key of ['title','description','location'] as const) for (const locale of locales) if (!event[key][locale].trim()) ctx.addIssue({code:'custom',path:[key,locale],message:'Required before publication'});
});
export const contentSchema = z.object({
  version: z.literal(1),
  articles: z.array(articleSchema).max(300),
  events: z.array(eventSchema).max(150),
}).superRefine((v, ctx) => {
  for (const key of ['articles', 'events'] as const) {
    if (new Set(v[key].map(x => x.id)).size !== v[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'Identifiers must be unique' });
  }
});
export type Article = z.infer<typeof articleSchema>;
export type JournalEvent = z.infer<typeof eventSchema>;
export type Content = z.infer<typeof contentSchema>;
export const REPOSITORY = 'o7digital/lacasaquecanta-sanctuario2.1';
export const CONTENT_PATH = 'src/data/journal.json';
export const EDITORIAL_BRANCH = 'codex/el-sanctuario';
export const categoryLabels: Record<Article['category'], { en: string; es: string }> = {
  chef: { en: 'The chef’s letter', es: 'La carta del chef' },
  taste: { en: 'At the table', es: 'Sabores de México' },
  recipe: { en: 'Recipes to keep', es: 'Recetas para guardar' },
  hotel: { en: 'Life at the house', es: 'Vida de la casa' },
  hideaway: { en: 'Private hideaways', es: 'Refugios privados' },
  ritual: { en: 'Rituals & wellbeing', es: 'Rituales y bienestar' },
  place: { en: 'A sense of place', es: 'El espíritu del lugar' },
};
export const articlePath = (lang: Locale, id: string) => `/${lang}/stories/${id}/`;
export const readingTime = (body: string) => Math.max(1, Math.ceil(body.replace(/<[^>]+>/g, '').split(/\s+/).length / 180));
