import { test, expect } from "@playwright/test";
import edition from "../../src/data/journal.json" with { type: "json" };

test("server-rendered EN/ES articles have real URLs, translations and metadata without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/es/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".story-card").first().locator("h3")).toContainText(
    "El mar escribe",
  );
  await page
    .locator(".story-card")
    .first()
    .locator("h3 a, a.story-open")
    .last()
    .click();
  await expect(page).toHaveURL(/\/es\/stories\/chef\//);
  await expect(page.locator("h1")).toHaveText(
    "El mar escribe la primera línea.",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    /\/es\/stories\/chef\//,
  );
  await expect(page.locator("link[hreflang=en]")).toHaveAttribute(
    "href",
    /\/en\/stories\/chef\//,
  );
  await expect(page.locator(".sample-note")).toBeVisible();
  await context.close();
});

test("reading, filtering, search, recipes and persistent notebook work across languages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/");
  await expect(page.locator("#cover-title")).toContainText(
    "The art of returning",
  );
  await expect(page.locator("#cover-title")).toContainText(
    "The art of returning",
  );
  await page.locator("[data-filter=recipe]").click();
  await expect(page.locator(".story-card")).toHaveCount(1);
  await page.locator("[data-save=avocado-lime]").click();
  await expect(page.locator("[data-save=avocado-lime]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#search-trigger").click();
  await page.locator("#search-input").fill("clarins");
  await expect(page.locator(".search-result")).toHaveCount(1);
  await page.locator(".search-result").click();
  await expect(page).toHaveURL(/\/en\/stories\/spa\//);
  await page.locator(".reader-actions [data-save=spa]").click();
  await expect(page.locator(".reader-actions [data-save=spa]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/es/");
  await page.locator(".header-actions .saved-trigger").click();
  await expect(page.locator("#notebook-content")).toContainText(
    "Un pequeño sabor de la costa",
  );
  await expect(page.locator("#notebook-content")).toContainText(
    "Un ritual más tranquilo",
  );
  await expect(page.locator("#notebook-content .notebook-item")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("agenda export and stay planning keep actual event dates and correct villa destinations", async ({
  page,
  request,
}) => {
  await page.goto("/en/");
  await page.locator("[data-save-event=sail]").click();
  await page.locator("[data-event=sail]").click();
  await expect(page.locator("#arrival")).toHaveValue("2027-02-14");
  await expect(page.locator("#departure")).toHaveValue("2027-02-28");
  await page.locator("#property").selectOption("El Ensueño");
  await expect(page.locator(".direct-book")).toHaveAttribute(
    "href",
    "https://www.el-ensueno.com/",
  );
  await page.locator("#keep-stay").click();
  await expect(page.locator("#booking-result")).toContainText(
    "No request has been sent",
  );
  await page.locator("[data-close=booking]").click();
  await page.reload();
  await page.locator(".header-actions .saved-trigger").click();
  await expect(page.locator("#notebook-content")).toContainText("2027-02-14");
  const response = await request.get("/api/events/sail.ics?lang=es");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("DTEND;VALUE=DATE:20270228");
});

test("newsletter stays pending validation and missing content does not look like a successful page", async ({
  page,
  request,
}) => {
  await page.goto("/es/");
  await expect(
    page.locator("#newsletter-form button[type=submit]"),
  ).toBeDisabled();
  await expect(page.locator("#newsletter-form")).toContainText(
    "pendiente de aprobación",
  );
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reader@example.com", consent: true }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(result).toEqual({
    status: 503,
    body: { error: "awaiting_validation" },
  });
  expect((await request.get("/en/stories/not-an-article/")).status()).toBe(404);
  expect((await request.get("/fr/")).status()).toBe(404);
});

test("mobile layout fits the screen and dialogs work with touch and keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/es/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.locator(".header-actions .saved-trigger").click();
  await expect(page.locator("#notebook")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#notebook")).not.toBeVisible();
  await page.locator(".chapter-actions .booking-trigger").click();
  await expect(page.locator("#booking")).toBeVisible();
  await page.locator("[data-close=booking]").click();
  await page.goto("/es/stories/chef/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.locator(".reader-actions [data-save=chef]")).toBeVisible();
});

test("editor requires write access and saves validated translations to the dedicated branch with conflict protection", async ({
  page,
}) => {
  let written: any;
  await page.route(
    "https://api.github.com/repos/o7digital/lacasaquecanta-sanctuario2.1**",
    async (route) => {
      if (route.request().method() === "PUT") {
        written = route.request().postDataJSON();
        await route.fulfill({ json: { content: { sha: "next-version" } } });
      } else if (route.request().url().includes("/contents/"))
        await route.fulfill({
          json: {
            sha: "current-version",
            content: Buffer.from(JSON.stringify(edition)).toString("base64"),
          },
        });
      else await route.fulfill({ json: { permissions: { push: true } } });
    },
  );
  await page.goto("/admin/legacy/");
  await page
    .getByLabel("GitHub access token")
    .fill("test-credential-not-a-real-token");
  await page.getByRole("button", { name: "Connect editorial studio" }).click();
  await page.locator(".editor-row").first().click();
  await page
    .getByLabel("Title · en", { exact: true })
    .fill("A new letter from the coast.");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".editor-preview h1")).toHaveText(
    "A new letter from the coast.",
  );
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText(
    "Edition saved to GitHub",
  );
  expect(written.branch).toBe("codex/el-sanctuario-v2");
  expect(written.sha).toBe("current-version");
  expect(
    JSON.parse(Buffer.from(written.content, "base64").toString()).articles[0]
      .locales.en.title,
  ).toBe("A new letter from the coast.");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token|credential/i.test(k)),
    ),
  ).toBe(false);
});

test("editor refuses a reader-only GitHub account", async ({ page }) => {
  await page.route(
    "https://api.github.com/repos/o7digital/lacasaquecanta-sanctuario2.1",
    (route) => route.fulfill({ json: { permissions: { push: false } } }),
  );
  await page.goto("/admin/legacy/");
  await page.getByLabel("GitHub access token").fill("read-only-test");
  await page.getByRole("button", { name: "Connect editorial studio" }).click();
  await expect(page.locator(".editor-status")).toContainText("Write access");
  await expect(
    page.getByRole("button", { name: "New article", exact: true }),
  ).toHaveCount(0);
});

test("saved article remains readable offline and the service worker preserves unrelated caches", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.TEST_BASE_URL,
    "Offline assets are verified against the built deployment, not Vite development URLs.",
  );
  await page.goto("/admin/legacy/");
  await page.evaluate(async () => {
    await caches.open("another-application-cache");
    await caches.open("el-sanctuario-21-obsolete");
  });
  await page.goto("/en/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.locator("[data-save=chef]").first().click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("el-sanctuario-21-v3");
        return Boolean(
          await cache.match(new URL("/en/stories/chef/", location.origin).href),
        );
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).includes("another-application-cache"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).includes("el-sanctuario-21-obsolete"),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto("/en/stories/chef/");
  await expect(page.locator("h1")).toHaveText("The sea writes the first line.");
  await expect(page.locator("#offline-notice")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("El Sanctuario");
  await page.locator(".header-actions .saved-trigger").click();
  await expect(page.locator("#notebook-content")).toContainText(
    "The sea writes the first line.",
  );
  await context.setOffline(false);
});
