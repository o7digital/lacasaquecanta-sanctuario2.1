import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  flightSchema,
  travelItinerarySchema,
  travelPlanSchema,
  requestSchema,
} from "../src/lib/circle-schema";

const flight = {
  number: "AM205",
  date: "2099-06-12",
  time: "14:35",
  airport: "ZIH",
};
const transport = {
  direction: "arrival",
  pickup: "ZIH airport",
  dropoff: "La Casa Que Canta",
  pickupDate: "2099-06-12",
  pickupTime: "15:00",
  passengers: 2,
  luggage: 2,
  flightNumber: "AM205",
  notes: "",
};
const enquiry = () => ({
  kind: "transport",
  stayId: randomUUID(),
  date: transport.pickupDate,
  people: 2,
  message: "Please arrange a transfer after our arrival.",
  idempotencyKey: randomUUID(),
  transport,
});

test("flight details accept an itinerary without claiming an airline reservation and reject invalid dates and times", () => {
  const parsed = flightSchema.parse(flight);
  assert.equal(parsed.airline, "");
  assert.equal(parsed.route, "");
  assert.equal(
    flightSchema.safeParse({ ...flight, time: "25:70" }).success,
    false,
  );
  assert.equal(
    flightSchema.safeParse({ ...flight, date: "2099-02-30" }).success,
    false,
  );
  assert.equal(
    flightSchema.safeParse({ ...flight, number: "" }).success,
    false,
  );
  assert.equal(
    flightSchema.safeParse({
      ...flight,
      status: "confirmed",
      bookingReference: "invented",
    }).success,
    false,
  );
});
test("travel updates need a real stay identifier and version, and a departure cannot precede arrival", () => {
  assert.equal(
    travelPlanSchema.safeParse({
      stayId: randomUUID(),
      itinerary: { arrival: flight },
      version: 0,
    }).success,
    true,
  );
  assert.equal(
    travelPlanSchema.safeParse({
      stayId: "not-a-stay",
      itinerary: { arrival: flight },
      version: 0,
    }).success,
    false,
  );
  assert.equal(
    travelPlanSchema.safeParse({
      stayId: randomUUID(),
      itinerary: { arrival: flight },
      version: -1,
    }).success,
    false,
  );
  assert.equal(
    travelItinerarySchema.safeParse({
      arrival: flight,
      departure: { ...flight, date: "2099-06-11" },
    }).success,
    false,
  );
});
test("sent transfer enquiries require matching date, people and private stay details", () => {
  assert.equal(requestSchema.safeParse(enquiry()).success, true);
  assert.equal(
    requestSchema.safeParse({ ...enquiry(), stayId: undefined }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...enquiry(), transport: undefined }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...enquiry(), date: "2099-06-13" }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...enquiry(), people: 3 }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...enquiry(),
      transport: { ...transport, passengers: 0 },
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...enquiry(),
      transport: { ...transport, luggage: -1 },
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...enquiry(),
      transport: { ...transport, pickupTime: "24:30" },
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...enquiry(), status: "confirmed" }).success,
    false,
  );
});
test("a romantic beach dinner remains an enquiry with optional time and a separate authorised surprise contact", () => {
  const dinner = {
    kind: "experience",
    itemId: "romantic-beach-dinner",
    date: "2099-06-13",
    people: 2,
    message: "A romantic beach dinner, subject to the house’s confirmation.",
    idempotencyKey: randomUUID(),
    dining: { setting: "beach", localTime: "19:30" },
  };
  assert.equal(requestSchema.safeParse(dinner).success, true);
  assert.equal(
    requestSchema.safeParse({ ...dinner, dining: undefined }).success,
    true,
  );
  assert.equal(
    requestSchema.safeParse({ ...dinner, date: undefined }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...dinner, people: undefined }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...dinner,
      dining: { setting: "beach", localTime: "28:00" },
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...dinner, itemId: "diving" }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ ...dinner, surprise: true }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...dinner,
      surprise: true,
      authorisedContact: "organiser@example.com",
    }).success,
    true,
  );
});
