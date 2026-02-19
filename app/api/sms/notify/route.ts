import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { sendSms } from '@/lib/sms'

/** สถานะการเปลี่ยนที่ต้องการส่ง SMS */
export type SmsScenario =
  | 1  // พนักงานขายสร้างเคสใหม่ -> แจ้งผู้อนุมัติ
  | 2  // ผู้อนุมัติส่งกลับไปแก้ไข -> แจ้งเจ้าของเคส
  | 3  // เจ้าของเคสแก้ไขแล้ว -> แจ้งผู้อนุมัติ
  | 4  // ผู้อนุมัติอนุมัติ -> แจ้งเจ้าของเคส
  | 5  // ผู้อนุมัติปฏิเสธ -> แจ้งเจ้าของเคส

type NotifyBody = { scenario: SmsScenario; loanId: string }

function loanLabel(loan: { loan_reference_number?: string | null; customer_name?: string | null }): string {
  const ref = loan.loan_reference_number?.trim()
  const name = loan.customer_name?.trim()
  if (ref && name) return `${ref} (${name})`
  if (ref) return ref
  if (name) return name
  return 'เคสสินเชื่อ'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NotifyBody
    const { scenario, loanId } = body
    if (!loanId || ![1, 2, 3, 4, 5].includes(Number(scenario))) {
      return NextResponse.json(
        { error: 'ต้องส่ง scenario (1-5) และ loanId' },
        { status: 400 }
      )
    }
    const supabase = createSupabaseServerClient()
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, loan_reference_number, customer_name, sale_id, approver_id, status')
      .eq('id', loanId)
      .single()
    if (loanError || !loan) {
      return NextResponse.json({ error: 'ไม่พบเคสสินเชื่อ' }, { status: 404 })
    }
    const label = loanLabel(loan)
    let phones: string[] = []
    let message = ''

    if (scenario === 1) {
      const { data: approvers } = await supabase
        .from('staff')
        .select('phone')
        .eq('role', 'approver')
      phones = (approvers ?? [])
        .map((r) => (r as { phone?: string | null }).phone)
        .filter((p): p is string => Boolean(p && String(p).trim()))
      message = `[NTJ] มีเคสสินเชื่อใหม่รอตรวจสอบ: ${label}`
    } else if (scenario === 2 || scenario === 4 || scenario === 5) {
      if (!loan.sale_id) {
        return NextResponse.json({ error: 'เคสนี้ไม่มีเจ้าของ (sale_id)' }, { status: 400 })
      }
      const { data: sale } = await supabase
        .from('staff')
        .select('phone')
        .eq('id', loan.sale_id)
        .single()
      const phone = (sale as { phone?: string | null } | null)?.phone
      if (phone && String(phone).trim()) phones = [String(phone).trim()]
      if (scenario === 2) message = `[NTJ] เคส ${label} ถูกส่งกลับไปแก้ไข กรุณาแก้ไขและส่งกลับ`
      else if (scenario === 4) message = `[NTJ] เคส ${label} อนุมัติแล้ว`
      else message = `[NTJ] เคส ${label} ถูกปฏิเสธ`
    } else if (scenario === 3) {
      const approverId = loan.approver_id
      if (approverId) {
        const { data: approver } = await supabase
          .from('staff')
          .select('phone')
          .eq('id', approverId)
          .single()
        const phone = (approver as { phone?: string | null } | null)?.phone
        if (phone && String(phone).trim()) phones = [String(phone).trim()]
      }
      if (phones.length === 0) {
        const { data: approvers } = await supabase
          .from('staff')
          .select('phone')
          .eq('role', 'approver')
        phones = (approvers ?? [])
          .map((r) => (r as { phone?: string | null }).phone)
          .filter((p): p is string => Boolean(p && String(p).trim()))
      }
      message = `[NTJ] เคส ${label} ถูกแก้ไขแล้ว รอตรวจสอบ`
    }

    if (phones.length === 0) {
      return NextResponse.json(
        { sent: false, reason: 'ไม่มีเบอร์ปลายทางที่ลงทะเบียน' },
        { status: 200 }
      )
    }
    const result = await sendSms(phones, message)
    if (!result.ok) {
      return NextResponse.json(
        { sent: false, error: result.error },
        { status: 502 }
      )
    }
    return NextResponse.json({ sent: true })
  } catch (err) {
    if (String(err).includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Server ไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY สำหรับส่ง SMS' },
        { status: 503 }
      )
    }
    console.error('[SMS notify]', err)
    return NextResponse.json({ error: 'ส่ง SMS ไม่สำเร็จ' }, { status: 500 })
  }
}
