export type StaffUser = { id: string; name: string; role: 'sale' | 'approver' | 'manager' }

export type LoanAttachment = { id: string; loan_id: string; file_path: string; file_name: string }

/** ประวัติการดำเนินการของผู้อนุมัติ (ส่งกลับไปแก้ไข, อนุมัติ, ปฏิเสธ) */
export type LoanApprovalHistoryEntry = {
  id: string
  loan_id: string
  action: string
  comment?: string | null
  staff_name?: string | null
  created_at?: string | null
}

/** ประเภทสินเชื่อ: รถยนต์ส่วนบุคคล | รถยนต์เชิงพาณิชย์ | โฉนดที่ดิน */
export type LoanType = 'personal_car' | 'commercial_vehicle' | 'land_title'

export type Loan = {
  id: string
  sale_id?: string | null
  loan_reference_number?: string | null
  submission_date?: string | null
  customer_name?: string | null
  license_plate?: string | null
  loan_amount?: number | null
  closing_amount?: number | null
  /** ประเภทสินเชื่อ */
  loan_type?: LoanType | string | null
  car_brand?: string | null
  car_model?: string | null
  car_type?: string | null
  registration_date?: string | null
  car_details?: string | null
  /** ข้อมูลที่อยู่อาศัย (โฉนดที่ดิน) */
  residence_address?: string | null
  land_deed_no?: string | null
  residence_details?: string | null
  term_months?: number | null
  interest_rate?: number | null
  id_card_number?: string | null
  birth_date?: string | null
  status?: string | null
  approver_comment?: string | null
  approver_name?: string | null
  sales_name?: string | null
  created_at?: string | null
  loan_attachments?: LoanAttachment[]
}

export function formatNum(value: number | null | undefined): string {
  return value == null ? '—' : Number(value).toLocaleString()
}

export function formatDate(value: string | null | undefined): string {
  if (value == null || !value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      calendar: 'buddhist',
    })
  } catch {
    return value
  }
}
