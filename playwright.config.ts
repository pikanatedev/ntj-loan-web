import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests for Loan Web Application
 * รันเทส: npm run test:e2e
 * ต้องมีแอปรันที่ http://localhost:3000 (หรือ set BASE_URL)
 * สำหรับเทสที่ต้อง login ใช้ env PLAYWRIGHT_TEST_PIN = PIN 6 หลักของ staff ทดสอบ
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ใช้ Chrome ที่ติดตั้งบนเครื่อง (ไม่ต้องรัน playwright install)
        channel: 'chrome',
      },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
