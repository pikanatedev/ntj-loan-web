import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('แสดงหน้า login และฟอร์มกรอก PIN', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' })).toBeVisible()
    await expect(page.getByTestId('login-pin-input')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toHaveText('เข้าสู่ระบบ')
  })

  test('กรอก PIN ไม่ถูกต้อง แล้วกดเข้าสู่ระบบ แสดงข้อความ error', async ({ page }) => {
    await page.getByTestId('login-pin-input').fill('000000')
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('PIN ไม่ถูกต้อง')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' })).toBeVisible()
  })

  test('กรอก PIN ที่ถูกต้อง แล้วเข้าสู่ระบบได้ และเห็นหน้ารายการ', async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN สำหรับเทส login ด้วย PIN ถูกต้อง')

    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()

    await expect(page.getByRole('heading', { name: /ระบบอนุมัติสินเชื่อ/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible()
    await expect(page.getByTestId('login-pin-input')).not.toBeVisible()
  })

  test('หลัง login แล้วกดออกจากระบบ กลับมาเห็นหน้า PIN', async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN สำหรับเทส logout')

    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('header-logout').click()
    await expect(page.getByText('ต้องการออกจากระบบจริงหรือไม่?')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'ออกจากระบบ' }).click()

    await expect(page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('login-pin-input')).toBeVisible()
  })

  test('ยกเลิกการออกจากระบบ ไม่ได้ logout', async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN')

    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('header-logout').click()
    await page.getByRole('button', { name: 'ยกเลิก' }).click()

    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' })).not.toBeVisible()
  })
})
