import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, transaction, audit, ServiceError } from "./db";
import { requireRole, type Actor } from "./auth";
import {
  profileSchema,
  emptyProfile,
  planSchema,
  requestSchema,
  requestTransitions,
  programSchema,
  defaultProgram,
  offerEligibility,
  travelPlanSchema,
  transportConfirmationSchema,
} from "./circle-schema";
import { getContent, publicContent } from "./content";
import { contentSchema } from "./schema";
import { localDay } from "./travel";
import QRCode from "qrcode";
import { isDeepStrictEqual } from "node:util";
import { unspentLots } from "./points-expiry";
import editorialSeed from "../data/journal.json";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const id = () => randomUUID();
async function expireLocked(client: PoolClient, actor: Actor, userId: string) {
  const { rows } = await client.query(
    "SELECT * FROM sc_points WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at,id",
    [actor.tenant, userId],
  );
  for (const lot of unspentLots(rows))
    if (lot.remaining > 0 && lot.expiresAt && +lot.expiresAt <= Date.now()) {
      const result = await client.query(
        "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,actor_id) VALUES($1,$2,$3,$4,$5,'expired','Configured points validity ended',$6) ON CONFLICT DO NOTHING RETURNING id",
        [
          id(),
          actor.tenant,
          userId,
          "expire:" + lot.id,
          -lot.remaining,
          actor.id,
        ],
      );
      if (result.rowCount)
        await audit(client, actor, "points.expired", result.rows[0].id, {
          source: lot.id,
        });
    }
}
async function ensureMember(client: PoolClient, actor: Actor) {
  await client.query(
    "INSERT INTO sc_profile(user_id) VALUES($1) ON CONFLICT DO NOTHING",
    [actor.id],
  );
  await client.query(
    "INSERT INTO sc_membership(user_id,tenant_id,member_number) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [
      actor.id,
      actor.tenant,
      "SC-" + randomBytes(5).toString("hex").toUpperCase(),
    ],
  );
  await client.query(
    "INSERT INTO sc_program(tenant_id) VALUES($1) ON CONFLICT DO NOTHING",
    [actor.tenant],
  );
}
export async function account(actor: Actor) {
  await transaction(async (client) => {
    await ensureMember(client, actor);
    await client.query(
      "SELECT user_id FROM sc_membership WHERE user_id=$1 FOR UPDATE",
      [actor.id],
    );
    await expireLocked(client, actor, actor.id);
  });
  const pool = getPool();
  const [profile, stays, saved, requests, membership, points, program, travel] =
    await Promise.all([
      pool.query(
        "SELECT data,version,updated_at FROM sc_profile WHERE user_id=$1",
        [actor.id],
      ),
      pool.query(
        "SELECT * FROM sc_stay WHERE tenant_id=$1 AND guest_id=$2 ORDER BY arrival DESC NULLS LAST",
        [actor.tenant, actor.id],
      ),
      pool.query(
        "SELECT kind,item_id,data,created_at FROM sc_saved WHERE user_id=$1 ORDER BY created_at DESC",
        [actor.id],
      ),
      pool.query(
        "SELECT r.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('status',u.status,'message',u.message,'created_at',u.created_at) ORDER BY u.created_at) FROM sc_request_update u WHERE u.request_id=r.id),'[]') AS history FROM sc_request r WHERE tenant_id=$1 AND guest_id=$2 ORDER BY created_at DESC",
        [actor.tenant, actor.id],
      ),
      pool.query(
        "SELECT member_number,tier,active FROM sc_membership WHERE user_id=$1",
        [actor.id],
      ),
      pool.query(
        "SELECT id,points,kind,reason,stay_id,created_at FROM sc_points WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at DESC",
        [actor.tenant, actor.id],
      ),
      pool.query("SELECT rules FROM sc_program WHERE tenant_id=$1", [
        actor.tenant,
      ]),
      pool.query(
        'SELECT stay_id AS "stayId",itinerary,version,updated_at AS "updatedAt" FROM sc_travel WHERE tenant_id=$1 AND guest_id=$2 ORDER BY updated_at DESC',
        [actor.tenant, actor.id],
      ),
    ]);
  const p = { ...emptyProfile(), ...profile.rows[0].data };
  const today = localDay(),
    current = stays.rows.find(
      (s) =>
        s.status === "confirmed" &&
        s.arrival?.toISOString().slice(0, 10) <= today &&
        s.departure?.toISOString().slice(0, 10) > today,
    );
  const upcoming = stays.rows.find(
    (s) =>
      s.status === "confirmed" && s.arrival?.toISOString().slice(0, 10) > today,
  );
  const rules = program.rows[0]?.rules || defaultProgram();
  const member = {
    ...membership.rows[0],
    active: rules.active && membership.rows[0].active,
    points: points.rows.reduce((sum, r) => sum + r.points, 0),
    benefits: rules.active
      ? rules.benefits.filter(
          (b: any) => b.active && b.tier === membership.rows[0].tier,
        )
      : [],
  };
  const sourceContent = await getContent();
  const content = publicContent(sourceContent);
  const suggestions = content.experiences
    .filter(
      (e) =>
        e.interests.some((i) => p.interests.includes(i)) &&
        !e.interests.some((i) => p.avoid.includes(i)),
    )
    .map((e) => ({
      id: e.id,
      reason: e.interests.filter((i) => p.interests.includes(i)),
    }))
    .slice(0, 4);
  return {
    actor,
    profile: p,
    profileVersion: profile.rows[0].version,
    profileUpdated: profile.rows[0].updated_at,
    stays: stays.rows,
    travelPlans: travel.rows,
    saved: saved.rows,
    requests: requests.rows,
    membership: member,
    points: points.rows,
    program: rules,
    suggestions,
    memberOffers: actor.demo
      ? []
      : sourceContent.offers.filter(
          (o) => offerEligibility(o, today, member) === "eligible",
        ),
    stage: current
      ? "during"
      : upcoming
        ? "before"
        : stays.rows.some((s) => s.status === "completed")
          ? "after"
          : "return",
  };
}
export async function saveProfile(actor: Actor, input: any) {
  const profile = profileSchema.parse(input.profile);
  return transaction(async (client) => {
    await ensureMember(client, actor);
    const previous = await client.query(
      "SELECT data FROM sc_profile WHERE user_id=$1",
      [actor.id],
    );
    const allergyChanged =
      previous.rows[0].data.allergies !== profile.allergies ||
      previous.rows[0].data.allergySharing !== profile.allergySharing;
    const data = {
      ...profile,
      allergyUpdatedAt: allergyChanged
        ? new Date().toISOString()
        : previous.rows[0].data.allergyUpdatedAt,
      acknowledgedAt: null,
    };
    const result = await client.query(
      "UPDATE sc_profile SET data=$1,version=version+1,updated_at=now() WHERE user_id=$2 AND version=$3 RETURNING version",
      [JSON.stringify(data), actor.id, input.version],
    );
    if (!result.rowCount) throw new ServiceError("profile_conflict", 409);
    await audit(client, actor, "profile.updated", actor.id, {
      fields: Object.keys(profile),
    });
    return result.rows[0];
  });
}
async function validSaved(kind: string, itemId: string, actor?: Actor) {
  if (kind === "inspiration" && ["slow", "taste", "together"].includes(itemId))
    return;
  const content = publicContent(await getContent());
  if (kind === "offer" && actor && !actor.demo) {
    const raw = (await getContent()).offers.find((o) => o.id === itemId);
    if (raw && (raw.membersOnly || raw.tiers.length)) {
      const info = await account(actor);
      if (offerEligibility(raw, localDay(), info.membership) === "eligible")
        return;
    }
  }
  const list =
    kind === "article"
      ? content.articles
      : kind === "event"
        ? content.events
        : kind === "experience"
          ? content.experiences
          : kind === "offer"
            ? content.offers
            : [];
  if (!list.some((i) => i.id === itemId))
    throw new ServiceError("item_not_available", 404);
}
export async function saveItem(actor: Actor, input: any) {
  if (typeof input.itemId !== "string" || input.itemId.length > 100)
    throw new ServiceError("invalid_item");
  await validSaved(input.kind, input.itemId, actor);
  if (input.remove === true)
    await getPool().query(
      "DELETE FROM sc_saved WHERE user_id=$1 AND kind=$2 AND item_id=$3",
      [actor.id, input.kind, input.itemId],
    );
  else {
    const metadata: Record<string, unknown> = {};
    if (input.stayId) {
      const { rowCount } = await getPool().query(
        "SELECT id FROM sc_stay WHERE id=$1 AND guest_id=$2 AND tenant_id=$3 AND status<>'cancelled'",
        [input.stayId, actor.id, actor.tenant],
      );
      if (!rowCount) throw new ServiceError("stay_not_found", 404);
      metadata.stayId = input.stayId;
    }
    if (input.progress !== undefined) {
      if (
        typeof input.progress !== "number" ||
        !Number.isFinite(input.progress) ||
        input.progress < 0 ||
        input.progress > 1
      )
        throw new ServiceError("invalid_progress");
      metadata.progress = input.progress;
    }
    await getPool().query(
      "INSERT INTO sc_saved(user_id,kind,item_id,data) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,kind,item_id) DO UPDATE SET data=sc_saved.data||EXCLUDED.data",
      [actor.id, input.kind, input.itemId, JSON.stringify(metadata)],
    );
  }
  return { saved: input.remove !== true };
}
export async function importNotebook(actor: Actor, input: any) {
  const pairs: Array<[string, string]> = [];
  for (const [key, kind] of [
    ["articles", "article"],
    ["events", "event"],
    ["experiences", "experience"],
    ["offers", "offer"],
  ] as const) {
    const values = input[key] ?? [];
    if (!Array.isArray(values) || values.length > 300)
      throw new ServiceError("invalid_import");
    for (const item of new Set(values)) {
      if (typeof item !== "string") throw new ServiceError("invalid_import");
      await validSaved(kind, item, actor);
      pairs.push([kind, item]);
    }
  }
  const stay = input.stay ? planSchema.parse(input.stay) : null;
  return transaction(async (client) => {
    for (const [kind, item] of pairs)
      await client.query(
        "INSERT INTO sc_saved(user_id,kind,item_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [actor.id, kind, item],
      );
    if (stay) {
      const fingerprint = "device:" + digest(JSON.stringify(stay));
      await client.query(
        "INSERT INTO sc_stay(id,tenant_id,guest_id,property,arrival,departure,status,source,reference,data) VALUES($1,$2,$3,$4,$5,$6,'project','device-import',$7,$8) ON CONFLICT(tenant_id,source,reference) DO NOTHING",
        [
          id(),
          actor.tenant,
          actor.id,
          stay.property,
          stay.arrival || null,
          stay.departure || null,
          actor.id + fingerprint,
          JSON.stringify({ notes: stay.notes }),
        ],
      );
    }
    if (
      typeof input.inspiration === "string" &&
      ["slow", "taste", "together"].includes(input.inspiration)
    )
      await client.query(
        "INSERT INTO sc_saved(user_id,kind,item_id) VALUES($1,'inspiration',$2) ON CONFLICT DO NOTHING",
        [actor.id, input.inspiration],
      );
    await audit(client, actor, "notebook.imported", actor.id, {
      count: pairs.length,
    });
    return { imported: pairs.length };
  });
}
export async function createPlan(actor: Actor, input: unknown) {
  const plan = planSchema.parse(input),
    stayId = id();
  await getPool().query(
    "INSERT INTO sc_stay(id,tenant_id,guest_id,property,arrival,departure,status,source,data) VALUES($1,$2,$3,$4,$5,$6,'project','guest-project',$7)",
    [
      stayId,
      actor.tenant,
      actor.id,
      plan.property,
      plan.arrival || null,
      plan.departure || null,
      JSON.stringify({ notes: plan.notes }),
    ],
  );
  return { id: stayId, status: "project" };
}
export async function saveTravel(actor: Actor, input: unknown) {
  const parsed = travelPlanSchema.safeParse(input);
  if (!parsed.success) {
    if (
      parsed.error.issues.some(
        (i) => i.code === "custom" && i.path[0] === "itinerary",
      )
    )
      throw new ServiceError("invalid_travel_dates");
    throw parsed.error;
  }
  const data = parsed.data;
  return transaction(async (client) => {
    const {
      rows: [stay],
    } = await client.query(
      "SELECT * FROM sc_stay WHERE id=$1 AND tenant_id=$2 AND guest_id=$3 FOR UPDATE",
      [data.stayId, actor.tenant, actor.id],
    );
    if (!stay) throw new ServiceError("stay_not_found", 404);
    if (stay.status === "cancelled")
      throw new ServiceError("stay_not_available", 409);
    const day = (value: unknown) =>
      value ? new Date(value as string).toISOString().slice(0, 10) : undefined;
    if (
      (data.itinerary.arrival &&
        day(stay.departure) &&
        data.itinerary.arrival.date > day(stay.departure)!) ||
      (data.itinerary.departure &&
        day(stay.arrival) &&
        data.itinerary.departure.date < day(stay.arrival)!)
    )
      throw new ServiceError("invalid_travel_dates");
    const result =
      data.version === 0
        ? await client.query(
            'INSERT INTO sc_travel(stay_id,tenant_id,guest_id,itinerary) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING version,updated_at AS "updatedAt"',
            [
              data.stayId,
              actor.tenant,
              actor.id,
              JSON.stringify(data.itinerary),
            ],
          )
        : await client.query(
            'UPDATE sc_travel SET itinerary=$1,version=version+1,updated_at=now() WHERE stay_id=$2 AND tenant_id=$3 AND guest_id=$4 AND version=$5 RETURNING version,updated_at AS "updatedAt"',
            [
              JSON.stringify(data.itinerary),
              data.stayId,
              actor.tenant,
              actor.id,
              data.version,
            ],
          );
    if (!result.rowCount) throw new ServiceError("travel_conflict", 409);
    await audit(client, actor, "travel.updated", data.stayId, {
      version: result.rows[0].version,
      legs: Object.keys(data.itinerary),
    });
    return {
      stayId: data.stayId,
      itinerary: data.itinerary,
      ...result.rows[0],
    };
  });
}
export async function createRequest(actor: Actor, input: unknown) {
  const data = requestSchema.parse(input);
  if (data.date && data.date < localDay())
    throw new ServiceError("date_in_past");
  const content = publicContent(await getContent());
  if (
    data.kind === "experience" &&
    !content.experiences.some(
      (e) => e.id === data.itemId && e.availability !== "unavailable",
    )
  )
    throw new ServiceError("experience_unavailable", 404);
  if (data.kind === "offer") {
    const offer = (await getContent()).offers.find((o) => o.id === data.itemId),
      info = await account(actor);
    const stay = data.stayId
      ? info.stays.find((s: any) => s.id === data.stayId)
      : undefined;
    const dateString = (d: any) =>
      d ? new Date(d).toISOString().slice(0, 10) : undefined;
    if (
      !offer ||
      (actor.demo && (offer.membersOnly || offer.tiers.length > 0)) ||
      offerEligibility(offer, localDay(), info.membership, {
        arrival: dateString(stay?.arrival) || data.date,
        departure: dateString(stay?.departure),
      }) !== "eligible"
    )
      throw new ServiceError("offer_not_eligible", 410);
  }
  return transaction(async (client) => {
    if (data.stayId) {
      const { rowCount, rows } = await client.query(
        "SELECT * FROM sc_stay WHERE id=$1 AND tenant_id=$2 AND guest_id=$3 AND status <> 'cancelled'",
        [data.stayId, actor.tenant, actor.id],
      );
      if (!rowCount) throw new ServiceError("stay_not_found", 404);
      if (
        data.kind === "transport" &&
        (rows[0].status === "completed" ||
          (rows[0].departure &&
            new Date(rows[0].departure).toISOString().slice(0, 10) <
              localDay()))
      )
        throw new ServiceError("stay_not_available", 409);
    }
    const requestId = id(),
      status = data.saveDraft ? "draft" : "sent";
    const inserted = await client.query(
      "INSERT INTO sc_request(id,tenant_id,guest_id,stay_id,kind,item_id,status,details,contact_email,surprise,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(guest_id,idempotency_key) DO NOTHING RETURNING id,status",
      [
        requestId,
        actor.tenant,
        actor.id,
        data.stayId || null,
        data.kind,
        data.itemId || null,
        status,
        JSON.stringify(data),
        data.surprise ? data.authorisedContact : actor.email,
        data.surprise,
        data.idempotencyKey,
      ],
    );
    if (!inserted.rowCount) {
      const previous = await client.query(
        "SELECT id,status,details FROM sc_request WHERE guest_id=$1 AND idempotency_key=$2",
        [actor.id, data.idempotencyKey],
      );
      if (
        !isDeepStrictEqual(
          previous.rows[0].details,
          JSON.parse(JSON.stringify(data)),
        )
      )
        throw new ServiceError("idempotency_conflict", 409);
      return { id: previous.rows[0].id, status: previous.rows[0].status };
    }
    await client.query(
      "INSERT INTO sc_request_update(id,request_id,actor_id,status,message) VALUES($1,$2,$3,$4,$5)",
      [id(), requestId, actor.id, status, ""],
    );
    await audit(client, actor, "request.created", requestId, {
      kind: data.kind,
      status,
    });
    return inserted.rows[0];
  });
}
export async function updateRequest(
  actor: Actor,
  requestId: string,
  input: any,
) {
  const status = String(input.status),
    message = String(input.message || "")
      .trim()
      .slice(0, 5000);
  return transaction(async (client) => {
    const {
      rows: [r],
    } = await client.query(
      "SELECT * FROM sc_request WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
      [requestId, actor.tenant],
    );
    if (!r) throw new ServiceError("request_not_found", 404);
    const owner = r.guest_id === actor.id;
    if (!owner) requireRole(actor, "concierge");
    const revisingTransport =
      status === r.status &&
      status === "confirmed" &&
      r.kind === "transport" &&
      input.transportConfirmation !== undefined;
    if (revisingTransport) requireRole(actor, "concierge");
    if (status === r.status && message && !revisingTransport) {
      await client.query(
        "INSERT INTO sc_request_update(id,request_id,actor_id,status,message) VALUES($1,$2,$3,$4,$5)",
        [id(), requestId, actor.id, status, message],
      );
      await audit(client, actor, "request.reply", requestId);
      return { id: requestId, status };
    }
    if (
      owner &&
      !actor.roles.includes("admin") &&
      !actor.roles.includes("concierge") &&
      !["sent", "cancelled"].includes(status)
    )
      throw new ServiceError("staff_access_required", 403);
    if (!revisingTransport && !requestTransitions[r.status]?.includes(status))
      throw new ServiceError("invalid_transition", 409);
    if ((!owner || revisingTransport) && !message)
      throw new ServiceError("response_required");
    if (
      status === "confirmed" &&
      !String(input.confirmationReference || "").trim()
    )
      throw new ServiceError("confirmation_reference_required");
    let transportConfirmation:
      ReturnType<typeof transportConfirmationSchema.parse> | undefined;
    if (status === "confirmed" && r.kind === "transport") {
      const checked = transportConfirmationSchema.safeParse(
        input.transportConfirmation,
      );
      if (!checked.success)
        throw new ServiceError("transport_confirmation_required");
      transportConfirmation = checked.data;
      if (transportConfirmation.pickupDate < localDay())
        throw new ServiceError("date_in_past");
    }
    await client.query(
      "UPDATE sc_request SET status=$1,updated_at=now(),details=details||$2::jsonb WHERE id=$3",
      [
        status,
        JSON.stringify(
          status === "confirmed"
            ? {
                confirmationReference: String(
                  input.confirmationReference,
                ).slice(0, 200),
                ...(transportConfirmation ? { transportConfirmation } : {}),
              }
            : {},
        ),
        requestId,
      ],
    );
    await client.query(
      "INSERT INTO sc_request_update(id,request_id,actor_id,status,message) VALUES($1,$2,$3,$4,$5)",
      [id(), requestId, actor.id, status, message],
    );
    if (status === "cancelled") {
      await client.query(
        "SELECT user_id FROM sc_membership WHERE user_id=$1 FOR UPDATE",
        [r.guest_id],
      );
      const { rows } = await client.query(
        "SELECT * FROM sc_points p WHERE tenant_id=$1 AND user_id=$2 AND kind='earned' AND event_key LIKE $3 AND NOT EXISTS(SELECT 1 FROM sc_points r WHERE r.reverses=p.id)",
        [actor.tenant, r.guest_id, `experience:${requestId}:%`],
      );
      for (const point of rows) {
        const {
          rows: [expired],
        } = await client.query(
          "SELECT COALESCE(sum(points),0)::integer AS points FROM sc_points WHERE tenant_id=$1 AND event_key=$2",
          [actor.tenant, "expire:" + point.id],
        );
        const adjustment = -point.points - expired.points;
        if (adjustment)
          await client.query(
            "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,reverses,actor_id) VALUES($1,$2,$3,$4,$5,'reversed','Experience request cancelled',$6,$7) ON CONFLICT DO NOTHING",
            [
              id(),
              actor.tenant,
              r.guest_id,
              "reverse:" + point.id,
              adjustment,
              point.id,
              actor.id,
            ],
          );
      }
    }
    await audit(
      client,
      actor,
      revisingTransport ? "request.transport_revised" : "request." + status,
      requestId,
      revisingTransport
        ? {
            previous: r.details.transportConfirmation,
            current: transportConfirmation,
            previousReference: r.details.confirmationReference,
            reference: String(input.confirmationReference).slice(0, 200),
          }
        : {},
    );
    return { id: requestId, status };
  });
}
export async function replyToRequest(
  actor: Actor,
  requestId: string,
  input: any,
) {
  const message = String(input.message || "").trim();
  if (!message || message.length > 5000)
    throw new ServiceError("message_required");
  return transaction(async (client) => {
    const {
      rows: [r],
    } = await client.query(
      "SELECT guest_id,status FROM sc_request WHERE id=$1 AND tenant_id=$2 FOR UPDATE",
      [requestId, actor.tenant],
    );
    if (!r) throw new ServiceError("request_not_found", 404);
    if (r.guest_id !== actor.id) requireRole(actor, "concierge");
    await client.query(
      "INSERT INTO sc_request_update(id,request_id,actor_id,status,message) VALUES($1,$2,$3,$4,$5)",
      [id(), requestId, actor.id, r.status, message],
    );
    await audit(client, actor, "request.reply", requestId);
    return { saved: true };
  });
}
export async function card(actor: Actor) {
  const info = await account(actor);
  if (!info.membership.active || !info.membership.tier)
    return { membership: info.membership, qr: null };
  const token = randomBytes(32).toString("hex"),
    expiresAt = new Date(Date.now() + 10 * 60000);
  await getPool().query(
    "INSERT INTO sc_card_token(digest,user_id,expires_at) VALUES($1,$2,$3)",
    [digest(token), actor.id, expiresAt],
  );
  return {
    membership: info.membership,
    token: "sanctuario:" + token,
    qr: await QRCode.toDataURL("sanctuario:" + token, {
      margin: 2,
      width: 256,
      errorCorrectionLevel: "M",
    }),
    expiresAt,
  };
}
export async function scanCard(actor: Actor, token: string) {
  requireRole(actor, "concierge", "loyalty");
  if (!/^sanctuario:[a-f0-9]{64}$/.test(token))
    throw new ServiceError("invalid_card", 404);
  const {
    rows: [member],
  } = await getPool().query(
    "SELECT m.user_id,m.member_number,m.tier,u.name,COALESCE((SELECT sum(points) FROM sc_points WHERE user_id=m.user_id),0)::integer AS points FROM sc_card_token t JOIN sc_membership m ON m.user_id=t.user_id JOIN \"user\" u ON u.id=m.user_id JOIN sc_program p ON p.tenant_id=m.tenant_id WHERE t.digest=$1 AND t.expires_at>now() AND t.revoked_at IS NULL AND m.tenant_id=$2 AND m.active AND (p.rules->>'active')::boolean",
    [digest(token.replace("sanctuario:", "")), actor.tenant],
  );
  if (!member) throw new ServiceError("card_expired_or_revoked", 404);
  await transaction((client) =>
    audit(client, actor, "card.scanned", member.user_id),
  );
  return member;
}
export async function changeProgram(actor: Actor, input: any) {
  requireRole(actor, "loyalty");
  const rules = programSchema.parse(input.rules);
  return transaction(async (client) => {
    await client.query(
      "INSERT INTO sc_program(tenant_id) VALUES($1) ON CONFLICT DO NOTHING",
      [actor.tenant],
    );
    const result = await client.query(
      "UPDATE sc_program SET rules=$1,version=version+1 WHERE tenant_id=$2 AND version=$3 RETURNING version",
      [JSON.stringify(rules), actor.tenant, input.version],
    );
    if (!result.rowCount) throw new ServiceError("program_conflict", 409);
    await audit(client, actor, "program.updated", actor.tenant, { rules });
    return result.rows[0];
  });
}
export async function assignTier(actor: Actor, input: any) {
  requireRole(actor, "loyalty");
  if (
    !["Gold", "Platinum", "Black"].includes(input.tier) ||
    !String(input.reason || "").trim()
  )
    throw new ServiceError("tier_and_reason_required");
  return transaction(async (client) => {
    const {
      rows: [program],
    } = await client.query("SELECT rules FROM sc_program WHERE tenant_id=$1", [
      actor.tenant,
    ]);
    if (!program?.rules.active)
      throw new ServiceError("program_not_active", 409);
    const {
      rows: [member],
    } = await client.query(
      "SELECT * FROM sc_membership WHERE user_id=$1 AND tenant_id=$2 FOR UPDATE",
      [input.userId, actor.tenant],
    );
    if (!member) throw new ServiceError("member_not_found", 404);
    await expireLocked(client, actor, input.userId);
    await client.query(
      "UPDATE sc_membership SET tier=$1,active=true,updated_at=now() WHERE user_id=$2",
      [input.tier, input.userId],
    );
    await audit(client, actor, "membership.tier", input.userId, {
      from: member.tier,
      to: input.tier,
      reason: String(input.reason).slice(0, 2000),
    });
    return { tier: input.tier };
  });
}
export async function pointsOperation(actor: Actor, input: any) {
  requireRole(actor, "loyalty");
  return transaction(async (client) => {
    const {
      rows: [member],
    } = await client.query(
      "SELECT * FROM sc_membership WHERE user_id=$1 AND tenant_id=$2 FOR UPDATE",
      [input.userId, actor.tenant],
    );
    if (!member) throw new ServiceError("member_not_found", 404);
    await expireLocked(client, actor, input.userId);
    if (input.reverseId) {
      if (!String(input.reason || "").trim())
        throw new ServiceError("reason_required");
      const {
        rows: [original],
      } = await client.query(
        "SELECT * FROM sc_points WHERE id=$1 AND tenant_id=$2 AND user_id=$3",
        [input.reverseId, actor.tenant, input.userId],
      );
      if (!original || original.kind === "reversed")
        throw new ServiceError("transaction_not_reversible", 409);
      const {
        rows: [expired],
      } = await client.query(
        "SELECT COALESCE(sum(points),0)::integer AS points FROM sc_points WHERE tenant_id=$1 AND event_key=$2",
        [actor.tenant, "expire:" + original.id],
      );
      const reversal = -original.points - expired.points;
      if (!reversal) {
        await audit(
          client,
          actor,
          "points.reversal_already_expired",
          original.id,
        );
        return { alreadyExpired: true };
      }
      const reversed = await client.query(
        "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,stay_id,reverses,actor_id) VALUES($1,$2,$3,$4,$5,'reversed',$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING id,points",
        [
          id(),
          actor.tenant,
          input.userId,
          "reverse:" + original.id,
          reversal,
          String(input.reason).slice(0, 2000),
          original.stay_id,
          original.id,
          actor.id,
        ],
      );
      await audit(client, actor, "points.reversal", original.id);
      return reversed.rows[0] || { duplicate: true };
    }
    const {
      rows: [program],
    } = await client.query("SELECT rules FROM sc_program WHERE tenant_id=$1", [
      actor.tenant,
    ]);
    const rule = program?.rules.operations.find(
      (r: any) => r.id === input.operation,
    );
    if (!program?.rules.active || !member.active || !rule)
      throw new ServiceError("rule_not_active", 409);
    let eventKey: string,
      stayId: string | null = null;
    if (rule.trigger === "completed_stay") {
      const {
        rows: [stay],
      } = await client.query(
        "SELECT * FROM sc_stay WHERE id=$1 AND guest_id=$2 AND tenant_id=$3 AND status='completed' AND imported_at IS NOT NULL",
        [input.stayId, input.userId, actor.tenant],
      );
      if (!stay) throw new ServiceError("validated_stay_required", 409);
      eventKey = `stay:${stay.id}:${rule.id}`;
      stayId = stay.id;
    } else if (rule.trigger === "verified_experience") {
      const {
        rows: [request],
      } = await client.query(
        "SELECT * FROM sc_request WHERE id=$1 AND guest_id=$2 AND tenant_id=$3 AND status='confirmed' AND kind='experience'",
        [input.requestId, input.userId, actor.tenant],
      );
      if (!request)
        throw new ServiceError("confirmed_experience_required", 409);
      eventKey = `experience:${request.id}:${rule.id}`;
    } else {
      if (!/^[a-zA-Z0-9_-]{8,150}$/.test(input.reference || ""))
        throw new ServiceError("verified_redemption_reference_required");
      eventKey = `redemption:${input.reference}:${rule.id}`;
    }
    const previous = await client.query(
      "SELECT id,points FROM sc_points WHERE tenant_id=$1 AND event_key=$2",
      [actor.tenant, eventKey],
    );
    if (previous.rowCount) return { ...previous.rows[0], duplicate: true };
    const points = rule.kind === "used" ? -rule.points : rule.points;
    const {
      rows: [balance],
    } = await client.query(
      "SELECT COALESCE(sum(points),0)::integer AS points FROM sc_points WHERE user_id=$1",
      [input.userId],
    );
    if (points < 0 && balance.points + points < 0)
      throw new ServiceError("insufficient_points", 409);
    const expiresAt =
      points > 0 && program.rules.validityDays
        ? new Date(Date.now() + program.rules.validityDays * 86400000)
        : null;
    const record = await client.query(
      "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,stay_id,actor_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,points",
      [
        id(),
        actor.tenant,
        input.userId,
        eventKey,
        points,
        rule.kind,
        rule.description,
        stayId,
        actor.id,
        expiresAt,
      ],
    );
    await audit(client, actor, "points." + rule.kind, record.rows[0].id, {
      eventKey,
      points,
    });
    return record.rows[0];
  });
}
export async function importStay(actor: Actor, input: any) {
  requireRole(actor, "concierge");
  const plan = planSchema.parse(input);
  if (
    !plan.arrival ||
    !plan.departure ||
    !["confirmed", "completed", "cancelled"].includes(input.status) ||
    !String(input.reference || "").trim() ||
    !String(input.origin || "").trim()
  )
    throw new ServiceError("verified_stay_details_required");
  if (input.status === "completed" && plan.departure > localDay())
    throw new ServiceError("future_stay_cannot_be_completed");
  return transaction(async (client) => {
    const { rowCount } = await client.query(
      "SELECT user_id FROM sc_actor WHERE user_id=$1 AND tenant_id=$2",
      [input.userId, actor.tenant],
    );
    if (!rowCount) throw new ServiceError("guest_not_found", 404);
    const source = String(input.origin).slice(0, 200),
      reference = String(input.reference).slice(0, 200);
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      actor.tenant + source + reference,
    ]);
    await client.query(
      "SELECT user_id FROM sc_membership WHERE user_id=$1 FOR UPDATE",
      [input.userId],
    );
    const existing = await client.query(
      "SELECT id,guest_id FROM sc_stay WHERE tenant_id=$1 AND source=$2 AND reference=$3 FOR UPDATE",
      [actor.tenant, source, reference],
    );
    if (existing.rowCount && existing.rows[0].guest_id !== input.userId)
      throw new ServiceError("reference_already_assigned", 409);
    const stayId = existing.rows[0]?.id || id();
    await client.query(
      "INSERT INTO sc_stay(id,tenant_id,guest_id,property,arrival,departure,status,source,reference,imported_at,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,arrival=EXCLUDED.arrival,departure=EXCLUDED.departure,imported_at=now(),data=EXCLUDED.data",
      [
        stayId,
        actor.tenant,
        input.userId,
        plan.property,
        plan.arrival,
        plan.departure,
        input.status,
        source,
        reference,
        JSON.stringify({ notes: plan.notes, verifiedBy: actor.id }),
      ],
    );
    if (input.status === "cancelled") {
      const earned = await client.query(
        "SELECT * FROM sc_points p WHERE stay_id=$1 AND kind='earned' AND NOT EXISTS(SELECT 1 FROM sc_points r WHERE r.reverses=p.id)",
        [stayId],
      );
      for (const p of earned.rows) {
        const {
          rows: [expired],
        } = await client.query(
          "SELECT COALESCE(sum(points),0)::integer AS points FROM sc_points WHERE tenant_id=$1 AND event_key=$2",
          [actor.tenant, "expire:" + p.id],
        );
        const adjustment = -p.points - expired.points;
        if (adjustment)
          await client.query(
            "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,stay_id,reverses,actor_id) VALUES($1,$2,$3,$4,$5,'reversed','Stay cancelled',$6,$7,$8) ON CONFLICT DO NOTHING",
            [
              id(),
              actor.tenant,
              input.userId,
              "reverse:" + p.id,
              adjustment,
              stayId,
              p.id,
              actor.id,
            ],
          );
      }
    }
    await audit(client, actor, "stay.imported", stayId, {
      source,
      reference,
      status: input.status,
    });
    return { id: stayId, status: input.status };
  });
}
export async function staffData(actor: Actor) {
  requireRole(actor, "editor", "concierge", "loyalty");
  const admin = actor.roles.includes("admin"),
    canGuests = admin || actor.roles.includes("concierge"),
    canLoyalty = admin || actor.roles.includes("loyalty");
  const guests =
    canGuests || canLoyalty
      ? (
          await getPool().query(
            'SELECT u.id,u.name,u.email,m.member_number,m.tier,m.active FROM sc_actor a JOIN "user" u ON u.id=a.user_id LEFT JOIN sc_membership m ON m.user_id=u.id WHERE a.tenant_id=$1 ORDER BY u.name',
            [actor.tenant],
          )
        ).rows
      : [];
  const requests = canGuests
    ? (
        await getPool().query(
          'SELECT r.*,u.name,t.itinerary AS travel_itinerary FROM sc_request r JOIN "user" u ON u.id=r.guest_id LEFT JOIN sc_travel t ON t.stay_id=r.stay_id AND t.guest_id=r.guest_id AND t.tenant_id=r.tenant_id WHERE r.tenant_id=$1 ORDER BY r.created_at DESC LIMIT 200',
          [actor.tenant],
        )
      ).rows
    : [];
  const program = canLoyalty
    ? (
        await getPool().query(
          "SELECT rules,version FROM sc_program WHERE tenant_id=$1",
          [actor.tenant],
        )
      ).rows[0] || { rules: defaultProgram(), version: 1 }
    : null;
  const auditEntries = admin
    ? (
        await getPool().query(
          "SELECT action,entity_id,data,created_at FROM sc_audit WHERE tenant_id=$1 ORDER BY id DESC LIMIT 100",
          [actor.tenant],
        )
      ).rows
    : [];
  const roles = admin
    ? (
        await getPool().query(
          'SELECT a.user_id,a.roles,u.email FROM sc_actor a JOIN "user" u ON u.id=a.user_id WHERE a.tenant_id=$1',
          [actor.tenant],
        )
      ).rows
    : [];
  return {
    actor,
    guests,
    requests,
    program,
    audit: auditEntries,
    staff: roles,
  };
}
export async function guestDetail(actor: Actor, userId: string) {
  requireRole(actor, "concierge", "loyalty");
  const { rowCount } = await getPool().query(
    "SELECT user_id FROM sc_actor WHERE user_id=$1 AND tenant_id=$2",
    [userId, actor.tenant],
  );
  if (!rowCount) throw new ServiceError("guest_not_found", 404);
  const {
    rows: [p],
  } = await getPool().query(
    "SELECT data,updated_at FROM sc_profile WHERE user_id=$1",
    [userId],
  );
  const data = { ...p?.data };
  if (!actor.roles.some((r) => ["admin", "concierge"].includes(r)))
    for (const key of Object.keys(data)) delete data[key];
  if (!["concierge", "kitchen"].includes(data.allergySharing))
    delete data.allergies;
  delete data.communications;
  const stays = (
    await getPool().query(
      "SELECT * FROM sc_stay WHERE tenant_id=$1 AND guest_id=$2 ORDER BY arrival DESC",
      [actor.tenant, userId],
    )
  ).rows;
  const points = (
    await getPool().query(
      "SELECT id,points,kind,reason,stay_id,created_at FROM sc_points WHERE tenant_id=$1 AND user_id=$2 ORDER BY created_at DESC",
      [actor.tenant, userId],
    )
  ).rows;
  const travelPlans = actor.roles.some((r) =>
    ["admin", "concierge"].includes(r),
  )
    ? (
        await getPool().query(
          'SELECT stay_id AS "stayId",itinerary,version,updated_at AS "updatedAt" FROM sc_travel WHERE tenant_id=$1 AND guest_id=$2 ORDER BY updated_at DESC',
          [actor.tenant, userId],
        )
      ).rows
    : [];
  await transaction((client) =>
    audit(client, actor, "guest.consulted", userId),
  );
  return {
    profile: data,
    updatedAt: p?.updated_at,
    stays,
    points,
    travelPlans,
  };
}
export async function editorial(actor: Actor) {
  requireRole(actor, "editor");
  const result = await getPool().query(
    "SELECT content,version FROM sc_editorial WHERE tenant_id=$1",
    [actor.tenant],
  );
  return (
    result.rows[0] || {
      content: actor.demo
        ? contentSchema.parse(editorialSeed)
        : await getContent(),
      version: 0,
    }
  );
}
export async function saveEditorial(actor: Actor, input: any) {
  requireRole(actor, "editor");
  const content = contentSchema.parse(input.content);
  return transaction(async (client) => {
    if (input.version === 0) {
      const result = await client.query(
        "INSERT INTO sc_editorial(tenant_id,content) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING version",
        [actor.tenant, JSON.stringify(content)],
      );
      if (!result.rowCount) throw new ServiceError("editorial_conflict", 409);
      await audit(client, actor, "editorial.saved", actor.tenant);
      return result.rows[0];
    }
    const result = await client.query(
      "UPDATE sc_editorial SET content=$1,version=version+1,updated_at=now() WHERE tenant_id=$2 AND version=$3 RETURNING version",
      [JSON.stringify(content), actor.tenant, input.version],
    );
    if (!result.rowCount) throw new ServiceError("editorial_conflict", 409);
    await audit(client, actor, "editorial.saved", actor.tenant);
    return result.rows[0];
  });
}
export async function setStaffRoles(actor: Actor, input: any) {
  requireRole(actor); // Administration only.
  if (
    !Array.isArray(input.roles) ||
    input.roles.some(
      (r: string) => !["admin", "editor", "concierge", "loyalty"].includes(r),
    )
  )
    throw new ServiceError("invalid_roles");
  return transaction(async (client) => {
    const {
      rows: [u],
    } = await client.query(
      'SELECT u.id FROM "user" u JOIN sc_actor a ON a.user_id=u.id WHERE lower(u.email)=lower($1) AND u."emailVerified" AND a.tenant_id=$2',
      [input.email, actor.tenant],
    );
    if (!u) throw new ServiceError("verified_account_required", 404);
    if (u.id === actor.id && !input.roles.includes("admin"))
      throw new ServiceError("cannot_remove_own_admin", 409);
    await client.query("UPDATE sc_actor SET roles=$1 WHERE user_id=$2", [
      input.roles,
      u.id,
    ]);
    await audit(client, actor, "staff.roles", u.id, { roles: input.roles });
    return { updated: true };
  });
}
