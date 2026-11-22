import type { APIRoute } from "astro";
import { getWeather } from "../../lib/weather";
export const GET: APIRoute = async () => {
  try {
    const weather = await getWeather();
    return Response.json(weather, {
      headers: {
        "Cache-Control": weather.stale
          ? "no-store"
          : "public, max-age=60, s-maxage=300",
      },
    });
  } catch {
    return Response.json(
      { error: "temporarily_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
};
