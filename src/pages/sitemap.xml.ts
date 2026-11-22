import type { APIRoute } from "astro";
import { getContent, publicContent } from "../lib/content";
import { escape } from "../lib/presentation";
export const GET: APIRoute = async ({ url }) => {
  const content = publicContent(await getContent());
  const origin = process.env.PUBLIC_SITE_URL || url.origin;
  const urls = ["en", "es"].flatMap((lang) => [
    `/${lang}/`,
    `/${lang}/archives/`,
    `/${lang}/explore/`,
    `/${lang}/offers/`,
    ...content.articles
      .filter((a) => a.status === "published")
      .map((a) => `/${lang}/stories/${a.id}/`),
    ...content.editions
      .filter((e) => e.status === "published")
      .map((e) => `/${lang}/editions/${e.id}/`),
    ...content.experiences
      .filter((e) => e.status === "published")
      .map((e) => `/${lang}/experiences/${e.id}/`),
    ...content.offers
      .filter((o) => o.status === "published")
      .map((o) => `/${lang}/offers/${o.id}/`),
  ]);
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls
      .map(
        (path) => `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`,
      )
      .join("") +
    "</urlset>";
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
};
