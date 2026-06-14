# PDM Frontend E2E Tests — Playwright
# Run: npx playwright test
# Install: npx playwright install chromium

name: PDM E2E Tests
rootDir: frontend
testDir: e2e
timeout: 30000
retries: 1
use:
  baseURL: http://localhost:5173
  headless: true
  viewport: { width: 1280, height: 720 }
  screenshot: only-on-failure
  trace: retain-on-failure
projects:
  - name: chromium
    use:
      browserName: chromium
