import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startDemo } from "../../src/lib/demo";
import { getPool } from "../../src/lib/db";
import type { Actor } from "../../src/lib/auth";
import * as circle from "../../src/lib/circle";
import { plusDays } from "../../src/lib/travel";

if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    "Travel integration tests require a dedicated local PostgreSQL database.",
  );
after(async () => {
  await getPool().end();
});
async function sandbox() {
  const response = await startDemo(
    new Request("http://127.0.0.1:4321/api/v2/demo"),
    "guest",
  );
  assert.equal(response.status, 200);
  const { user } = await response.json();
  const {
    rows: [record],
  } = await getPool().query("SELECT tenant_id FROM sc_actor WHERE user_id=$1", [
    user.id,
  ]);
  assert.ok(record.tenant_id.startsWith("demo:"));
  const {
    rows: [staff],
  } = await getPool().query(
    "SELECT u.id,u.name,u.email,a.roles FROM sc_actor a JOIN \"user\" u ON u.id=a.user_id WHERE a.tenant_id=$1 AND 'admin'=ANY(a.roles)",
    [record.tenant_id],
  );
  const guest: Actor = {
    id: user.id,
    name: user.name,
    email: user.email,
    tenant: record.tenant_id,
    roles: [],
    demo: true,
  };
  const account = await circle.account(guest),
    stay = account.stays.find((s: any) => s.status === "confirmed")!;
  const date = (value: Date | string) =>
    new Date(value).toISOString().slice(0, 10);
  const itinerary = {
    arrival: {
      airline: "Example airline",
      number: "AM205",
      date: date(stay.arrival),
      time: "14:35",
      airport: "ZIH",
      route: "LAX",
    },
    departure: {
      airline: "Example airline",
      number: "AM206",
      date: date(stay.departure),
      time: "12:10",
      airport: "ZIH",
      route: "LAX",
    },
  };
  return {
    guest,
    staff: { ...staff, tenant: record.tenant_id, demo: true } as Actor,
    stay,
    itinerary,
  };
}
test("flight details persist for their owner and reject cross-account edits or stale concurrent versions", async () => {
  const { guest, stay, itinerary } = await sandbox(),
    other = await sandbox();
  const saved = await circle.saveTravel(guest, {
    stayId: stay.id,
    itinerary,
    version: 0,
  });
  assert.equal(saved.version, 1);
  const account = await circle.account(guest);
  const persisted = account.travelPlans.find((p: any) => p.stayId === stay.id)!;
  assert.equal(persisted.itinerary.arrival.number, "AM205");
  assert.equal(persisted.itinerary.departure.airport, "ZIH");
  assert.equal(
    (await circle.account(other.guest)).travelPlans.some(
      (p: any) => p.stayId === stay.id,
    ),
    false,
  );
  await assert.rejects(
    () =>
      circle.saveTravel(other.guest, {
        stayId: stay.id,
        itinerary,
        version: 1,
      }),
    /stay_not_found/,
  );
  await assert.rejects(
    () => circle.saveTravel(guest, { stayId: stay.id, itinerary, version: 0 }),
    /travel_conflict/,
  );
  const results = await Promise.allSettled(
    ["AM301", "AM302"].map((number) =>
      circle.saveTravel(guest, {
        stayId: stay.id,
        itinerary: { ...itinerary, arrival: { ...itinerary.arrival, number } },
        version: 1,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  assert.equal(
    (await circle.account(guest)).travelPlans.find(
      (p: any) => p.stayId === stay.id,
    )!.version,
    2,
  );
});
test("flight planning accepts an earlier arrival but rejects legs outside the opposite end of the linked stay", async () => {
  const { guest, stay, itinerary } = await sandbox();
  const earlier = {
    ...itinerary,
    arrival: {
      ...itinerary.arrival,
      date: plusDays(itinerary.arrival.date, -3),
    },
  };
  await circle.saveTravel(guest, {
    stayId: stay.id,
    itinerary: earlier,
    version: 0,
  });
  await assert.rejects(
    () =>
      circle.saveTravel(guest, {
        stayId: stay.id,
        itinerary: {
          arrival: {
            ...itinerary.arrival,
            date: plusDays(itinerary.departure.date, 1),
          },
        },
        version: 1,
      }),
    /invalid_travel_dates/,
  );
  await assert.rejects(
    () =>
      circle.saveTravel(guest, {
        stayId: stay.id,
        itinerary: {
          departure: {
            ...itinerary.departure,
            date: plusDays(itinerary.arrival.date, -1),
          },
        },
        version: 1,
      }),
    /invalid_travel_dates/,
  );
});
test("taxi enquiries are idempotent snapshots and flight edits cannot confirm or silently change a sent transfer", async () => {
  const { guest, staff, stay, itinerary } = await sandbox();
  await circle.saveTravel(guest, { stayId: stay.id, itinerary, version: 0 });
  const transport = {
    direction: "arrival",
    pickup: "ZIH airport",
    dropoff: "La Casa Que Canta",
    pickupDate: itinerary.arrival.date,
    pickupTime: "15:00",
    passengers: 2,
    luggage: 2,
    flightNumber: "AM205",
    notes: "Please confirm the pickup point.",
  };
  const input = {
    kind: "transport",
    stayId: stay.id,
    date: transport.pickupDate,
    people: 2,
    message: "Please arrange our arrival transfer.",
    idempotencyKey: randomUUID(),
    transport,
  };
  const created = await Promise.all(
    Array.from({ length: 6 }, () => circle.createRequest(guest, input)),
  );
  assert.equal(new Set(created.map((r) => r.id)).size, 1);
  assert.equal(created[0].status, "sent");
  await assert.rejects(
    () =>
      circle.createRequest(guest, {
        ...input,
        transport: { ...transport, pickupTime: "16:00" },
      }),
    /idempotency_conflict/,
  );
  await assert.rejects(
    () =>
      circle.updateRequest(guest, created[0].id, {
        status: "confirmed",
        message: "Client cannot confirm",
        confirmationReference: "not-provider-approval",
      }),
    /staff_access_required/,
  );
  await circle.saveTravel(guest, {
    stayId: stay.id,
    itinerary: {
      ...itinerary,
      arrival: { ...itinerary.arrival, number: "AM999" },
    },
    version: 1,
  });
  const request = (await circle.account(guest)).requests.find(
    (r: any) => r.id === created[0].id,
  )!;
  assert.equal(request.status, "sent");
  assert.equal(request.details.transport.flightNumber, "AM205");
  assert.equal(request.details.transport.pickupTime, "15:00");
  await assert.rejects(() =>
    circle.updateRequest(staff, request.id, {
      status: "confirmed",
      message: "Awaiting provider details",
      confirmationReference: "DEMO-REF",
    }),
  );
  await circle.updateRequest(staff, request.id, {
    status: "confirmed",
    message: "Provider and pickup verified for this isolated fixture.",
    confirmationReference: "DEMO-REF",
    transportConfirmation: {
      provider: "Fictional demo operator",
      pickupDate: transport.pickupDate,
      pickupTime: "15:10",
      driver: "Demo driver",
      vehicle: "Demo vehicle",
    },
  });
  const confirmed = (await circle.account(guest)).requests.find(
    (r: any) => r.id === request.id,
  )!;
  assert.equal(confirmed.status, "confirmed");
  assert.equal(
    confirmed.details.transportConfirmation.provider,
    "Fictional demo operator",
  );
  assert.equal(confirmed.details.transportConfirmation.pickupTime, "15:10");
  const revision = {
    status: "confirmed",
    message: "The provider revised pickup to 15:20 in this isolated fixture.",
    confirmationReference: "DEMO-REF-REVISED",
    transportConfirmation: {
      ...confirmed.details.transportConfirmation,
      pickupTime: "15:20",
      driver: "Revised demo driver",
    },
  };
  await assert.rejects(
    () => circle.updateRequest(guest, request.id, revision),
    /staff_access_required/,
  );
  await circle.updateRequest(staff, request.id, revision);
  const revised = (await circle.account(guest)).requests.find(
    (r: any) => r.id === request.id,
  )!;
  assert.equal(revised.status, "confirmed");
  assert.equal(revised.details.transportConfirmation.pickupTime, "15:20");
  assert.equal(
    revised.details.transportConfirmation.driver,
    "Revised demo driver",
  );
  assert.equal(revised.details.confirmationReference, "DEMO-REF-REVISED");
  assert.equal(revised.details.transport.pickupTime, "15:00");
  const { rows: revisions } = await getPool().query(
    "SELECT data FROM sc_audit WHERE tenant_id=$1 AND entity_id=$2 AND action='request.transport_revised'",
    [guest.tenant, request.id],
  );
  assert.equal(revisions.length, 1);
});
test("a transport request cannot be attached to another guest’s stay", async () => {
  const own = await sandbox(),
    other = await sandbox();
  const transport = {
    direction: "departure",
    pickup: "La Casa Que Canta",
    dropoff: "ZIH airport",
    pickupDate: own.itinerary.departure.date,
    pickupTime: "09:30",
    passengers: 2,
    luggage: 1,
    flightNumber: "AM206",
    notes: "",
  };
  await assert.rejects(
    () =>
      circle.createRequest(other.guest, {
        kind: "transport",
        stayId: own.stay.id,
        date: transport.pickupDate,
        people: 2,
        message: "Attempt to attach another guest’s stay.",
        idempotencyKey: randomUUID(),
        transport,
      }),
    /stay_not_found/,
  );
});
test("romantic beach dinner requests keep dietary notes and surprise contact separate from a confirmed booking", async () => {
  const { guest, stay } = await sandbox();
  const created = await circle.createRequest(guest, {
    kind: "experience",
    itemId: "romantic-beach-dinner",
    stayId: stay.id,
    date: new Date(stay.arrival).toISOString().slice(0, 10),
    people: 2,
    message:
      "A surprise anniversary dinner on the beach, subject to confirmation.",
    occasion: "Anniversary",
    dietaryNotes: "Vegetarian preference; please discuss the menu.",
    surprise: true,
    authorisedContact: "organiser@example.com",
    idempotencyKey: randomUUID(),
    dining: { setting: "beach", localTime: "19:30" },
  });
  const request = (await circle.account(guest)).requests.find(
    (r: any) => r.id === created.id,
  )!;
  assert.equal(request.status, "sent");
  assert.equal(request.contact_email, "organiser@example.com");
  assert.equal(request.details.dining.localTime, "19:30");
  assert.equal(request.details.dining.setting, "beach");
  assert.match(request.details.dietaryNotes, /Vegetarian/);
  assert.equal(request.details.confirmationReference, undefined);
});
