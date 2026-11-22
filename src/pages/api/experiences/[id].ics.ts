import type { APIRoute } from "astro";
import { getContent, publicContent } from "../../../lib/content";
import { calendar, plusDays } from "../../../lib/travel";
export const GET: APIRoute = async ({ params, url }) => {
  const e = publicContent(await getContent()).experiences.find(
    (e) => e.id === params.id,
  );
  if (!e || e.availability !== "confirmed" || !e.start)
    return new Response("No confirmed date", { status: 404 });
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  return new Response(
    calendar(
      {
        id: "experience-" + e.id,
        title: e.title,
        description: e.intro,
        location: e.location,
        start: e.start,
        end: plusDays(e.start, 1),
        startTime: e.startTime,
        endTime: e.endTime,
        context: e.context,
        status: "scheduled",
        category: "culture",
        source: e.source,
        verifiedAt: e.verifiedAt || e.start,
      },
      lang,
    ),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${e.id}.ics"`,
        "Cache-Control": "public, max-age=60",
      },
    },
  );
};
