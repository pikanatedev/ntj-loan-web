/**
 * ส่ง SMS ผ่าน EazySMS API
 * ใช้ env: EAZYSMS_BASE_URL, EAZYSMS_CLIENT_ID, EAZYSMS_CLIENT_SECRET
 */

const EAZYSMS_BASE_URL = process.env.EAZYSMS_BASE_URL ?? 'https://api.eazysms.io'
const EAZYSMS_CLIENT_ID = process.env.EAZYSMS_CLIENT_ID
const EAZYSMS_CLIENT_SECRET = process.env.EAZYSMS_CLIENT_SECRET

const SENDER_NAME = process.env.EAZYSMS_SENDER_NAME ?? 'SMSNOTI'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '66')
}

export type SendSmsResult = { ok: boolean; error?: string }

/**
 * ส่ง SMS ไปยังเบอร์เดียวหรือหลายเบอร์ (ข้อความเดียวกัน)
 */
export async function sendSms(phones: string[], message: string): Promise<SendSmsResult> {
  if (!phones.length || !message.trim()) {
    return { ok: false, error: 'phones or message is empty' }
  }
  if (!EAZYSMS_CLIENT_ID || !EAZYSMS_CLIENT_SECRET) {
    console.warn('[SMS] EAZYSMS_CLIENT_ID or EAZYSMS_CLIENT_SECRET not set, skip sending')
    return { ok: false, error: 'SMS not configured' }
  }

  const transaction = phones.filter((p) => p && String(p).trim()).map((phone) => ({
    phone: normalizePhone(phone),
    message: message.trim(),
  }))
  if (!transaction.length) return { ok: false, error: 'No valid phones' }

  const url = `${EAZYSMS_BASE_URL.replace(/\/$/, '')}/sms-service/request/create`
  const body = {
    data: {
      type_request: 'normal',
      type_message: 'custom',
      type_send: 'now',
      sender_name: SENDER_NAME,
      transaction,
    },
  }
  const headers = {
    'X-Client-Id': EAZYSMS_CLIENT_ID,
    'X-Client-Secret': EAZYSMS_CLIENT_SECRET,
    'Content-Type': 'application/json',
  }
  console.log('[SMS] request', { url, headers: { ...headers, 'X-Client-Secret': '***' }, body })
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[SMS] API error', res.status, text)
      return { ok: false, error: `SMS API ${res.status}: ${text.slice(0, 200)}` }
    }
    console.log('[SMS] API response', await res.json())
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SMS] send failed', msg)
    return { ok: false, error: msg }
  }
}
