/**
 * เช็คลิสต์เอกสารสินเชื่อ ตามประเภทธุรกิจ
 * - จำนำเล่มทะเบียนรถ: ใช้กับ loan_type = personal_car | commercial_vehicle
 * - จำนองโฉนดที่ดิน: ใช้กับ loan_type = land_title
 */

export type DocumentChecklistCategory = 'vehicle_pledge' | 'land_deed'

export type DocumentChecklistItem = {
  key: string
  label: string
}

/** 1) จำนำเล่มทะเบียนรถ */
export const VEHICLE_PLEDGE_CHECKLIST: DocumentChecklistItem[] = [
  { key: 'vehicle_book_original', label: 'เล่มทะเบียนรถตัวจริง' },
  { key: 'vehicle_book_copy', label: 'สำเนาเล่มทะเบียนรถทุกหน้า' },
  { key: 'vehicle_photos', label: 'รูปรถปัจจุบัน (หน้า-หลัง-ด้านข้าง-เลขไมล์)' },
  { key: 'chassis_photo', label: 'รูปเลขตัวถัง (Chassis No.)' },
  { key: 'id_card_borrower', label: 'บัตรประชาชนผู้กู้' },
  { key: 'house_reg_borrower', label: 'ทะเบียนบ้านผู้กู้' },
  { key: 'marriage_cert_or_consent', label: 'ทะเบียนสมรส / หนังสือยินยอมคู่สมรส (ถ้ามี)' },
  { key: 'statement_3_6_months', label: 'Statement 3–6 เดือน' },
  { key: 'income_docs', label: 'เอกสารรายได้ (ถ้ามี)' },
  { key: 'closing_balance_letter', label: 'หนังสือยอดปิดบัญชีเดิม (กรณีรีไฟแนนซ์)' },
]

/** 2) จำนองโฉนดที่ดิน */
export const LAND_DEED_CHECKLIST: DocumentChecklistItem[] = [
  { key: 'land_deed_original', label: 'โฉนดที่ดินตัวจริง (น.ส.4 จ.)' },
  { key: 'land_deed_copy', label: 'สำเนาโฉนดทุกหน้า' },
  { key: 'land_deed_registry_check', label: 'ตรวจสารบัญจดทะเบียนด้านหลัง' },
  { key: 'land_property_photos', label: 'รูปถ่ายที่ดิน/บ้าน/อาคาร' },
  { key: 'id_card_owner', label: 'บัตรประชาชนเจ้าของที่ดิน' },
  { key: 'house_reg_owner', label: 'ทะเบียนบ้านเจ้าของที่ดิน' },
  { key: 'marriage_cert_or_consent_land', label: 'ทะเบียนสมรส / หนังสือยินยอมคู่สมรส (ถ้ามี)' },
  { key: 'statement_6_months', label: 'Statement 6 เดือน' },
  { key: 'income_docs_land', label: 'เอกสารรายได้ (ถ้ามี)' },
  { key: 'closing_balance_letter_land', label: 'หนังสือยอดปิดบัญชีเดิม (กรณีรีไฟแนนซ์)' },
]

export function getDocumentChecklist(loanType: string): DocumentChecklistItem[] {
  if (loanType === 'land_title') return LAND_DEED_CHECKLIST
  return VEHICLE_PLEDGE_CHECKLIST
}

export function getDocumentTypeLabel(loanType: string, documentTypeKey: string): string {
  const list = getDocumentChecklist(loanType)
  const item = list.find((i) => i.key === documentTypeKey)
  return item?.label ?? documentTypeKey
}
