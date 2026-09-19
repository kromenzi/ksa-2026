const { test, expect } = require("@playwright/test");

const baseURL = process.env.E2E_BASE_URL || "https://abdulkarem-board-2026.vercel.app";

test.describe("Safety Board production smoke", () => {
  test("public shell and health endpoint are healthy", async ({ page, request }) => {
    const health = await request.get(`${baseURL}/api/health`);
    expect(health.ok()).toBeTruthy();
    const payload = await health.json();
    expect(payload.status).toBe("healthy");
    expect(payload.backend).toBe("supabase");

    await page.goto(baseURL, { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/UTEC SAFETY BOARD/i);
  });

  test("protected admin route redirects unauthenticated users", async ({ page }) => {
    await page.goto(`${baseURL}/admin/dashboard`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("live meeting API rejects unauthenticated access", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/live-meetings`);
    expect(response.status()).toBe(401);
  });

  test("mobile login has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/admin/login`, { waitUntil: "networkidle" });
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
  });
});


test.describe("authenticated Safety Board smoke", () => {
  test("admin login reaches protected operational modules", async ({ page, request }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!email || !password, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD secrets are not configured");

    await page.goto(`${baseURL}/admin/login`, { waitUntil: "networkidle" });
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByTestId("button-login-submit").click();
    await page.waitForURL(/\/admin\/dashboard$/, { timeout: 15000 });

    const protectedApi = await page.request.get(`${baseURL}/api/hse-workflows`);
    expect(protectedApi.status()).toBe(200);

    for (const route of [
      "/admin/hse-workflows",
      "/admin/safety-intelligence",
      "/admin/live-meeting",
      "/admin/import-center",
    ]) {
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/admin\/login$/);
      await expect(page.locator("body")).not.toContainText(/Access denied|غير مصرح بالدخول/i);
    }
  });
});
