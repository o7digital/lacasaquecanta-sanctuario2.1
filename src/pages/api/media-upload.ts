import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { actorFor, requireRole } from "../../lib/auth";
import { getPool, ServiceError } from "../../lib/db";
export const POST: APIRoute = async ({ request, url }) => {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    if (request.headers.get("origin") !== url.origin)
      throw new ServiceError("origin", 403);
    const actor = await actorFor(request);
    requireRole(actor, "editor");
    if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024)
      throw new ServiceError("file_too_large", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new ServiceError("file_required");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3 * 1024 * 1024) {
        await reader.cancel();
        throw new ServiceError("file_too_large", 413);
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks),
      type =
        bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? "image/jpeg"
          : bytes[0] === 137 && bytes.toString("ascii", 1, 4) === "PNG"
            ? "image/png"
            : bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP"
              ? "image/webp"
              : null;
    if (!type) throw new ServiceError("unsupported_image", 415);
    const id = randomUUID();
    await getPool().query(
      "INSERT INTO sc_media(id,tenant_id,content_type,bytes,created_by) VALUES($1,$2,$3,$4,$5)",
      [id, actor.tenant, type, bytes, actor.id],
    );
    return Response.json({ path: `/media/${id}` }, { status: 201, headers });
  } catch (e) {
    return Response.json(
      { error: e instanceof ServiceError ? e.code : "upload_unavailable" },
      { status: e instanceof ServiceError ? e.status : 503, headers },
    );
  }
};
