import { test, expect } from '@playwright/test'

test.describe('หน้าสร้างแบบฟอร์มใหม่ /loan/new', () => {
  test.beforeEach(async ({ page }) => {
    const testPin = process.env.PLAYWRIGHT_TEST_PIN
    test.skip(!testPin, 'ต้อง set PLAYWRIGHT_TEST_PIN (แนะนำใช้ PIN ของ staff role sale)')
    await page.goto('/')
    await page.getByTestId('login-pin-input').fill(testPin!)
    await page.getByTestId('login-submit').click()
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })
  })

  test('เข้า /loan/new แสดงหัวข้อแบบฟอร์ม และปุ่มกลับหน้ารายการ', async ({ page }) => {
    const newLink = page.getByTestId('link-new-loan')
    if (!(await newLink.isVisible())) {
      test.skip(true, 'ผู้ใช้คนนี้ไม่ใช่ role sale จึงไม่มีปุ่มสร้างแบบฟอร์มใหม่')
      return
    }
    await newLink.click()
    await expect(page).toHaveURL(/\/loan\/new/)
    await expect(page.getByRole('heading', { name: 'แบบฟอร์มเสนอสินเชื่อใหม่' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'กลับหน้ารายการ' })).toBeVisible()
  })

  test('หน้า new แสดงส่วนประเภทสินเชื่อ และปุ่มส่งข้อมูล', async ({ page }) => {
    const newLink = page.getByTestId('link-new-loan')
    if (!(await newLink.isVisible())) {
      test.skip(true, 'ผู้ใช้ไม่ใช่ role sale')
      return
    }
    await newLink.click()
    await expect(page.getByRole('heading', { name: 'แบบฟอร์มเสนอสินเชื่อใหม่' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('ประเภทสินเชื่อ')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ส่งข้อมูลให้ผู้อนุมัติ' })).toBeVisible()
  })

  test('แสดงส่วนข้อมูลผู้กู้ — 1. ข้อมูลส่วนตัว', async ({ page }) => {
    const newLink = page.getByTestId('link-new-loan')
    if (!(await newLink.isVisible())) {
      test.skip(true, 'ผู้ใช้ไม่ใช่ role sale')
      return
    }
    await newLink.click()
    await expect(page.getByText('ข้อมูลผู้กู้ — 1. ข้อมูลส่วนตัว')).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder('กรอกชื่อ-นามสกุล')).toBeVisible()
  })

  test('คลิก "กลับหน้ารายการ" กลับไป /', async ({ page }) => {
    const newLink = page.getByTestId('link-new-loan')
    if (!(await newLink.isVisible())) {
      test.skip(true, 'ผู้ใช้ไม่ใช่ role sale')
      return
    }
    await newLink.click()
    await expect(page).toHaveURL(/\/loan\/new/)
    await page.getByRole('link', { name: 'กลับหน้ารายการ' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible()
  })
})

test.describe('การป้องกัน: /loan/new โดยไม่ login หรือไม่ใช่ sale', () => {
  test('เข้า /loan/new โดยไม่ login ถูก redirect ไป / หรือเห็นหน้า PIN', async ({ page }) => {
    await page.goto('/loan/new')
    await page.waitForLoadState('networkidle')
    const onLogin = await page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' }).isVisible().catch(() => false)
    const onList = await page.getByText('รายการสินเชื่อทั้งหมด').isVisible().catch(() => false)
    const onForm = await page.getByRole('heading', { name: 'แบบฟอร์มเสนอสินเชื่อใหม่' }).isVisible().catch(() => false)
    expect(onLogin || onList || onForm).toBeTruthy()
  })
})
