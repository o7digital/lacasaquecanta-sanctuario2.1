import { test, expect, type Page } from "@playwright/test";
import { localDay, plusDays } from "../../src/lib/travel";

async function demo(page: Page, mode: "guest" | "staff" = "guest") {
  await page.goto("/en/login/");
  const status = await page.evaluate(async (mode) => {
    const r = await fetch("/api/v2/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    return r.status;
  }, mode);
  expect(status).toBe(200);
  const response = await page.request.get("/api/v2/account");
  expect(response.status()).toBe(200);
  const account = await response.json();
  return account.stays.find((s: any) => s.status === "confirmed");
}

test("arrival and departure flights persist, and a sent taxi enquiry remains unchanged after flight edits", async ({
  page,
  browser,
}) => {
  const stay = await demo(page);
  await page.goto("/en/account/stays/");
  const flight = page.getByTestId("flight-details-form");
  await flight
    .getByLabel("Arrival airline", { exact: true })
    .fill("Fictional demo airline");
  await flight
    .getByLabel("Arrival flight number", { exact: true })
    .fill("AM205");
  await flight
    .getByLabel("Arrival flight date", { exact: true })
    .fill(stay.arrival.slice(0, 10));
  await flight
    .getByLabel("Arrival local flight time", { exact: true })
    .fill("14:35");
  await flight.getByLabel("Arrival airport", { exact: true }).fill("ZIH");
  await flight.getByLabel("Arrival origin", { exact: true }).fill("LAX");
  await flight
    .getByLabel("Departure airline", { exact: true })
    .fill("Fictional demo airline");
  await flight
    .getByLabel("Departure flight number", { exact: true })
    .fill("AM206");
  await flight
    .getByLabel("Departure flight date", { exact: true })
    .fill(stay.departure.slice(0, 10));
  await flight
    .getByLabel("Departure local flight time", { exact: true })
    .fill("12:10");
  await flight.getByLabel("Departure airport", { exact: true }).fill("ZIH");
  await flight.getByLabel("Departure destination", { exact: true }).fill("LAX");
  await flight
    .getByRole("button", { name: "Save flight details", exact: true })
    .click();
  await expect(
    flight.locator("[role=status]").filter({ hasText: /saved/i }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Arrival flight number", { exact: true }),
  ).toHaveValue("AM205");
  await expect(
    page.getByLabel("Departure flight number", { exact: true }),
  ).toHaveValue("AM206");
  const transfer = page.getByTestId("transfer-request-form");
  await transfer
    .getByRole("combobox", { name: "Transfer direction", exact: true })
    .selectOption("arrival");
  await transfer
    .getByLabel("Pickup location", { exact: true })
    .fill("ZIH airport");
  await transfer
    .getByLabel("Destination", { exact: true })
    .fill("La Casa Que Canta");
  await transfer
    .getByLabel("Pickup date", { exact: true })
    .fill(stay.arrival.slice(0, 10));
  await transfer.getByLabel("Pickup local time", { exact: true }).fill("15:00");
  await transfer.getByLabel("Passengers", { exact: true }).fill("2");
  await transfer.getByLabel("Luggage pieces", { exact: true }).fill("2");
  await transfer
    .getByLabel("Flight number for this transfer", { exact: true })
    .fill("AM205");
  await transfer
    .getByLabel("Transfer notes", { exact: true })
    .fill("Please confirm the meeting point.");
  await transfer
    .getByRole("button", { name: "Send transfer enquiry", exact: true })
    .click();
  await expect(page.locator(".transfer-request-record")).toHaveCount(1);
  await expect(page.locator(".transfer-request-record .status-tag")).toHaveText(
    "Sent",
  );
  await flight
    .getByLabel("Arrival flight number", { exact: true })
    .fill("AM999");
  await flight
    .getByRole("button", { name: "Save flight details", exact: true })
    .click();
  await expect(
    flight.locator("[role=status]").filter({ hasText: /saved/i }).first(),
  ).toBeVisible();
  const account = await (await page.request.get("/api/v2/account")).json();
  const taxi = account.requests.find((r: any) => r.kind === "transport");
  expect(taxi.status).toBe("sent");
  expect(taxi.details.transport.flightNumber).toBe("AM205");
  expect(
    account.travelPlans.find((p: any) => p.stayId === stay.id).itinerary.arrival
      .number,
  ).toBe("AM999");

  const staffContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    storageState: await page.context().storageState(),
  });
  try {
    const staff = await staffContext.newPage();
    await demo(staff, "staff");
    await staff.goto("/admin/");
    const record = staff.locator(".staff-record").filter({ hasText: taxi.id });
    await record.locator("select[name=status]").selectOption("confirmed");
    await record
      .locator("input[name=confirmationReference]")
      .fill("DEMO-TRANSFER-1");
    await record
      .getByLabel("Actual taxi / transfer provider", { exact: true })
      .fill("Fictional demo operator");
    await record
      .getByLabel("Confirmed pickup date", { exact: true })
      .fill(stay.arrival.slice(0, 10));
    await record
      .getByLabel("Confirmed pickup time", { exact: true })
      .fill("15:10");
    await record
      .locator("textarea[name=message]")
      .fill("Local test fixture: pickup accepted by the demo operator.");
    await record
      .getByRole("button", { name: "Save response", exact: true })
      .click();
    await expect(staff.locator("[role=status]")).toContainText(
      "Response saved",
    );
    await page.reload();
    await expect(
      page.locator(".transfer-request-record .status-tag"),
    ).toHaveText("Confirmed");
    await expect(page.locator(".transfer-confirmed-summary")).toContainText(
      "Fictional demo operator",
    );
    await expect(page.locator(".transfer-confirmed-summary")).toContainText(
      "15:10",
    );
    await expect(page.locator(".transfer-request-record")).toContainText(
      "DEMO-TRANSFER-1",
    );
    await record
      .getByLabel("Confirmed pickup time", { exact: true })
      .fill("15:20");
    await record
      .locator("input[name=confirmationReference]")
      .fill("DEMO-TRANSFER-REVISED");
    await record
      .locator("textarea[name=message]")
      .fill("Local test fixture: provider revised the pickup time to 15:20.");
    const revisionSaved = staff.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/v2/requests/${taxi.id}`) &&
        response.request().method() === "PUT",
    );
    await record
      .getByRole("button", { name: "Save response", exact: true })
      .click();
    expect((await revisionSaved).status()).toBe(200);
    await page.reload();
    await expect(page.locator(".transfer-confirmed-summary")).toContainText(
      "15:20",
    );
    await expect(page.locator(".transfer-request-record")).toContainText(
      "Requested local pickup: " + stay.arrival.slice(0, 10) + " · 15:00",
    );
    await expect(page.locator(".transfer-request-record")).toContainText(
      "DEMO-TRANSFER-REVISED",
    );
  } finally {
    await staffContext.close();
  }
});

test("a failed transfer send retains the entered pickup and notes without creating a confirmation", async ({
  page,
}) => {
  const stay = await demo(page);
  await page.goto("/en/account/stays/");
  const form = page.getByTestId("transfer-request-form");
  await form
    .getByRole("combobox", { name: "Transfer direction", exact: true })
    .selectOption("departure");
  await form
    .getByLabel("Pickup location", { exact: true })
    .fill("La Casa Que Canta");
  await form.getByLabel("Destination", { exact: true }).fill("ZIH airport");
  await form
    .getByLabel("Pickup date", { exact: true })
    .fill(stay.departure.slice(0, 10));
  await form.getByLabel("Pickup local time", { exact: true }).fill("09:30");
  await form.getByLabel("Passengers", { exact: true }).fill("2");
  await form.getByLabel("Luggage pieces", { exact: true }).fill("1");
  await form
    .getByLabel("Transfer notes", { exact: true })
    .fill("Please allow time for luggage.");
  await page.route("**/api/v2/requests", (r) => r.abort("failed"));
  await form
    .getByRole("button", { name: "Send transfer enquiry", exact: true })
    .click();
  await expect(form.locator("[role=status]").first()).not.toBeEmpty();
  await expect(
    form.getByRole("textbox", { name: "Transfer notes", exact: true }),
  ).toHaveValue("Please allow time for luggage.");
  await expect(form.getByLabel("Pickup location", { exact: true })).toHaveValue(
    "La Casa Que Canta",
  );
  await expect(page.locator(".transfer-request-record")).toHaveCount(0);
});

test("a confirmed stay still allows a departure transfer on its local checkout day", async ({
  page,
}) => {
  const stay = await demo(page);
  const today = localDay();
  await page.route("**/api/v2/account", async (route) => {
    const response = await route.fetch();
    const account = await response.json();
    account.stays = [
      {
        ...stay,
        arrival: plusDays(today, -1),
        departure: today,
        status: "confirmed",
      },
    ];
    account.travelPlans = [];
    await route.fulfill({ response, json: account });
  });
  await page.goto("/en/account/stays/");
  await page
    .getByRole("button", {
      name: "Open stay, flights & transfers",
      exact: true,
    })
    .click();
  const form = page.getByTestId("transfer-request-form");
  await expect(form).toBeVisible();
  const direction = form.getByRole("combobox", {
    name: "Transfer direction",
    exact: true,
  });
  await direction.selectOption("departure");
  await expect(direction).toHaveValue("departure");
  await form.getByLabel("Pickup date", { exact: true }).fill(today);
  await expect(
    form.getByRole("button", { name: "Send transfer enquiry", exact: true }),
  ).toBeEnabled();
});

test("public romantic beach dinner pages are bilingual and show an enquiry instead of invented availability", async ({
  page,
}) => {
  await page.goto("/es/experiences/romantic-beach-dinner/");
  await expect(page.locator("h1")).toContainText("Cena romántica en la playa");
  await expect(page.locator(".status-tag")).toContainText("Por consultar");
  await expect(page.locator(".sample-note")).toBeVisible();
  await page.goto("/en/experiences/romantic-beach-dinner/");
  await expect(page.locator("h1")).toContainText(
    /romantic dinner on the beach/i,
  );
  await expect(page.locator(".status-tag")).toContainText("On request");
  await expect(page.locator(".detail-grid")).toContainText(
    "Request information",
  );
});

test("a romantic beach dinner enquiry records local time, dietary wishes and the authorised surprise contact", async ({
  page,
}) => {
  const stay = await demo(page);
  await page.goto("/en/experiences/romantic-beach-dinner/");
  const panel = page.locator("#request");
  await panel.locator("select[name=stayId]").selectOption(stay.id);
  await panel
    .getByLabel("Desired date", { exact: true })
    .fill(stay.arrival.slice(0, 10));
  await panel.getByLabel("Number of people", { exact: true }).fill("2");
  await panel
    .getByLabel("Desired local dinner time (optional)", { exact: true })
    .fill("19:30");
  await panel
    .getByLabel("Occasion (optional)", { exact: true })
    .fill("Anniversary");
  await panel
    .getByLabel("Your wishes", { exact: true })
    .fill("A romantic dinner on the beach, if the house can arrange it.");
  await panel.getByLabel("This is a surprise", { exact: true }).check();
  await panel
    .getByLabel("Only contact this authorised email address")
    .fill("organiser@example.com");
  await panel
    .getByRole("button", { name: "Send my enquiry", exact: true })
    .click();
  await expect(panel.locator("[role=status]")).toContainText("has been saved");
  const account = await (await page.request.get("/api/v2/account")).json();
  const dinner = account.requests.find(
    (r: any) => r.item_id === "romantic-beach-dinner",
  );
  expect(dinner.status).toBe("sent");
  expect(dinner.details.dining).toEqual({
    setting: "beach",
    localTime: "19:30",
  });
  expect(dinner.contact_email).toBe("organiser@example.com");
  expect(dinner.details.confirmationReference).toBeUndefined();
});
