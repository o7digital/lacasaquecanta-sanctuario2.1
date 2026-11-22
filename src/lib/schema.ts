import { z } from "zod";

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const categories = [
  "chef",
  "taste",
  "recipe",
  "hotel",
  "hideaway",
  "ritual",
  "place",
  "weddings",
  "moments",
] as const;
export const pairSchema = z.object({
  en: z.string().max(10000),
  es: z.string().max(10000),
});
const day = z.iso.date();
const safeUrl = z
  .url()
  .refine((v) => v.startsWith("https://"), "Use an HTTPS URL");
const mediaPath = z.string().refine((v) => {
  if (/^\/(?:assets|media)\/[\w./-]+$/.test(v) && !v.includes(".."))
    return true;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use /assets/…, /media/… or HTTPS");
export const articleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.enum(categories),
    status: z.enum(["draft", "review", "sample", "published"]),
    featured: z.boolean(),
    editionId: z.string().optional(),
    series: z.enum(["chef-letters"]).optional(),
    recipe: z
      .object({
        servings: z.number().int().min(1).max(100),
        ingredients: pairSchema,
        steps: pairSchema,
        validatedDietary: z.array(z.string()).default([]),
      })
      .optional(),
    author: pairSchema,
    date: day,
    updatedAt: day,
    image: z.object({
      src: mediaPath,
      alt: pairSchema,
      credit: z.string(),
      source: safeUrl,
    }),
    source: safeUrl,
    locales: z.object({
      en: z.object({
        title: z.string().max(200),
        intro: z.string().max(1000),
        body: z.string().max(60000),
      }),
      es: z.object({
        title: z.string().max(200),
        intro: z.string().max(1000),
        body: z.string().max(60000),
      }),
    }),
  })
  .superRefine((article, ctx) => {
    if (article.status === "draft" || article.status === "review") return;
    for (const locale of locales) {
      for (const key of ["title", "intro", "body"] as const)
        if (!article.locales[locale][key].trim())
          ctx.addIssue({
            code: "custom",
            path: ["locales", locale, key],
            message: "Required before publication",
          });
      if (!article.author[locale].trim())
        ctx.addIssue({
          code: "custom",
          path: ["author", locale],
          message: "Author required before publication",
        });
      if (!article.image.alt[locale].trim())
        ctx.addIssue({
          code: "custom",
          path: ["image", "alt", locale],
          message: "Image description required before publication",
        });
    }
    if (!article.image.credit.trim())
      ctx.addIssue({
        code: "custom",
        path: ["image", "credit"],
        message: "Image credit required before publication",
      });
  });
export const eventSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: pairSchema,
    description: pairSchema,
    location: pairSchema,
    start: day,
    end: day,
    status: z.enum(["scheduled", "cancelled", "draft"]),
    category: z.enum(["music", "community", "culture"]).default("culture"),
    context: z.enum(["hotel", "bay"]).default("bay"),
    organizer: pairSchema.optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    source: safeUrl,
    verifiedAt: day,
  })
  .refine((v) => v.end > v.start, "End is exclusive and must be after start")
  .superRefine((event, ctx) => {
    if (event.status === "draft") return;
    for (const key of ["title", "description", "location"] as const)
      for (const locale of locales)
        if (!event[key][locale].trim())
          ctx.addIssue({
            code: "custom",
            path: [key, locale],
            message: "Required before publication",
          });
  });
const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const publicationDetails = (
  value: { status: string; [key: string]: any },
  ctx: z.RefinementCtx,
  keys: string[],
) => {
  if (value.status === "draft") return;
  for (const key of keys)
    for (const locale of locales)
      if (!value[key]?.[locale]?.trim())
        ctx.addIssue({
          code: "custom",
          path: [key, locale],
          message: "Both languages are required before publication",
        });
};
export const editionSchema = z
  .object({
    id: identifier,
    number: z.string().min(1).max(30),
    date: day,
    period: pairSchema,
    title: pairSchema,
    theme: pairSchema,
    intro: pairSchema,
    image: mediaPath,
    imageCredit: z.string().default(""),
    imageAlt: pairSchema.default({ en: "", es: "" }),
    articleIds: z.array(identifier),
    status: z.enum(["draft", "sample", "published"]),
  })
  .superRefine((v, ctx) =>
    publicationDetails(v, ctx, [
      "title",
      "intro",
      "period",
      "theme",
      "imageAlt",
    ]),
  );
export const experienceCategories = [
  "diving",
  "fishing",
  "yoga",
  "gastronomy",
  "spa",
  "culture",
  "events",
] as const;
export const experienceSchema = z
  .object({
    id: identifier,
    category: z.enum(experienceCategories),
    context: z.enum(["hotel", "bay"]),
    status: z.enum(["draft", "sample", "published"]),
    title: pairSchema,
    intro: pairSchema,
    body: pairSchema,
    image: mediaPath,
    imageCredit: z.string().default(""),
    imageAlt: pairSchema.default({ en: "", es: "" }),
    provider: pairSchema,
    location: pairSchema,
    duration: pairSchema,
    languages: pairSchema,
    level: pairSchema,
    practical: pairSchema,
    conditions: pairSchema,
    cancellation: pairSchema,
    availability: z.enum(["on_request", "confirmed", "unavailable"]),
    start: day.optional(),
    end: day.optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    price: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    inclusions: pairSchema,
    source: safeUrl,
    verifiedAt: day.optional(),
    interests: z.array(z.string()).default([]),
  })
  .superRefine((v, ctx) => {
    publicationDetails(v, ctx, [
      "title",
      "intro",
      "body",
      "provider",
      "location",
      "conditions",
      "cancellation",
      "imageAlt",
    ]);
    if (v.status !== "draft" && !v.imageCredit.trim())
      ctx.addIssue({
        code: "custom",
        path: ["imageCredit"],
        message: "Photograph credit required",
      });
    if (v.end && v.start && v.end < v.start)
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Invalid date range",
      });
    if (
      v.availability === "confirmed" &&
      (!v.start || !v.provider.en || !v.provider.es)
    )
      ctx.addIssue({
        code: "custom",
        path: ["availability"],
        message: "Confirmed provider and dates required",
      });
    if (v.price !== undefined && !v.currency)
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Currency required",
      });
  });
export const offerSchema = z
  .object({
    id: identifier,
    status: z.enum(["draft", "sample", "published"]),
    title: pairSchema,
    intro: pairSchema,
    body: pairSchema,
    image: mediaPath,
    imageCredit: z.string().default(""),
    imageAlt: pairSchema.default({ en: "", es: "" }),
    bookingStart: day.optional(),
    bookingEnd: day.optional(),
    stayStart: day,
    stayEnd: day,
    conditions: pairSchema,
    exclusions: pairSchema,
    price: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    sourceUrl: safeUrl.optional(),
    sourceUrlEs: safeUrl.optional(),
    sourceVerifiedAt: day.optional(),
    membersOnly: z.boolean().default(false),
    tiers: z.array(z.enum(["Gold", "Platinum", "Black"])).default([]),
    bookingUrl: safeUrl.optional(),
    relatedIds: z.array(identifier).default([]),
  })
  .refine(
    (v) =>
      (!v.bookingStart || !v.bookingEnd || v.bookingEnd >= v.bookingStart) &&
      v.stayEnd >= v.stayStart,
    "Invalid offer dates",
  )
  .superRefine((v, ctx) => {
    if (v.price !== undefined && !v.currency)
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Currency required with a price",
      });
    publicationDetails(v, ctx, [
      "title",
      "intro",
      "body",
      "conditions",
      "exclusions",
      "imageAlt",
    ]);
  });
export const contentSchema = z
  .object({
    version: z.literal(1),
    articles: z.array(articleSchema).max(300),
    events: z.array(eventSchema).max(150),
    editions: z.array(editionSchema).max(100).default([]),
    experiences: z.array(experienceSchema).max(300).default([]),
    offers: z.array(offerSchema).max(100).default([]),
  })
  .superRefine((v, ctx) => {
    for (const key of [
      "articles",
      "events",
      "editions",
      "experiences",
      "offers",
    ] as const) {
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Identifiers must be unique",
        });
    }
    for (const edition of v.editions)
      for (const id of edition.articleIds)
        if (!v.articles.some((a) => a.id === id))
          ctx.addIssue({
            code: "custom",
            path: ["editions"],
            message: `Unknown article ${id}`,
          });
  });
export type Article = z.infer<typeof articleSchema>;
export type JournalEvent = z.infer<typeof eventSchema>;
export type Content = z.infer<typeof contentSchema>;
export const REPOSITORY = "o7digital/lacasaquecanta-sanctuario2.1";
export const CONTENT_PATH = "src/data/journal.json";
export const EDITORIAL_BRANCH = "codex/el-sanctuario-v2";
export const categoryLabels: Record<
  Article["category"],
  { en: string; es: string }
> = {
  chef: { en: "The chef’s letter", es: "La carta del chef" },
  taste: { en: "At the table", es: "Sabores de México" },
  recipe: { en: "Recipes to keep", es: "Recetas para guardar" },
  hotel: { en: "Life at the house", es: "Vida de la casa" },
  hideaway: { en: "Private hideaways", es: "Refugios privados" },
  ritual: { en: "Rituals & wellbeing", es: "Rituales y bienestar" },
  place: { en: "A sense of place", es: "El espíritu del lugar" },
  weddings: { en: "Weddings", es: "Bodas" },
  moments: { en: "Special Moments", es: "Momentos especiales" },
};
export const experienceLabels: Record<
  (typeof experienceCategories)[number],
  { en: string; es: string }
> = {
  diving: { en: "Diving", es: "Buceo" },
  fishing: { en: "Fishing", es: "Pesca" },
  yoga: { en: "Yoga", es: "Yoga" },
  gastronomy: { en: "Gastronomy", es: "Gastronomía" },
  spa: { en: "Spa & wellbeing", es: "Spa y bienestar" },
  culture: { en: "Around the bay", es: "En la bahía" },
  events: { en: "Events", es: "Eventos" },
};
export const articlePath = (lang: Locale, id: string) =>
  `/${lang}/stories/${id}/`;
export const readingTime = (body: string) =>
  Math.max(
    1,
    Math.ceil(body.replace(/<[^>]+>/g, "").split(/\s+/).length / 180),
  );
