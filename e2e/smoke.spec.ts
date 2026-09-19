import { expect, test } from "@playwright/test";

test("application shell loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
});

test("health endpoint is reachable or protected", async ({ request }) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect([200, 302, 401, 403]).toContain(response.status());
});
