import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../src/data/journal.json";
import { contentSchema, offerSchema } from "../src/lib/schema";
import { offerEligibility } from "../src/lib/circle-schema";
import { offerPeriod, offerStatus } from "../src/lib/offers";

const offers = contentSchema.parse(seed).offers;
test("published hotel offers preserve stay periods without inventing booking deadlines or a quote", () => {
  assert.deepEqual(
    offers.map((o) => o.id),
    ["discover-us", "enchanting-moments", "indulge-yourself"],
  );
  for (const offer of offers) {
    assert.equal(offer.bookingStart, undefined);
    assert.equal(offer.bookingEnd, undefined);
    assert.equal(offer.price, undefined);
    assert.equal(offer.currency, undefined);
    assert.ok(
      offer.sourceUrl?.startsWith("https://www.lacasaquecanta.com/savings/"),
    );
    assert.ok(
      offer.sourceUrlEs?.startsWith(
        "https://www.lacasaquecanta.com/es/savings/",
      ),
    );
    assert.equal(offer.sourceVerifiedAt, "2026-11-22");
  }
  assert.equal(
    offerSchema.safeParse({ ...offers[0], price: 500 }).success,
    false,
  );
  assert.equal(
    offerSchema.safeParse({ ...offers[0], price: 500, currency: "USD" })
      .success,
    true,
  );
  assert.equal(
    offerSchema.safeParse({
      ...offers[0],
      bookingStart: "2026-12-22",
      bookingEnd: "2026-11-01",
    }).success,
    false,
  );
});
test("an offer with no booking deadline still closes when its stay dates end", () => {
  const offer = offers[0];
  assert.equal(offerEligibility(offer, "2026-11-22"), "eligible");
  assert.equal(offerEligibility(offer, "2026-12-23"), "expired");
  assert.equal(
    offerEligibility(offer, "2026-11-22", undefined, { arrival: "2027-06-01" }),
    "stay_dates",
  );
  assert.equal(offerStatus(offer, "en", "2026-12-23"), "Offer ended");
  assert.equal(offerStatus(offer, "es", "2026-12-23"), "Oferta finalizada");
});
test("summer 2027 travel dates are distinct from the date on which an enquiry is made", () => {
  const offer = offers.find((o) => o.id === "enchanting-moments")!;
  assert.equal(
    offerEligibility(offer, "2026-11-22", undefined, {
      arrival: "2027-06-01",
      departure: "2027-06-04",
    }),
    "eligible",
  );
  assert.equal(
    offerEligibility(offer, "2026-11-22", undefined, { arrival: "2026-12-01" }),
    "stay_dates",
  );
  assert.match(offerPeriod(offer.stayStart, offer.stayEnd, "en"), /2027/);
  assert.doesNotMatch(
    offerPeriod(undefined, undefined, "es"),
    /undefined|Invalid/,
  );
});
