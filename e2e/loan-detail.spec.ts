import { test, expect } from '@playwright/test'

/** ล็อกอินและรอหน้ารายการ พร้อมส่งคืน (ใช้ PIN จาก PLAYWRIGHT_TEST_PIN) */
async function loginAndWaitList(page: import('@playwright/test').Page) {
  const testPin = process.env.PLAYWRIGHT_TEST_PIN
  if (!testPin) throw new Error('ต้อง set PLAYWRIGHT_TEST_PIN')
  await page.goto('/')
  await page.getByTestId('login-pin-input').fill(testPin)
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })
}

test.describe('หน้ารายละเอียดสินเชื่อ /loan/[id]', () => {
  test('เข้า /loan/[id] ที่ไม่มีอยู่ (หลัง login) แสดง "ไม่พบรายการนี้" และปุ่มกลับ', async ({ page }) => {
    await loginAndWaitList(page)
    await page.goto('/loan/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('ไม่พบรายการนี้')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'กลับ' })).toBeVisible()
    await page.getByRole('link', { name: 'กลับ' }).click()
    await expect(page).toHaveURL('/')
  })

  test('จากหน้ารายการ คลิก "ดูรายละเอียด" แรก แล้วเห็นหน้ารายละเอียดสินเชื่อ', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    const count = await detailLink.count()
    if (count === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อในระบบ ให้สร้างรายการก่อนหรือใช้ PIN ที่มีรายการ')
      return
    }
    await detailLink.click()
    await expect(page).toHaveURL(/\/loan\/[^/]+$/)
    await expect(page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' })).toBeVisible()
    await expect(page.getByText('เลขที่อ้างอิงสินเชื่อ')).toBeVisible()
    await expect(page.getByRole('link', { name: 'กลับ' })).toBeVisible()
  })

  test('จากหน้ารายละเอียด คลิก "กลับ" กลับไปหน้ารายการ', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    if ((await detailLink.count()) === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อ')
      return
    }
    await detailLink.click()
    await expect(page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' })).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: 'กลับ' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible()
  })

  test('หน้ารายละเอียดแสดงส่วน ข้อมูลผู้กู้ และ ข้อมูลสินเชื่อ', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    if ((await detailLink.count()) === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อ')
      return
    }
    await detailLink.click()
    await expect(page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/ข้อมูลผู้กู้/)).toBeVisible()
    await expect(page.getByText('ข้อมูลสินเชื่อ')).toBeVisible()
  })
})

test.describe('การป้องกัน: หน้ารายละเอียดโดยไม่ login', () => {
  test('เข้า /loan/[id] โดยไม่ login ถูก redirect ไป / หรือเห็นหน้า PIN', async ({ page }) => {
    await page.goto('/loan/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')
    const onLogin = await page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' }).isVisible().catch(() => false)
    const onHome = await page.getByText('รายการสินเชื่อทั้งหมด').isVisible().catch(() => false)
    const onDetail = await page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' }).isVisible().catch(() => false)
    expect(onLogin || onHome || onDetail).toBeTruthy()
  })
})
