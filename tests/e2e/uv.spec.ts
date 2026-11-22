import { test, expect } from "@playwright/test";
import { weatherFixture } from "../fixtures/weather";

test("UV card shows its spectrum, hourly curve and local forecast time on the journal and iPad exploration page", async ({
  page,
}) => {
  const now = new Date("2026-11-22T18:15:00Z");
  await page.clock.setFixedTime(now);
  await page.route("**/api/weather", (route) =>
    route.fulfill({ json: weatherFixture(now) }),
  );
  for (const [path, width, height] of [
    ["/en/", 1440, 1000],
    ["/es/explore/", 820, 1180],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const card = page.locator("[data-uv-card]");
    await expect(card.locator("[data-uv-value]")).toHaveText("7");
    await expect(card.locator("[data-uv-level]")).toHaveText(
      path === "/en/" ? "High" : "Alto",
    );
    await expect(card.getByRole("meter")).toHaveAttribute("aria-valuenow", "7");
    await expect(card.locator("[data-uv-chart]")).toBeVisible();
    await expect(card).toContainText("12:00");
    await expect(card).toContainText("14:00");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});

test("mobile nighttime UV remains a valid zero when temperature units change", async ({
  page,
}) => {
  const now = new Date("2026-11-23T05:15:00Z");
  await page.clock.setFixedTime(now);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/weather", (route) =>
    route.fulfill({ json: weatherFixture(now) }),
  );
  await page.goto("/es/", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-uv-card]");
  await expect(card.locator("[data-uv-value]")).toHaveText("0");
  await expect(card.locator("[data-uv-level]")).toHaveText("Bajo");
  await page.locator("#weather-unit").selectOption("F");
  await expect(page.locator("#weather-temp")).toContainText("82");
  await expect(card.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("missing or stale UV is shown as unavailable while temperature stays readable", async ({
  page,
}) => {
  const now = new Date("2026-11-22T18:15:00Z");
  await page.clock.setFixedTime(now);
  let fixture = weatherFixture(now);
  fixture.uv = null;
  await page.route("**/api/weather", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto("/en/explore/", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-uv-card]");
  await expect(card.locator("[data-uv-value]")).toHaveText("—");
  await expect(card.locator("[data-uv-level]")).toHaveText("No recent UV data");
  await expect(card.getByRole("meter")).toHaveCount(0);
  await expect(page.locator(".today-temp")).toHaveText("28°C");
  fixture = { ...weatherFixture(now), stale: true };
  await page.reload();
  await expect(card.locator("[data-uv-value]")).toHaveText("—");
  await expect(card.locator("[data-uv-chart]")).toHaveCount(0);
  await expect(page.locator(".today-temp")).toHaveText("28°C");
});
