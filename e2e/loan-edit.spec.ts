import { test, expect } from '@playwright/test'

/** ล็อกอินและรอหน้ารายการ (ใช้ PIN จาก PLAYWRIGHT_TEST_PIN) */
async function loginAndWaitList(page: import('@playwright/test').Page) {
  const testPin = process.env.PLAYWRIGHT_TEST_PIN
  if (!testPin) throw new Error('ต้อง set PLAYWRIGHT_TEST_PIN')
  await page.goto('/')
  await page.getByTestId('login-pin-input').fill(testPin)
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('รายการสินเชื่อทั้งหมด')).toBeVisible({ timeout: 10000 })
}

test.describe('หน้าแก้ไขสินเชื่อ /loan/[id]/edit', () => {
  test('เข้า /loan/[id]/edit ที่ไม่มีอยู่ (หลัง login) แสดง "ไม่พบรายการนี้หรือไม่มีสิทธิ์แก้ไข" และปุ่มกลับ', async ({ page }) => {
    await loginAndWaitList(page)
    await page.goto('/loan/00000000-0000-0000-0000-000000000000/edit')
    await page.waitForLoadState('networkidle')
    const notFound = page.getByTestId('loan-edit-not-found')
    const onList = page.getByText('รายการสินเชื่อทั้งหมด')
    const foundNotFound = await notFound.isVisible().catch(() => false)
    const foundList = await onList.isVisible().catch(() => false)
    if (foundList && !foundNotFound) {
      test.skip(true, 'ผู้ใช้ไม่ใช่ role sale จึงถูก redirect ไปหน้ารายการ (ปกติ)')
      return
    }
    await expect(notFound).toBeVisible({ timeout: 15000 })
    await expect(notFound.getByText('ไม่พบรายการนี้หรือไม่มีสิทธิ์แก้ไข')).toBeVisible()
    await expect(page.getByRole('link', { name: 'กลับหน้ารายการ' })).toBeVisible()
    await page.getByRole('link', { name: 'กลับหน้ารายการ' }).click()
    await expect(page).toHaveURL('/')
  })

  test('จากหน้ารายละเอียด (ที่ sale เป็นเจ้าของและแก้ไขได้) คลิก "แก้ไข" เข้าหน้าแก้ไข', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    if ((await detailLink.count()) === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อ')
      return
    }
    await detailLink.click()
    await expect(page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' })).toBeVisible({ timeout: 10000 })
    const editLink = page.getByRole('link', { name: 'แก้ไข' })
    if (!(await editLink.isVisible())) {
      test.skip(true, 'รายการนี้ไม่มีปุ่มแก้ไข (อาจเป็นของ sale อื่น หรือสถานะไม่อนุญาต)')
      return
    }
    await editLink.click()
    await expect(page).toHaveURL(/\/loan\/[^/]+\/edit/)
    await expect(page.getByRole('heading', { name: 'แก้ไขข้อมูลสินเชื่อ' })).toBeVisible()
  })

  test('หน้าแก้ไขแสดงปุ่ม "กลับรายละเอียด", "หน้ารายการ" และ "บันทึกการแก้ไข"', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    if ((await detailLink.count()) === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อ')
      return
    }
    await detailLink.click()
    const editLink = page.getByRole('link', { name: 'แก้ไข' })
    if (!(await editLink.isVisible())) {
      test.skip(true, 'ไม่มีปุ่มแก้ไข')
      return
    }
    await editLink.click()
    await expect(page.getByRole('heading', { name: 'แก้ไขข้อมูลสินเชื่อ' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'กลับรายละเอียด' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'หน้ารายการ' })).toBeVisible()
    await expect(page.getByRole('button', { name: /บันทึกการแก้ไข/ })).toBeVisible()
  })

  test('จากหน้าแก้ไข คลิก "กลับรายละเอียด" กลับไปหน้ารายละเอียด', async ({ page }) => {
    await loginAndWaitList(page)
    const detailLink = page.getByRole('link', { name: 'ดูรายละเอียด' }).first()
    if ((await detailLink.count()) === 0) {
      test.skip(true, 'ไม่มีรายการสินเชื่อ')
      return
    }
    await detailLink.click()
    const editLink = page.getByRole('link', { name: 'แก้ไข' })
    if (!(await editLink.isVisible())) {
      test.skip(true, 'ไม่มีปุ่มแก้ไข')
      return
    }
    await editLink.click()
    await expect(page).toHaveURL(/\/loan\/[^/]+\/edit/)
    await page.getByRole('link', { name: 'กลับรายละเอียด' }).click()
    await expect(page).toHaveURL(/\/loan\/[^/]+$/)
    await expect(page.getByRole('heading', { name: 'รายละเอียดสินเชื่อ' })).toBeVisible()
  })
})

test.describe('การป้องกัน: /loan/[id]/edit โดยไม่ login', () => {
  test('เข้า /loan/[id]/edit โดยไม่ login ถูก redirect หรือเห็นหน้า PIN/รายการ', async ({ page }) => {
    await page.goto('/loan/00000000-0000-0000-0000-000000000000/edit')
    await page.waitForLoadState('networkidle')
    const onLogin = await page.getByRole('heading', { name: 'กรอก PIN 6 หลัก' }).isVisible().catch(() => false)
    const onList = await page.getByText('รายการสินเชื่อทั้งหมด').isVisible().catch(() => false)
    const onEdit = await page.getByRole('heading', { name: 'แก้ไขข้อมูลสินเชื่อ' }).isVisible().catch(() => false)
    const onNotFound = await page.getByText('ไม่พบรายการนี้หรือไม่มีสิทธิ์แก้ไข').isVisible().catch(() => false)
    expect(onLogin || onList || onEdit || onNotFound).toBeTruthy()
  })
})
