import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startDemo } from "../../src/lib/demo";
import { getPool } from "../../src/lib/db";
import { type Actor } from "../../src/lib/auth";
import * as circle from "../../src/lib/circle";
import { localDay, plusDays } from "../../src/lib/travel";
import { contentSchema } from "../../src/lib/schema";
import { getContent, publicContent } from "../../src/lib/content";
import seed from "../../src/data/journal.json";
if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    "Integration tests require a dedicated local PostgreSQL database.",
  );
async function sandbox() {
  const response = await startDemo(
    new Request("http://127.0.0.1:4321/api/v2/demo"),
    "guest",
  );
  assert.equal(response.status, 200);
  const { user } = await response.json();
  const {
    rows: [a],
  } = await getPool().query("SELECT tenant_id FROM sc_actor WHERE user_id=$1", [
    user.id,
  ]);
  assert.ok(a.tenant_id.startsWith("demo:"));
  const {
    rows: [staff],
  } = await getPool().query(
    "SELECT u.id,u.name,u.email,a.roles FROM sc_actor a JOIN \"user\" u ON u.id=a.user_id WHERE tenant_id=$1 AND 'admin'=ANY(roles)",
    [a.tenant_id],
  );
  const guest: Actor = {
    id: user.id,
    name: user.name,
    email: user.email,
    tenant: a.tenant_id,
    roles: [],
    demo: true,
  };
  return {
    guest,
    staff: { ...staff, tenant: a.tenant_id, demo: true } as Actor,
  };
}
after(async () => {
  await getPool().end();
});
test("public catalogues and demo editors never expose the house’s private offers or unpublished drafts", async () => {
  const { guest, staff } = await sandbox();
  const original = (
    await getPool().query(
      "SELECT content FROM sc_editorial WHERE tenant_id='hotel'",
    )
  ).rows[0];
  if (original)
    throw Error(
      "This isolation test requires the dedicated empty local hotel edition.",
    );
  const content = contentSchema.parse(seed),
    pair = { en: "Private offer fixture", es: "Oferta privada de prueba" };
  content.offers.push({
    id: "private-fixture",
    status: "published",
    title: pair,
    intro: pair,
    body: pair,
    image: "/assets/hero.jpg",
    imageCredit: "La Casa Que Canta",
    imageAlt: pair,
    bookingStart: "2020-01-01",
    bookingEnd: "2099-01-01",
    stayStart: "2020-01-01",
    stayEnd: "2099-01-01",
    conditions: pair,
    exclusions: pair,
    currency: "USD",
    membersOnly: true,
    tiers: ["Gold"],
    relatedIds: [],
  });
  const draft = structuredClone(content.articles[0]);
  draft.id = "private-draft-fixture";
  draft.status = "draft";
  content.articles.push(draft);
  await getPool().query(
    "INSERT INTO sc_editorial(tenant_id,content) VALUES('hotel',$1)",
    [JSON.stringify(content)],
  );
  try {
    const publicEdition = publicContent(await getContent());
    assert.equal(publicEdition.offers.length, 0);
    assert.equal(
      publicEdition.articles.some((a) => a.id === "private-draft-fixture"),
      false,
    );
    const demo = await circle.editorial(staff);
    assert.equal(demo.content.offers.length, 0);
    assert.equal(
      demo.content.articles.some((a: any) => a.id === "private-draft-fixture"),
      false,
    );
    await assert.rejects(
      () =>
        circle.createRequest(guest, {
          kind: "offer",
          itemId: "private-fixture",
          message: "Attempt to claim a real member offer from a demo",
          idempotencyKey: randomUUID(),
        }),
      /offer_not_eligible/,
    );
  } finally {
    await getPool().query("DELETE FROM sc_editorial WHERE tenant_id='hotel'");
  }
});
test("private profiles persist, version conflicts are rejected, sharing and role boundaries are enforced", async () => {
  const { guest, staff } = await sandbox(),
    other = await sandbox();
  let a = await circle.account(guest);
  await circle.saveProfile(guest, {
    profile: {
      ...a.profile,
      interests: ["gastronomy"],
      dietary: ["gluten-free"],
      allergies: "Sesame",
      allergySharing: "private",
    },
    version: a.profileVersion,
  });
  a = await circle.account(guest);
  assert.deepEqual(a.profile.dietary, ["gluten-free"]);
  assert.equal(a.profile.allergies, "Sesame");
  assert.equal(
    (await circle.guestDetail(staff, guest.id)).profile.allergies,
    undefined,
  );
  await assert.rejects(
    () => circle.guestDetail(guest, other.guest.id),
    /staff_access_required/,
  );
  await assert.rejects(
    () => circle.guestDetail(staff, other.guest.id),
    /guest_not_found/,
  );
  const { allergyUpdatedAt, acknowledgedAt, ...editable } = a.profile;
  await assert.rejects(
    () => circle.saveProfile(guest, { profile: editable, version: 1 }),
    /profile_conflict/,
  );
  await circle.saveProfile(guest, {
    profile: { ...editable, allergies: "", allergySharing: "private" },
    version: a.profileVersion,
  });
  assert.equal((await circle.account(guest)).profile.allergies, "");
  const editor = { ...staff, roles: ["editor"] };
  await assert.rejects(
    () => circle.guestDetail(editor, guest.id),
    /staff_access_required/,
  );
});
test("notebook imports merge without duplicates, and stay projects cannot award points", async () => {
  const { guest, staff } = await sandbox();
  await Promise.all(
    Array.from({ length: 8 }, () =>
      circle.importNotebook(guest, {
        articles: ["chef", "chef"],
        events: ["sail"],
        stay: {
          property: "La Casa Que Canta",
          arrival: "2099-01-01",
          departure: "2099-01-04",
          notes: "A return project",
        },
      }),
    ),
  );
  const a = await circle.account(guest);
  assert.equal(a.saved.length, 2);
  assert.equal(a.stays.filter((s) => s.status === "project").length, 1);
  await assert.rejects(
    () =>
      circle.pointsOperation(staff, {
        userId: guest.id,
        operation: "demo-stay",
        stayId: a.stays.find((s) => s.status === "project")!.id,
      }),
    /validated_stay_required/,
  );
});
test("concurrent enquiries get one real ID, preserve surprise contact and require a staff confirmation reference", async () => {
  const { guest, staff } = await sandbox(),
    other = await sandbox();
  const input = {
    kind: "moment",
    message: "A surprise anniversary",
    surprise: true,
    authorisedContact: "organiser@example.com",
    idempotencyKey: randomUUID(),
  };
  const results = await Promise.all(
    Array.from({ length: 8 }, () => circle.createRequest(guest, input)),
  );
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  const id = results[0].id;
  await assert.rejects(
    () =>
      circle.createRequest(guest, { ...input, message: "Different request" }),
    /idempotency_conflict/,
  );
  await assert.rejects(
    () =>
      circle.updateRequest(guest, id, {
        status: "confirmed",
        confirmationReference: "fake",
      }),
    /staff_access_required/,
  );
  await assert.rejects(
    () => circle.updateRequest(other.guest, id, { status: "cancelled" }),
    /request_not_found/,
  );
  await assert.rejects(
    () =>
      circle.updateRequest(staff, id, {
        status: "confirmed",
        message: "Confirmed",
      }),
    /confirmation_reference_required/,
  );
  await circle.updateRequest(staff, id, {
    status: "pending",
    message: "We are checking your wishes.",
  });
  await circle.replyToRequest(guest, id, {
    message: "Thank you, contact only the organiser.",
  });
  const r = (await circle.account(guest)).requests.find((r) => r.id === id)!;
  assert.equal(r.contact_email, "organiser@example.com");
  assert.equal(r.status, "pending");
  assert.equal(r.history.length, 3);
});
test("personal QR codes reveal no profile publicly and revoked or cross-sandbox tokens fail", async () => {
  const { guest, staff } = await sandbox(),
    other = await sandbox();
  const c = await circle.card(guest);
  assert.ok(c.token && !c.token.includes(guest.email));
  assert.ok(c.qr?.startsWith("data:image/png"));
  await assert.rejects(
    () => circle.scanCard(guest, c.token!),
    /staff_access_required/,
  );
  await assert.rejects(
    () => circle.scanCard(other.staff, c.token!),
    /card_expired_or_revoked/,
  );
  const before = (await circle.account(guest)).membership.points;
  const member = await circle.scanCard(staff, c.token!);
  assert.equal(member.tier, "Gold");
  assert.equal("profile" in member, false);
  await circle.scanCard(staff, c.token!);
  assert.equal((await circle.account(guest)).membership.points, before);
  await getPool().query(
    "UPDATE sc_card_token SET revoked_at=now() WHERE user_id=$1",
    [guest.id],
  );
  await assert.rejects(
    () => circle.scanCard(staff, c.token!),
    /card_expired_or_revoked/,
  );
});
test("parallel imports and credits are idempotent; cancellation appends one reversal; ledger is immutable", async () => {
  const { guest, staff } = await sandbox(),
    today = localDay();
  const input = {
    userId: guest.id,
    property: "La Casa Que Canta",
    arrival: plusDays(today, -20),
    departure: plusDays(today, -15),
    status: "completed",
    reference: randomUUID(),
    origin: "isolated-test",
    notes: "Verified fixture",
  };
  const stays = await Promise.all(
    Array.from({ length: 6 }, () => circle.importStay(staff, input)),
  );
  assert.equal(new Set(stays.map((s) => s.id)).size, 1);
  const stayId = stays[0].id;
  const credits = await Promise.all(
    Array.from({ length: 10 }, () =>
      circle.pointsOperation(staff, {
        userId: guest.id,
        operation: "demo-stay",
        stayId,
      }),
    ),
  );
  assert.equal(new Set(credits.map((c) => c.id)).size, 1);
  assert.equal((await circle.account(guest)).membership.points, 200);
  await Promise.all(
    Array.from({ length: 3 }, () =>
      circle.importStay(staff, { ...input, status: "cancelled" }),
    ),
  );
  const a = await circle.account(guest);
  assert.equal(a.membership.points, 100);
  assert.equal(
    a.points.filter((p) => p.stay_id === stayId && p.kind === "reversed")
      .length,
    1,
  );
  await assert.rejects(
    () =>
      getPool().query("UPDATE sc_points SET points=999 WHERE id=$1", [
        credits[0].id,
      ]),
    /Append-only/,
  );
});
test("points expire once and an expired earning is not deducted twice when reversed", async () => {
  const { guest, staff } = await sandbox();
  const pointId = randomUUID();
  await getPool().query(
    "INSERT INTO sc_points(id,tenant_id,user_id,event_key,points,kind,reason,actor_id,expires_at) VALUES($1,$2,$3,$4,20,'earned','Expired test fixture',$5,now()-interval '1 day')",
    [pointId, guest.tenant, guest.id, randomUUID(), staff.id],
  );
  const a = await circle.account(guest);
  assert.equal(a.membership.points, 100);
  await circle.account(guest);
  assert.equal(
    (
      await getPool().query("SELECT id FROM sc_points WHERE event_key=$1", [
        "expire:" + pointId,
      ])
    ).rowCount,
    1,
  );
  await circle.pointsOperation(staff, {
    userId: guest.id,
    reverseId: pointId,
    reason: "Test expired reversal",
  });
  assert.equal((await circle.account(guest)).membership.points, 100);
});
test("editorial updates are isolated and optimistic locking preserves other editors’ changes", async () => {
  const { guest, staff } = await sandbox();
  await assert.rejects(() => circle.editorial(guest), /staff_access_required/);
  const e = await circle.editorial(staff);
  e.content.experiences[0].title.en = "An isolated demonstration edit";
  const saved = await circle.saveEditorial(staff, {
    content: e.content,
    version: e.version,
  });
  assert.equal(saved.version, 1);
  await assert.rejects(
    () => circle.saveEditorial(staff, { content: e.content, version: 0 }),
    /editorial_conflict/,
  );
  assert.equal(
    (await circle.editorial(staff)).content.experiences[0].title.en,
    "An isolated demonstration edit",
  );
});
