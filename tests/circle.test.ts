import { test } from "node:test";
import assert from "node:assert/strict";
import {
  profileSchema,
  programSchema,
  offerEligibility,
  requestSchema,
  defaultProgram,
} from "../src/lib/circle-schema";
import { unspentLots } from "../src/lib/points-expiry";
test("optional dietary data is separate from allergies and cannot set server-controlled entitlements", () => {
  const p = profileSchema.parse({
    language: "es",
    interests: ["sea"],
    dietary: ["gluten-free"],
  });
  assert.equal(p.allergies, "");
  assert.equal(p.allergySharing, "private");
  assert.equal(p.communications.email, false);
  assert.equal(
    profileSchema.safeParse({ ...p, tier: "Black", points: 9999 }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...p, dietary: ["an-inferred-allergy"] }).success,
    false,
  );
});
test("an unconfigured programme promises no tier or benefit and cannot be activated without real rules", () => {
  const p = defaultProgram();
  assert.equal(p.active, false);
  assert.deepEqual(p.benefits, []);
  assert.equal(programSchema.safeParse({ ...p, active: true }).success, false);
});
test("offer eligibility enforces date, membership, tier and stay windows on the server", () => {
  const offer = {
    status: "published",
    bookingStart: "2026-11-01",
    bookingEnd: "2026-12-01",
    stayStart: "2026-12-01",
    stayEnd: "2027-01-31",
    membersOnly: true,
    tiers: ["Black"],
  };
  assert.equal(offerEligibility(offer, "2026-12-02"), "expired");
  assert.equal(offerEligibility(offer, "2026-10-01"), "not_open");
  assert.equal(offerEligibility(offer, "2026-11-22"), "members_only");
  assert.equal(
    offerEligibility(offer, "2026-11-22", { active: true, tier: "Gold" }),
    "tier_required",
  );
  assert.equal(
    offerEligibility(
      offer,
      "2026-11-22",
      { active: true, tier: "Black" },
      { arrival: "2027-02-01" },
    ),
    "stay_dates",
  );
  assert.equal(
    offerEligibility(
      offer,
      "2026-11-22",
      { active: true, tier: "Black" },
      { arrival: "2026-12-20", departure: "2026-12-25" },
    ),
    "eligible",
  );
});
test("surprises require an explicit authorised contact and request IDs are idempotency keys", () => {
  const data = {
    kind: "moment",
    message: "A private anniversary enquiry",
    idempotencyKey: crypto.randomUUID(),
    surprise: true,
  };
  assert.equal(requestSchema.safeParse(data).success, false);
  assert.equal(
    requestSchema.safeParse({
      ...data,
      authorisedContact: "organiser@example.com",
    }).success,
    true,
  );
});
test("expiry reconstructs unspent points, respects reversals and carries correction debt", () => {
  const rows = [
    {
      id: "a",
      points: 100,
      kind: "earned",
      event_key: "a",
      expires_at: "2020-01-01",
    },
    { id: "b", points: -40, kind: "used", event_key: "b" },
    { id: "c", points: 20, kind: "earned", event_key: "c" },
  ];
  assert.deepEqual(
    unspentLots(rows).map((x) => x.remaining),
    [60, 20],
  );
  const expired = [
    ...rows,
    { id: "d", points: -60, kind: "expired", event_key: "expire:a" },
  ];
  assert.deepEqual(
    unspentLots(expired).map((x) => x.remaining),
    [0, 20],
  );
  const debt = [
    ...rows,
    {
      id: "d",
      points: -100,
      kind: "reversed",
      event_key: "reverse:a",
      reverses: "a",
    },
    { id: "e", points: 50, kind: "earned", event_key: "e" },
  ];
  assert.deepEqual(
    unspentLots(debt).map((x) => x.remaining),
    [0, 0, 30],
  );
});
