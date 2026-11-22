import type { APIRoute } from "astro";
export const GET: APIRoute = ({ params }) => {
  const lang = params.lang;
  if (lang !== "en" && lang !== "es")
    return new Response("Not found", { status: 404 });
  return Response.json(
    {
      id: "/el-sanctuario",
      name: "El Sanctuario — La Casa Que Canta",
      short_name: "El Sanctuario",
      lang,
      description:
        lang === "en"
          ? "The journal and your private connection to La Casa Que Canta."
          : "La revista y tu vínculo privado con La Casa Que Canta.",
      start_url: `/${lang}/`,
      scope: "/",
      display: "standalone",
      background_color: "#f6f4ed",
      theme_color: "#283d37",
      icons: [
        {
          src: "/assets/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/assets/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};
