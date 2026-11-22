import type { APIRoute } from "astro";
import { z } from "zod";
import { verifyStaySignature } from "../../../lib/hotel-integrations";
import { getPool, ServiceError } from "../../../lib/db";
import { importStay, pointsOperation } from "../../../lib/circle";
import type { Actor } from "../../../lib/auth";
const payload = z
  .object({
    guestEmail: z.email(),
    reference: z.string().min(1).max(200),
    property: z.enum(["La Casa Que Canta", "El Ensueño", "El Murmullo"]),
    arrival: z.iso.date(),
    departure: z.iso.date(),
    status: z.enum(["confirmed", "completed", "cancelled"]),
    notes: z.string().max(2000).default(""),
  })
  .strict();
export const POST: APIRoute = async ({ request }) => {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const secret = process.env.INBOUND_STAY_SECRET,
      actorId = process.env.INBOUND_STAY_ACTOR_ID,
      source = process.env.INBOUND_STAY_SOURCE;
    if (!secret || !actorId || !source)
      throw new ServiceError("integration_not_configured", 503);
    const body = await request.text();
    if (body.length > 20000) throw new ServiceError("payload_too_large", 413);
    if (
      !verifyStaySignature(
        body,
        request.headers.get("x-sc-timestamp") || "",
        request.headers.get("x-sc-signature") || "",
        secret,
      )
    )
      throw new ServiceError("signature", 401);
    const data = payload.parse(JSON.parse(body));
    const {
      rows: [staff],
    } = await getPool().query(
      'SELECT u.id,u.name,u.email,a.roles FROM sc_actor a JOIN "user" u ON u.id=a.user_id WHERE a.user_id=$1 AND a.tenant_id=\'hotel\' AND u."emailVerified"',
      [actorId],
    );
    if (!staff) throw new ServiceError("integration_actor_not_ready", 503);
    const actor: Actor = { ...staff, tenant: "hotel", demo: false };
    const {
      rows: [guest],
    } = await getPool().query(
      'SELECT u.id FROM "user" u JOIN sc_actor a ON a.user_id=u.id WHERE lower(u.email)=lower($1) AND a.tenant_id=\'hotel\' AND u."emailVerified"',
      [data.guestEmail],
    );
    if (!guest) throw new ServiceError("verified_guest_not_linked", 409);
    const stay = await importStay(actor, {
      ...data,
      userId: guest.id,
      origin: source,
    });
    if (data.status === "completed" && process.env.INBOUND_STAY_OPERATION)
      await pointsOperation(actor, {
        userId: guest.id,
        stayId: stay.id,
        operation: process.env.INBOUND_STAY_OPERATION,
      });
    return Response.json(stay, { headers });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ServiceError
            ? e.code
            : e instanceof z.ZodError
              ? "validation"
              : "temporarily_unavailable",
      },
      {
        status:
          e instanceof ServiceError
            ? e.status
            : e instanceof z.ZodError
              ? 400
              : 503,
        headers,
      },
    );
  }
};
