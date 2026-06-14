// PDM System — E2E Smoke Tests
// Run: npx playwright test --config playwright.config.ts

import { test, expect } from "@playwright/test";

test.describe("PDM System E2E", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=安纳瑞 PDM")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button")).toBeVisible();
  });

  test("dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/");
    // Should redirect to login
    await page.waitForURL("**/login", { timeout: 10000 });
  });

  test("auth callback page renders", async ({ page }) => {
    await page.goto("/auth/callback");
    await page.waitForLoadState("networkidle");
  });

  test("health endpoint returns 200", async ({ request }) => {
    const resp = await request.get("http://localhost:8000/api/health");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.status).toBeTruthy();
  });

  test("feishu login URL returns valid URL", async ({ request }) => {
    const resp = await request.get("http://localhost:8000/api/v1/auth/feishu/login");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data.auth_url).toContain("open.feishu.cn");
    expect(data.state).toBeTruthy();
  });

  test("protected endpoints require auth", async ({ request }) => {
    const endpoints = [
      "/api/v1/products",
      "/api/v1/projects",
      "/api/v1/suppliers",
      "/api/v1/certifications",
      "/api/v1/analytics/overview",
      "/api/v1/dashboard/stats",
    ];
    for (const path of endpoints) {
      const resp = await request.get(`http://localhost:8000${path}`);
      expect(resp.status()).toBe(401);
    }
  });

  test("CORS headers present on API", async ({ request }) => {
    const resp = await request.get("http://localhost:8000/api/health", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(resp.headers()["access-control-allow-origin"]).toBeTruthy();
  });

  test("security headers present", async ({ request }) => {
    const resp = await request.get("http://localhost:8000/api/health");
    expect(resp.headers()["x-content-type-options"]).toBe("nosniff");
    expect(resp.headers()["x-frame-options"]).toBe("DENY");
  });
});
