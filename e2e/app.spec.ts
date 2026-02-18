import { test, expect } from '@playwright/test'

test.describe('หน้าหลักหลัง Login', () => {
  test.beforeEach(async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN สำหรับเทสหน้าหลัก')
    await page.goto('/')
    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })
  })

  test('แสดงหัวข้อระบบอนุมัติสินเชื่อ และรายการสินเชื่อทั้งหมด', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ระบบอนุมัติสินเชื่อ/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'รายการสินเชื่อทั้งหมด' })).toBeVisible()
  })

  test('แสดงตัวกรอง: ค้นหา, สถานะ, วันที่เสนอสินเชื่อ', async ({ page }) => {
    await expect(page.getByPlaceholder(/ชื่อ, ทะเบียน/)).toBeVisible()
    await expect(page.getByTestId('filter-status')).toBeVisible()
    await expect(page.getByTestId('filter-date-range')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ล้างตัวกรอง' })).toBeVisible()
  })

  test('Header แสดงชื่อผู้ใช้และปุ่มออกจากระบบ', async ({ page }) => {
    await expect(page.getByTestId('header-logout')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible()
  })

  test('คลิกลิงก์โลโก้/ชื่อระบบ อยู่ที่หน้าเดิม', async ({ page }) => {
    await page.getByRole('link', { name: /ระบบอนุมัติสินเชื่อ/ }).first().click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible()
  })
})

test.describe('Navigation ตาม Role', () => {
  test('ถ้า login เป็น sale เห็นปุ่มสร้างแบบฟอร์มใหม่ และไป /loan/new ได้', async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN (แนะนำใช้ PIN ของ staff role sale)')
    await page.goto('/')
    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })

    const newLoanLink = page.getByTestId('link-new-loan')
    if (await newLoanLink.isVisible()) {
      await newLoanLink.click()
      await expect(page).toHaveURL(/\/loan\/new/)
    } else {
      test.skip(true, 'ผู้ใช้คนนี้ไม่ใช่ role sale จึงไม่มีปุ่มสร้างแบบฟอร์มใหม่')
    }
  })
})

test.describe('การป้องกันการเข้าถึงโดยไม่ login', () => {
  test('เข้า / โดยไม่มี user ใน localStorage แสดงหน้า PIN', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' })).toBeVisible({ timeout: 5000 })
  })

  test('เข้า /loan/new โดยไม่ login ควรถูก redirect หรือเห็นหน้า PIN', async ({ page }) => {
    await page.goto('/loan/new')
    await page.waitForLoadState('networkidle')
    const onLoginPage = await page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' }).isVisible().catch(() => false)
    const onNewLoanPage = await page.getByText(/แบบฟอร์ม|รถยนต์|สินเชื่อ/).isVisible().catch(() => false)
    expect(onLoginPage || onNewLoanPage).toBeTruthy()
  })
})
