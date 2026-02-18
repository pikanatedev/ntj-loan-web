export type StaffUser = { id: string; name: string; role: 'sale' | 'approver' | 'manager' }

export type LoanAttachment = {
  id: string
  loan_id: string
  file_path: string
  file_name: string
  /** รหัสประเภทเอกสารตามเช็คลิสต์ (เช่น vehicle_book_original, land_deed_copy) */
  document_type?: string | null
}

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

/** ข้อมูลผู้กู้สินเชื่อ (แบบฟอร์มขยาย) — เก็บในคอลัมน์ borrower_info (jsonb) */
export type BorrowerInfo = {
  /** 1. ข้อมูลส่วนตัว */
  id_card_expiry_date?: string | null
  nationality?: string | null
  age?: number | null
  marital_status?: string | null
  children_count?: number | null
  company_history?: string | null
  company_history_type?: string | null
  education_level?: string | null
  payer?: string | null
  car_user?: string | null
  car_user_name?: string | null
  car_user_phone?: string | null
  /** 2. ที่อยู่ปัจจุบัน */
  address_no?: string | null
  address_moo?: string | null
  address_village?: string | null
  address_soi?: string | null
  address_road?: string | null
  address_subdistrict?: string | null
  address_district?: string | null
  address_province?: string | null
  address_postal_code?: string | null
  address_type?: string | null
  address_years?: number | null
  ownership_type?: string | null
  rent_amount?: number | null
  /** 3. ช่องทางการติดต่อ */
  phone_home?: string | null
  phone_work?: string | null
  phone_fax?: string | null
  mobile_phone?: string | null
  email?: string | null
  line_id?: string | null
  facebook?: string | null
  instagram?: string | null
  map_note?: string | null
  /** 4. อาชีพและรายได้ */
  occupation_type?: string | null
  business_size?: string | null
  business_type?: string | null
  asset_value?: number | null
  land_value?: number | null
  employee_count?: number | null
  workplace_name?: string | null
  workplace_address?: string | null
  position?: string | null
  department?: string | null
  income_salary?: number | null
  income_commission?: number | null
  income_other?: number | null
  income_foreign_country?: string | null
  income_foreign_amount?: number | null
  payment_channel?: string | null
  bank_name?: string | null
  bank_account?: string | null
  payment_other?: string | null
  years_current_job?: number | null
  years_total_job?: number | null
  prev_workplace_name?: string | null
  prev_position?: string | null
  prev_department?: string | null
  monthly_car_installment?: number | null
  monthly_house_installment?: number | null
}

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
  /** ประเภทเชื้อเพลิง: ดีเซล, เบนซิน, แก๊ส, ไฮบริด, ไฟฟ้า, อื่นๆ */
  car_fuel_type?: string | null
  registration_date?: string | null
  /** จังหวัดที่จดทะเบียนรถ (ตามป้ายทะเบียน) */
  registration_province?: string | null
  car_details?: string | null
  /** ข้อมูลที่อยู่อาศัย (โฉนดที่ดิน) */
  residence_address?: string | null
  land_deed_no?: string | null
  residence_details?: string | null
  term_months?: number | null
  interest_rate?: number | null
  id_card_number?: string | null
  birth_date?: string | null
  /** ข้อมูลผู้กู้สินเชื่อแบบขยาย (แบบฟอร์ม 4 ส่วน) */
  borrower_info?: BorrowerInfo | null
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
