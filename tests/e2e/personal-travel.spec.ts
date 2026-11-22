import { test, expect, type Page } from "@playwright/test";

async function signIntoDemo(page: Page) {
  await page.goto("/en/login/");
  const response = await page.request.post("/api/v2/demo", {
    headers: { Origin: new URL(page.url()).origin },
    data: { mode: "guest" },
  });
  expect(response.status()).toBe(200);
  const account = await page.request.get("/api/v2/account");
  expect(account.status()).toBe(200);
  return account.json();
}

test("a traveller finds personal flights and taxis in the same account on a second device", async ({
  page,
  browser,
}) => {
  const account = await signIntoDemo(page);
  const stay = account.stays.find(
    (record: any) => record.status === "confirmed",
  );
  await page.goto("/en/account/stays/");
  await expect(page.getByTestId("travel-owner")).toContainText(
    account.actor.name,
  );
  const flight = page.getByTestId("flight-details-form");
  await flight
    .getByLabel("Arrival flight number", { exact: true })
    .fill("AM401");
  await flight
    .getByLabel("Arrival flight date", { exact: true })
    .fill(stay.arrival.slice(0, 10));
  await flight
    .getByLabel("Arrival local flight time", { exact: true })
    .fill("14:35");
  await flight.getByLabel("Arrival airport", { exact: true }).fill("ZIH");
  await flight
    .getByRole("button", { name: "Save flight details", exact: true })
    .click();
  await expect(flight.locator("[role=status]").first()).toContainText("saved");

  const transfer = page.getByTestId("transfer-request-form");
  await transfer
    .getByLabel("Pickup location", { exact: true })
    .fill("ZIH airport");
  await transfer
    .getByLabel("Destination", { exact: true })
    .fill("La Casa Que Canta");
  await transfer
    .getByLabel("Pickup date", { exact: true })
    .fill(stay.arrival.slice(0, 10));
  await transfer.getByLabel("Pickup local time", { exact: true }).fill("15:40");
  await transfer.getByLabel("Passengers", { exact: true }).fill("1");
  await transfer.getByLabel("Luggage pieces", { exact: true }).fill("1");
  await transfer
    .getByLabel("Flight number for this transfer", { exact: true })
    .fill("AM401");
  await transfer
    .getByLabel("Transfer notes", { exact: true })
    .fill("Isolated cross-device traveller fixture.");
  await transfer
    .getByRole("button", { name: "Send transfer enquiry", exact: true })
    .click();
  await expect(page.locator(".transfer-request-record")).toHaveCount(1);

  const state = await page.context().storageState();
  const secondDevice = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    viewport: { width: 820, height: 1180 },
    storageState: {
      cookies: state.cookies.filter((cookie) => cookie.name === "sc_demo"),
      origins: [],
    },
  });
  try {
    const tablet = await secondDevice.newPage();
    const secondAccount = await signIntoDemo(tablet);
    expect(secondAccount.actor.id).toBe(account.actor.id);
    await tablet.goto("/en/account/stays/");
    await expect(tablet.getByTestId("travel-owner")).toContainText(
      account.actor.name,
    );
    await expect(
      tablet.getByLabel("Arrival flight number", { exact: true }),
    ).toHaveValue("AM401");
    expect(
      secondAccount.requests.find(
        (request: any) => request.kind === "transport",
      )?.details.transport.flightNumber,
    ).toBe("AM401");
    await expect(tablet.locator(".transfer-request-record")).toHaveCount(1);
    await expect(tablet.locator(".transfer-request-record")).toContainText(
      "15:40",
    );
    await tablet
      .getByLabel("Arrival flight number", { exact: true })
      .fill("AM402");
    const secondFlight = tablet.getByTestId("flight-details-form");
    await secondFlight
      .getByRole("button", { name: "Save flight details", exact: true })
      .click();
    await expect(secondFlight.locator("[role=status]").first()).toContainText(
      "saved",
    );

    await page.reload();
    await expect(
      page.getByLabel("Arrival flight number", { exact: true }),
    ).toHaveValue("AM402");
    const reloadedAccount = await (
      await page.request.get("/api/v2/account")
    ).json();
    expect(
      reloadedAccount.requests.find(
        (request: any) => request.kind === "transport",
      )?.details.transport.flightNumber,
    ).toBe("AM401");
    await expect(
      page.locator(".transfer-request-record .status-tag"),
    ).toHaveText("Sent");
  } finally {
    await secondDevice.close();
  }
});
