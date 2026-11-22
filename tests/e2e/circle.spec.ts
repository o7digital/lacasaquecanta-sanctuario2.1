import { test, expect, type Page } from "@playwright/test";
async function demo(page: Page, mode = "guest") {
  await page.goto("/en/login/");
  const result = await page.evaluate(async (mode) => {
    const r = await fetch("/api/v2/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    return r.status;
  }, mode);
  expect(result).toBe(200);
}
test("the house editor publishes articles, experiences and events through forms without GitHub credentials", async ({
  page,
}) => {
  await demo(page, "staff");
  await page.goto("/admin/");
  await page
    .getByRole("button", { name: "Articles & events", exact: true })
    .click();
  await page.locator(".editor-row").first().click();
  await page
    .getByLabel("Title · en", { exact: true })
    .fill("A reviewed demonstration story.");
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Edition saved.");
  await page
    .getByRole("button", { name: "Issues & experiences", exact: true })
    .click();
  await page.getByRole("button", { name: /Below the Pacific/ }).click();
  await page
    .getByLabel("Title · en", { exact: true })
    .fill("A reviewed demonstration experience.");
  await page.getByLabel("Publication status").selectOption("published");
  await page
    .getByRole("button", { name: "Save catalogue", exact: true })
    .click();
  await expect(page.locator(".form-status")).toContainText("Catalogue saved.");
  await page
    .getByRole("button", { name: "Articles & events", exact: true })
    .click();
  await page
    .locator(".editor-row")
    .filter({ hasText: "Guitar" })
    .first()
    .click();
  await page
    .getByLabel("Title · en", { exact: true })
    .fill("An event reviewed in the demonstration.");
  await page.getByLabel("Publication status").selectOption("scheduled");
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Edition saved.");
  const response = await page.request.get("/api/v2/staff/editorial");
  expect(response.status()).toBe(200);
  const { content } = await response.json();
  expect(content.articles[0].status).toBe("published");
  expect(content.experiences[0].status).toBe("published");
  expect(content.events.find((e: any) => e.id === "guitar").title.en).toBe(
    "An event reviewed in the demonstration.",
  );
  expect(
    await (await page.request.get("/en/stories/chef/")).text(),
  ).not.toContain("A reviewed demonstration story.");
});
test("issues have complete contents, categories, chef archives and real wedding and moment stories", async ({
  page,
}) => {
  await page.goto("/en/");
  await expect(page.locator("#cover-title")).toHaveText(
    "The art of returning.",
  );
  await page.locator(".cover-story .text-link").click();
  await expect(page).toHaveURL(/\/en\/editions\/the-art-of-returning\//);
  await expect(page.locator(".contents-box li")).toHaveCount(10);
  await page.goto("/es/archives/");
  await page.getByRole("link").filter({ hasText: "La primera luz." }).click();
  await expect(page.locator("h1")).toHaveText("La primera luz.");
  await expect(page.locator(".contents-box li")).toHaveCount(2);
  await page.goto("/en/weddings/");
  await page
    .locator(".story-collection h3 a,a.story-open")
    .filter({ hasText: "A day, entirely your own." })
    .first()
    .click();
  await expect(page.locator(".article-prose")).toContainText(
    "Keep the conversation in one place",
  );
  await page.goto("/es/special-moments/");
  await expect(page.locator(".story-collection")).toContainText(
    "Los momentos que guardamos",
  );
  await page.goto("/en/chef-letters/");
  await expect(page.locator(".story-collection")).toContainText(
    "The sea writes the first line",
  );
});
test("a member saves a story, imports the device notebook explicitly and finds it after signing in on another device", async ({
  page,
  browser,
}) => {
  await demo(page);
  await page.goto("/en/stories/chef/");
  await page.locator(".reader-actions [data-save=chef]").click();
  await expect(
    page.locator(".reader-actions [data-save=chef]"),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/en/account/notebook/");
  await expect(page.locator(".account-content")).toContainText(
    "The sea writes the first line.",
  );
  await page.evaluate(() =>
    localStorage.setItem("sanctuario-saved", JSON.stringify(["spa", "chef"])),
  );
  await page
    .getByRole("button", {
      name: "Import the notebook on this device",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("without duplicates");
  await expect(page.locator(".notebook-entry")).toHaveCount(2);
  const state = await page.context().storageState();
  const context = await browser.newContext({
    storageState: {
      cookies: state.cookies.filter((c) => c.name === "sc_demo"),
      origins: [],
    },
  });
  const second = await context.newPage();
  await demo(second);
  await second.goto("/es/account/notebook/");
  await expect(second.locator(".notebook-entry")).toHaveCount(2);
  await expect(second.locator(".account-content")).toContainText(
    "El mar escribe la primera línea.",
  );
  await context.close();
});
test("private preferences persist across reloads, dietary choices remain distinct and logout removes account access", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/es/account/profile/");
  await page.getByLabel("Nombre", { exact: true }).fill("Alexandra");
  await page.getByLabel("Sin gluten", { exact: true }).check();
  await page
    .getByLabel("Alergias o intolerancias que deseas compartir")
    .fill("Sésamo");
  await page
    .getByRole("button", { name: "Guardar mis preferencias privadas" })
    .click();
  await expect(page.getByRole("status")).toContainText("se han guardado");
  await page.reload();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Alexandra",
  );
  await expect(page.getByLabel("Sin gluten", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("Alergias o intolerancias que deseas compartir"),
  ).toHaveValue("Sésamo");
  await page
    .getByRole("button", { name: "Eliminar mi información de alergias" })
    .click();
  await page
    .getByRole("button", { name: "Guardar mis preferencias privadas" })
    .click();
  await expect(page.getByRole("status")).toContainText("se han guardado");
  await page.reload();
  await expect(
    page.getByLabel("Alergias o intolerancias que deseas compartir"),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/es\/login\//);
  const response = await page.request.get("/api/v2/account");
  expect(response.status()).toBe(401);
});
test("a wedding enquiry is stored with a real reference, and reception responds in the same dossier", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/en/weddings/");
  await page.getByLabel("Number of people").fill("12");
  await page
    .getByLabel("Your wishes", { exact: true })
    .fill("A small ceremony with family by the Pacific.");
  await page
    .getByRole("button", { name: "Send my enquiry", exact: true })
    .click();
  await expect(page.locator("#request [role=status]")).toContainText(
    "has been saved",
  );
  await page.goto("/en/account/requests/");
  await expect(page.locator(".request-record")).toContainText(
    "A small ceremony",
  );
  await demo(page, "staff");
  await page.goto("/admin/");
  const record = page
    .locator(".staff-record")
    .filter({ hasText: "A small ceremony" });
  await record.getByLabel("Next status").selectOption("pending");
  await record
    .getByLabel(
      "Reply to the authorised contact, visible in the guest’s account",
    )
    .fill("We are checking suitable dates and spaces.");
  await record.getByRole("button", { name: "Save response" }).click();
  await expect(page.locator(".staff-status")).toContainText("Response saved");
  await demo(page, "guest");
  await page.goto("/en/account/requests/");
  await expect(page.locator(".request-record")).toContainText(
    "We are checking suitable dates and spaces.",
  );
  await expect(page.locator(".request-record .status-tag")).toHaveText(
    "Awaiting response",
  );
});
test("network failure keeps celebration text and a surprise requires an authorised contact", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/en/special-moments/");
  await page
    .getByLabel("Your wishes", { exact: true })
    .fill("A surprise anniversary dinner.");
  await page.getByLabel("This is a surprise").check();
  await expect(
    page.getByLabel("Only contact this authorised email address"),
  ).toHaveAttribute("required", "");
  await page
    .getByLabel("Only contact this authorised email address")
    .fill("organiser@example.com");
  await page.route("**/api/v2/requests", (r) => r.abort("failed"));
  await page
    .getByRole("button", { name: "Send my enquiry", exact: true })
    .click();
  await expect(page.locator("#request [role=status]")).not.toBeEmpty();
  await expect(page.getByLabel("Your wishes", { exact: true })).toHaveValue(
    "A surprise anniversary dinner.",
  );
  await expect(page.locator("#request")).not.toContainText(
    "Your request has been saved.",
  );
});
test("diving, fishing and yoga can be filtered without inventing confirmed availability", async ({
  page,
}) => {
  await page.goto("/es/explore/");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("diving");
  await expect(page.locator(".catalogue-grid .catalogue-card")).toHaveCount(1);
  await expect(page.locator(".catalogue-grid").first()).toContainText(
    "Bajo el Pacífico",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("fishing");
  await expect(page.locator(".catalogue-grid").first()).toContainText(
    "Una mañana en el mar",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("yoga");
  await page
    .getByRole("combobox", { name: "Dónde", exact: true })
    .selectOption("hotel");
  await expect(page.locator(".catalogue-grid").first()).toContainText(
    "Espacio para respirar",
  );
  await expect(page.locator(".catalogue-grid").first()).toContainText(
    "fecha por confirmar",
  );
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".calendar-list")).toHaveCount(2);
});
test("server-assigned cards require staff for scanning, revocation works and a double scan never awards points", async ({
  page,
  browser,
}) => {
  await demo(page);
  await page.goto("/en/account/card/");
  await expect(page.locator(".account-content .member-card")).toContainText(
    "Gold",
  );
  await page
    .getByRole("button", { name: "Show / refresh my personal QR" })
    .click();
  await expect(page.locator(".personal-qr img")).toBeVisible();
  const token = await page.locator(".personal-qr code").textContent();
  const origin = new URL(page.url()).origin;
  const unauthorised = await page.request.post("/api/v2/staff/scan", {
    headers: { Origin: origin },
    data: { token },
  });
  expect(unauthorised.status()).toBe(403);
  const state = await page.context().storageState();
  const context = await browser.newContext({ storageState: state });
  const staff = await context.newPage();
  await demo(staff, "staff");
  await staff.goto("/admin/");
  await staff.getByRole("button", { name: "Scan a card", exact: true }).click();
  await staff.getByLabel("Personal code (manual entry)").fill(token!);
  await staff
    .getByRole("button", { name: "Identify member", exact: true })
    .click();
  await expect(staff.locator(".inset-panel")).toContainText("100 points");
  await staff
    .getByRole("button", { name: "Identify member", exact: true })
    .click();
  await expect(staff.locator(".inset-panel")).toContainText("100 points");
  await page.getByRole("button", { name: "Revoke my card codes" }).click();
  await expect(page.getByRole("status")).toContainText("revoked");
  await staff
    .getByRole("button", { name: "Identify member", exact: true })
    .click();
  await expect(staff.locator(".staff-status")).toContainText(
    "expired or was revoked",
  );
  await context.close();
});
test("mobile and tablet private routes fit, and authenticated data is never put in public caches", async ({
  page,
}) => {
  await demo(page);
  await page.goto('/en/');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/es/account/profile/",
      "/es/account/card/",
      "/es/explore/",
    ]) {
      await page.goto(path);
      await expect(page.locator(".portal-main")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  await page.goto("/en/account/");
  const response = await page.request.get("/api/v2/account");
  expect(response.headers()["cache-control"]).toContain("private");
  const keys = await page.evaluate(async () => {
    const result: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("el-sanctuario-21-")) continue;
      for (const request of await (await caches.open(name)).keys())
        result.push(new URL(request.url).pathname);
    }
    return result;
  });
  expect(keys.some(p=>p==='/en/')).toBe(true);
  expect(
    keys.some(
      (p) =>
        p.includes("/account") ||
        p.startsWith("/api/") ||
        p.startsWith("/admin/"),
    ),
  ).toBe(false);
});
