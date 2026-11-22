import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { actorFor, mailConfigured, requireRole } from "../../../lib/auth";
import { getPool, transaction, audit, ServiceError } from "../../../lib/db";
import * as circle from "../../../lib/circle";
import { startDemo } from "../../../lib/demo";
import { getContent, publicContent } from "../../../lib/content";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
export const ALL: APIRoute = async ({ request, params, url }) => {
  const path = params.path || "",
    method = request.method;
  try {
    if (method === "GET" && path === "status")
      return Response.json(
        {
          database: Boolean(process.env.DATABASE_URL),
          identity: mailConfigured(),
          demo:
            process.env.DEMO_ENABLED === "true" &&
            Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET),
          newsletter: Boolean(
            process.env.NEWSLETTER_ENABLED === "true" &&
            process.env.MAILCHIMP_API_KEY &&
            process.env.MAILCHIMP_AUDIENCE_ID,
          ),
          pms: false,
        },
        { headers },
      );
    if (method === "GET" && path === "catalogue")
      return Response.json(publicContent(await getContent()), { headers });
    if (!["GET", "POST", "PUT", "DELETE"].includes(method))
      throw new ServiceError("method_not_allowed", 405);
    if (method !== "GET" && request.headers.get("origin") !== url.origin)
      throw new ServiceError("origin", 403);
    const raw = method === "GET" ? "{}" : await request.text();
    if (raw.length > 1500000) throw new ServiceError("payload_too_large", 413);
    let data: any;
    try {
      data = JSON.parse(raw || "{}");
    } catch {
      throw new ServiceError("invalid_json");
    }
    if (method === "POST" && path === "demo") {
      const limiter = circle.digest(
        request.headers.get("x-vercel-forwarded-for") ||
          request.headers.get("x-forwarded-for") ||
          "local",
      );
      const {
        rows: [limit],
      } = await getPool().query(
        "INSERT INTO sc_rate_limit(id,count,expires_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(id) DO UPDATE SET count=CASE WHEN sc_rate_limit.expires_at<now() THEN 1 ELSE sc_rate_limit.count+1 END,expires_at=CASE WHEN sc_rate_limit.expires_at<now() THEN now()+interval '1 hour' ELSE sc_rate_limit.expires_at END RETURNING count",
        ["demo:" + limiter],
      );
      if (limit.count > 120) throw new ServiceError("rate_limited", 429);
      const result = await startDemo(request, data.mode);
      Object.entries(headers).forEach(([k, v]) => result.headers.set(k, v));
      return result;
    }
    const actor = await actorFor(request);
    let result: unknown;
    if (method === "GET" && path === "account")
      result = await circle.account(actor);
    else if (method === "PUT" && path === "profile")
      result = await circle.saveProfile(actor, data);
    else if (method === "POST" && path === "notebook")
      result = await circle.saveItem(actor, data);
    else if (method === "POST" && path === "notebook/import")
      result = await circle.importNotebook(actor, data);
    else if (method === "POST" && path === "plans")
      result = await circle.createPlan(actor, data);
    else if (method === "POST" && path === "requests")
      result = await circle.createRequest(actor, data);
    else if (method === "PUT" && /^requests\/[a-f0-9-]{36}$/.test(path))
      result = await circle.updateRequest(actor, path.split("/")[1], data);
    else if (
      method === "POST" &&
      /^requests\/[a-f0-9-]{36}\/messages$/.test(path)
    )
      result = await circle.replyToRequest(actor, path.split("/")[1], data);
    else if (method === "POST" && path === "card")
      result = await circle.card(actor);
    else if (method === "POST" && path === "card/revoke") {
      await getPool().query(
        "UPDATE sc_card_token SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [actor.id],
      );
      result = { revoked: true };
    } else if (method === "GET" && path === "staff")
      result = await circle.staffData(actor);
    else if (method === "GET" && /^staff\/guests\/[a-zA-Z0-9-]+$/.test(path))
      result = await circle.guestDetail(actor, path.split("/")[2]);
    else if (method === "POST" && path === "staff/scan")
      result = await circle.scanCard(actor, String(data.token || ""));
    else if (method === "PUT" && path === "staff/program")
      result = await circle.changeProgram(actor, data);
    else if (method === "PUT" && path === "staff/tiers")
      result = await circle.assignTier(actor, data);
    else if (method === "POST" && path === "staff/points")
      result = await circle.pointsOperation(actor, data);
    else if (method === "POST" && path === "staff/stays")
      result = await circle.importStay(actor, data);
    else if (method === "PUT" && path === "staff/roles")
      result = await circle.setStaffRoles(actor, data);
    else if (method === "GET" && path === "staff/editorial")
      result = await circle.editorial(actor);
    else if (method === "PUT" && path === "staff/editorial")
      result = await circle.saveEditorial(actor, data);
    else if (method === "POST" && path === "staff/preferences/ack") {
      requireRole(actor, "concierge");
      result = await transaction(async (client) => {
        const r = await client.query(
          "UPDATE sc_profile p SET data=jsonb_set(p.data,'{acknowledgedAt}',to_jsonb(now())),version=version+1 WHERE user_id=$1 AND EXISTS(SELECT 1 FROM sc_actor a WHERE a.user_id=p.user_id AND a.tenant_id=$2) RETURNING version",
          [data.userId, actor.tenant],
        );
        if (!r.rowCount) throw new ServiceError("guest_not_found", 404);
        await audit(client, actor, "preferences.acknowledged", data.userId);
        return { acknowledged: true };
      });
    } else throw new ServiceError("not_found", 404);
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: "validation",
          issues: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400, headers },
      );
    if (error instanceof ServiceError)
      return Response.json(
        { error: error.code },
        { status: error.status, headers },
      );
    console.error("Circle request failed", {
      path,
      code: (error as any)?.code || "internal",
    });
    return Response.json(
      { error: "temporarily_unavailable" },
      { status: 503, headers },
    );
  }
};
