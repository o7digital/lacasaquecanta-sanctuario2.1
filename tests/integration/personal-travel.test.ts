import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startDemo } from "../../src/lib/demo";
import { actorFor, type Actor } from "../../src/lib/auth";
import { getPool } from "../../src/lib/db";
import * as circle from "../../src/lib/circle";
import { ALL } from "../../src/pages/api/v2/[...path]";

if (
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    "Personal travel tests require a dedicated local PostgreSQL database.",
  );

after(async () => {
  await getPool().end();
});

const origin = "http://127.0.0.1:4341";
const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
const day = (value: string | Date) =>
  new Date(value).toISOString().slice(0, 10);

async function fixture() {
  const response = await startDemo(
    new Request(origin + "/api/v2/demo"),
    "guest",
  );
  assert.equal(response.status, 200);
  const cookie = cookieFrom(response);
  const guest = await actorFor(
    new Request(origin + "/api/v2/account", { headers: { cookie } }),
  );
  const { rows: people } = await getPool().query(
    'SELECT u.id,u.name,u.email,a.roles FROM sc_actor a JOIN "user" u ON u.id=a.user_id WHERE a.tenant_id=$1 AND u.id<>$2',
    [guest.tenant, guest.id],
  );
  const toActor = (person: any): Actor => ({
    ...person,
    tenant: guest.tenant,
    demo: true,
  });
  const other = toActor(people.find((person) => !person.roles.length));
  const staff = toActor(
    people.find((person) => person.roles.includes("admin")),
  );
  const stay = (await circle.account(guest)).stays.find(
    (record: any) => record.status === "confirmed",
  )!;
  const arrival = day(stay.arrival),
    departure = day(stay.departure);
  const imported = await circle.importStay(staff, {
    userId: other.id,
    property: "La Casa Que Canta",
    arrival,
    departure,
    status: "confirmed",
    reference: "SAME-DATES-" + randomUUID(),
    origin: "isolated-personal-travel-fixture",
  });
  const otherStay = (await circle.account(other)).stays.find(
    (record: any) => record.id === imported.id,
  )!;
  assert.ok(otherStay);
  assert.equal(guest.tenant, other.tenant);
  const itinerary = (number: string) => ({
    arrival: {
      airline: "Fictional test airline",
      number,
      date: arrival,
      time: "14:35",
      airport: "ZIH",
      route: "LAX",
    },
  });
  const transfer = (stayId: string, number: string) => ({
    kind: "transport",
    stayId,
    date: arrival,
    people: 1,
    message: "Isolated request for this traveller's arrival.",
    idempotencyKey: randomUUID(),
    transport: {
      direction: "arrival",
      pickup: "ZIH airport",
      dropoff: "La Casa Que Canta",
      pickupDate: arrival,
      pickupTime: "15:00",
      passengers: 1,
      luggage: 1,
      flightNumber: number,
      notes: "Private traveller-specific fixture.",
    },
  });
  return { guest, other, staff, stay, otherStay, cookie, itinerary, transfer };
}

async function api(
  cookie: string,
  path: string,
  method = "GET",
  body?: unknown,
  query = "",
) {
  const url = new URL("/api/v2/" + path + query, origin);
  return ALL({
    url,
    params: { path },
    request: new Request(url, {
      method,
      headers: { cookie, origin, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  } as any);
}

test("people staying in the same hotel on the same dates keep separate private flights and taxis", async () => {
  const { guest, other, staff, stay, otherStay, itinerary, transfer } =
    await fixture();
  await circle.saveTravel(guest, {
    stayId: stay.id,
    itinerary: itinerary("AM101"),
    version: 0,
  });
  await circle.saveTravel(other, {
    stayId: otherStay.id,
    itinerary: itinerary("AM202"),
    version: 0,
  });
  const firstTaxi = await circle.createRequest(
    guest,
    transfer(stay.id, "AM101"),
  );
  const secondTaxi = await circle.createRequest(
    other,
    transfer(otherStay.id, "AM202"),
  );
  const first = await circle.account(guest),
    second = await circle.account(other);
  assert.equal(first.travelPlans.length, 1);
  assert.equal(second.travelPlans.length, 1);
  assert.equal(first.travelPlans[0].itinerary.arrival.number, "AM101");
  assert.equal(second.travelPlans[0].itinerary.arrival.number, "AM202");
  assert.deepEqual(
    first.requests.map((request) => request.id),
    [firstTaxi.id],
  );
  assert.deepEqual(
    second.requests.map((request) => request.id),
    [secondTaxi.id],
  );
  await assert.rejects(
    () =>
      circle.saveTravel(other, {
        stayId: stay.id,
        itinerary: itinerary("AM999"),
        version: 1,
      }),
    /stay_not_found/,
  );
  await assert.rejects(
    () => circle.createRequest(guest, transfer(otherStay.id, "AM999")),
    /stay_not_found/,
  );
  await assert.rejects(
    () => circle.replyToRequest(other, firstTaxi.id, { message: "Not mine" }),
    /staff_access_required/,
  );
  const reception = await circle.staffData(staff);
  assert.equal(
    reception.requests.find((request: any) => request.id === firstTaxi.id)
      ?.guest_id,
    guest.id,
  );
  assert.equal(
    reception.requests.find((request: any) => request.id === secondTaxi.id)
      ?.guest_id,
    other.id,
  );
});

test("private travel API derives the person from the session and rejects client-selected identities", async () => {
  const { guest, other, stay, otherStay, cookie, itinerary, transfer } =
    await fixture();
  const account = await api(
    cookie,
    "account",
    "GET",
    undefined,
    "?guestId=" + other.id,
  );
  assert.equal(account.status, 200);
  assert.equal((await account.json()).actor.id, guest.id);
  const unsigned = await api(
    "",
    "account",
    "GET",
    undefined,
    "?guestId=" + guest.id,
  );
  assert.equal(unsigned.status, 401);
  const foreignStay = await api(cookie, "travel", "PUT", {
    stayId: otherStay.id,
    itinerary: itinerary("AM999"),
    version: 0,
  });
  assert.equal(foreignStay.status, 404);
  const selectedFlightOwner = await api(cookie, "travel", "PUT", {
    stayId: stay.id,
    itinerary: itinerary("AM101"),
    version: 0,
    guestId: other.id,
  });
  assert.equal(selectedFlightOwner.status, 400);
  assert.equal((await selectedFlightOwner.json()).error, "validation");
  const selectedTaxiOwner = await api(cookie, "requests", "POST", {
    ...transfer(stay.id, "AM101"),
    guestId: other.id,
  });
  assert.equal(selectedTaxiOwner.status, 400);
  assert.equal((await selectedTaxiOwner.json()).error, "validation");
  assert.equal((await circle.account(guest)).travelPlans.length, 0);
  assert.equal((await circle.account(other)).requests.length, 0);
});

test("a second signed-in session reads the same person's flights and taxis from PostgreSQL", async () => {
  const { guest, stay, cookie, itinerary, transfer } = await fixture();
  const firstSave = await api(cookie, "travel", "PUT", {
    stayId: stay.id,
    itinerary: itinerary("AM303"),
    version: 0,
  });
  assert.equal(firstSave.status, 200);
  const taxi = await api(
    cookie,
    "requests",
    "POST",
    transfer(stay.id, "AM303"),
  );
  assert.equal(taxi.status, 200);
  const taxiRecord = await taxi.json();
  const secondSession = await startDemo(
    new Request(origin + "/api/v2/demo", { headers: { cookie } }),
    "guest",
  );
  assert.equal(secondSession.status, 200);
  const secondCookie = cookieFrom(secondSession);
  assert.notEqual(secondCookie, cookie);
  const secondAccount = await api(secondCookie, "account");
  assert.equal(secondAccount.status, 200);
  const account = await secondAccount.json();
  assert.equal(account.actor.id, guest.id);
  assert.equal(account.travelPlans[0].itinerary.arrival.number, "AM303");
  assert.equal(
    account.requests.find((request: any) => request.id === taxiRecord.id)
      ?.details.transport.flightNumber,
    "AM303",
  );
  assert.equal((await api(cookie, "account")).status, 200);
});
