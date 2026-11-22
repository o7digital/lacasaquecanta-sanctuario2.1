import seed from "../data/journal.json";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  CONTENT_PATH,
  EDITORIAL_BRANCH,
  REPOSITORY,
  contentSchema,
  type Content,
} from "./schema";
import { getPool } from "./db";

let cached: { value: Content; expires: number } | undefined;
let pending: Promise<Content> | undefined;
export async function getContent(): Promise<Content> {
  if (process.env.DATABASE_URL) {
    try {
      const { rows } = await getPool().query(
        "SELECT content FROM sc_editorial WHERE tenant_id='hotel'",
      );
      if (rows.length) return contentSchema.parse(rows[0].content);
    } catch {
      /* Bundled editorial copy remains readable during database outages. */
    }
  }
  if (!process.env.VERCEL) return contentSchema.parse(seed);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending) return pending;
  pending = (async () => {
    try {
      const branch = process.env.CONTENT_BRANCH || EDITORIAL_BRANCH;
      const r = await fetch(
        `https://raw.githubusercontent.com/${REPOSITORY}/${branch}/${CONTENT_PATH}`,
        { signal: AbortSignal.timeout(5000), cache: "no-store" },
      );
      if (!r.ok) throw new Error("Content unavailable");
      const value = contentSchema.parse(await r.json());
      cached = { value, expires: Date.now() + 60000 };
      return value;
    } catch {
      // Last known editorial edition; never fabricate fresh publication data.
      const value = cached?.value ?? contentSchema.parse(seed);
      cached = { value, expires: Date.now() + 15000 };
      return value;
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}
export function renderBody(markdown: string): string {
  return sanitizeHtml(marked.parse(markdown, { async: false }) as string, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "blockquote",
      "a",
      "br",
      "hr",
    ],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

export function publicContent(content: Content): Content {
  return {
    ...content,
    articles: content.articles
      .filter((a) => a.status === "sample" || a.status === "published")
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          b.date.localeCompare(a.date),
      ),
    events: content.events
      .filter((e) => e.status !== "draft")
      .sort((a, b) => a.start.localeCompare(b.start)),
    editions: content.editions
      .filter((e) => e.status !== "draft")
      .sort((a, b) => b.date.localeCompare(a.date)),
    experiences: content.experiences.filter((e) => e.status !== "draft"),
    offers: content.offers.filter(
      (e) => e.status !== "draft" && !e.membersOnly && !e.tiers.length,
    ),
  };
}
