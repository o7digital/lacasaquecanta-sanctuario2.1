import type { APIRoute } from "astro";
import { actorFor } from "../../lib/auth";
import { getPool } from "../../lib/db";
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const {
      rows: [image],
    } = await getPool().query(
      "SELECT tenant_id,content_type,bytes FROM sc_media WHERE id=$1",
      [params.id],
    );
    if (!image) return new Response("Not found", { status: 404 });
    if (image.tenant_id !== "hotel") {
      const actor = await actorFor(request);
      if (actor.tenant !== image.tenant_id)
        return new Response("Not found", { status: 404 });
    }
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.content_type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          image.tenant_id === "hotel"
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
