export type StaffUser = { id: string; name: string; role: 'sale' | 'approver' }

export type LoanAttachment = { id: string; loan_id: string; file_path: string; file_name: string }

export type Loan = {
  id: string
  sale_id?: string | null
  submission_date?: string | null
  customer_name?: string | null
  license_plate?: string | null
  loan_amount?: number | null
  closing_amount?: number | null
  car_brand?: string | null
  car_model?: string | null
  car_type?: string | null
  registration_date?: string | null
  car_details?: string | null
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
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('th-TH')
  } catch {
    return value
  }
}
