import { test, expect } from "@playwright/test";

test("official offers have bilingual pages, local photos, current stay periods and source links", async ({
  page,
}) => {
  for (const lang of ["en", "es"]) {
    await page.goto(`/${lang}/offers/`);
    await expect(page.locator(".offer-card")).toHaveCount(3);
    await expect(
      page
        .locator(".offer-card")
        .filter({
          hasText:
            lang === "en" ? "Enchanting Moments" : "Momentos Encantadores",
        }),
    ).toContainText("2027");
    const photos = await page
      .locator(".offer-card img")
      .evaluateAll((images) =>
        images.map((img) => ({
          alt: img.getAttribute("alt"),
          src: img.getAttribute("src"),
        })),
      );
    expect(
      photos.every(
        (photo) => photo.alt && photo.src?.startsWith("/assets/offers/"),
      ),
    ).toBe(true);
    await page.locator('a.offer-card[href$="/discover-us/"]').click();
    await expect(page.locator(".offer-terms")).toContainText("2026");
    await expect(page.locator(".offer-terms")).toContainText("20%");
    await expect(page.locator(".offer-terms")).toContainText("10%");
    await expect(page.locator(".offer-source a")).toHaveAttribute(
      "href",
      `https://www.lacasaquecanta.com/${lang === "es" ? "es/" : ""}savings/discover-us`,
    );
    await expect(page.locator(".offer-source")).toContainText("2026");
    await expect(page.locator(".sample-note")).toHaveCount(0);
  }
});

test("a mobile summer offer enquiry rejects out-of-period travel and records an eligible request without confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/login/");
  const demo = await page.request.post("/api/v2/demo", {
    headers: { Origin: new URL(page.url()).origin },
    data: { mode: "guest" },
  });
  expect(demo.status()).toBe(200);
  await page.goto("/en/offers/enchanting-moments/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const form = page.locator("#request");
  await form.getByLabel("Desired date", { exact: true }).fill("2026-12-01");
  await form
    .getByLabel("Your wishes", { exact: true })
    .fill("Please check the breakfast offer for two guests.");
  await form
    .getByRole("button", { name: "Send my enquiry", exact: true })
    .click();
  await expect(form.locator("[role=status]")).toContainText(
    "no longer available",
  );
  await expect(form.getByLabel("Your wishes", { exact: true })).toHaveValue(
    "Please check the breakfast offer for two guests.",
  );
  await form.getByLabel("Desired date", { exact: true }).fill("2027-06-15");
  await form
    .getByRole("button", { name: "Send my enquiry", exact: true })
    .click();
  await expect(form.locator("[role=status]")).toContainText("has been saved");
  const account = await (await page.request.get("/api/v2/account")).json();
  const request = account.requests.find(
    (r: any) => r.item_id === "enchanting-moments",
  );
  expect(request.status).toBe("sent");
  expect(request.details.date).toBe("2027-06-15");
  expect(request.details.confirmationReference).toBeUndefined();
});
