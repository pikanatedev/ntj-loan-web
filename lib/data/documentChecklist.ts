/**
 * เช็คลิสต์เอกสารสินเชื่อ จัดตาม Card ในฟอร์ม
 * แต่ละ section ตรงกับหัวข้อ Card ในแบบฟอร์ม
 */

export type DocumentChecklistItem = {
  key: string
  label: string
}

export type DocumentSection = {
  /** ต้องตรงกับหัวข้อ Card ในฟอร์ม (เช่น ข้อมูลผู้กู้ — 1. ข้อมูลส่วนตัว) */
  cardTitle: string
  items: DocumentChecklistItem[]
  /** แสดงเฉพาะเมื่อ loan_type ตรง (vehicle = personal_car | commercial_vehicle) */
  showWhenLoanType?: 'vehicle' | 'land_title'
}

/** รายการเอกสาร Card 1 ข้อมูลส่วนตัว (ใช้ในฟอร์มโดยตรง ไม่ต้อง match ข้อความ) */
export const DOC_ITEMS_BORROWER_PERSONAL: DocumentChecklistItem[] = [
  { key: 'id_card_borrower', label: 'บัตรประชาชนผู้กู้' },
  { key: 'house_reg_borrower', label: 'ทะเบียนบ้านผู้กู้' },
  { key: 'marriage_cert_or_consent', label: 'ทะเบียนสมรส / หนังสือยินยอมคู่สมรส (ถ้ามี)' },
]

/** รายการเอกสารแยกตาม Card (เรียงตามลำดับในฟอร์ม) */
export const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    cardTitle: 'ข้อมูลผู้กู้ — 1. ข้อมูลส่วนตัว',
    items: DOC_ITEMS_BORROWER_PERSONAL,
  },
  {
    cardTitle: 'ข้อมูลผู้กู้สินเชื่อ — 2. ที่อยู่ปัจจุบัน',
    items: [],
  },
  {
    cardTitle: 'ข้อมูลผู้กู้สินเชื่อ — 3. ช่องทางการติดต่อ',
    items: [],
  },
  {
    cardTitle: 'ข้อมูลผู้กู้สินเชื่อ — 4. อาชีพและรายได้',
    items: [
      { key: 'statement_3_6_months', label: 'Statement 3–6 เดือน' },
      { key: 'income_docs', label: 'เอกสารรายได้ (ถ้ามี)' },
    ],
  },
  {
    cardTitle: 'ประเภทสินเชื่อ',
    items: [],
  },
  {
    cardTitle: 'ข้อมูลรถ',
    showWhenLoanType: 'vehicle',
    items: [
      { key: 'vehicle_book_original', label: 'เล่มทะเบียนรถตัวจริง' },
      { key: 'vehicle_book_copy', label: 'สำเนาเล่มทะเบียนรถทุกหน้า' },
      { key: 'vehicle_photos', label: 'รูปรถปัจจุบัน (หน้า-หลัง-ด้านข้าง-เลขไมล์)' },
      { key: 'chassis_photo', label: 'รูปเลขตัวถัง (Chassis No.)' },
    ],
  },
  {
    cardTitle: 'ข้อมูลโฉนดที่ดิน',
    showWhenLoanType: 'land_title',
    items: [
      { key: 'land_deed_ns3_original', label: 'โฉนดที่ดินตัวจริง (น.ส.3 ก.)' },
      { key: 'land_deed_original', label: 'โฉนดที่ดินตัวจริง (น.ส.4 จ.)' },
      { key: 'land_deed_copy', label: 'สำเนาโฉนดทุกหน้า' },
      { key: 'land_deed_registry_check', label: 'ตรวจสารบัญจดทะเบียนด้านหลัง' },
      { key: 'land_property_photos', label: 'รูปถ่ายที่ดิน/บ้าน/อาคาร' },
    ],
  },
  {
    cardTitle: 'ข้อมูลสินเชื่อ',
    items: [
      { key: 'closing_balance_letter', label: 'หนังสือยอดปิดบัญชีเดิม (กรณีรีไฟแนนซ์)' },
    ],
  },
]

/** รายการเอกสาร Card 4 อาชีพและรายได้ */
export const DOC_ITEMS_INCOME: DocumentChecklistItem[] = DOCUMENT_SECTIONS[3].items
/** รายการเอกสาร Card ข้อมูลรถ */
export const DOC_ITEMS_VEHICLE: DocumentChecklistItem[] = DOCUMENT_SECTIONS[5].items
/** รายการเอกสาร Card ข้อมูลโฉนดที่ดิน */
export const DOC_ITEMS_LAND: DocumentChecklistItem[] = DOCUMENT_SECTIONS[6].items
/** รายการเอกสาร Card ข้อมูลสินเชื่อ */
export const DOC_ITEMS_LOAN: DocumentChecklistItem[] = DOCUMENT_SECTIONS[7].items

/** ดึง sections ที่มีรายการแนบ และตรงกับ loan_type */
export function getDocumentSections(loanType: string): DocumentSection[] {
  const isVehicle = loanType === 'personal_car' || loanType === 'commercial_vehicle'
  const isLand = loanType === 'land_title'
  return DOCUMENT_SECTIONS.filter((s) => {
    if (s.items.length === 0) return false
    if (s.showWhenLoanType === 'vehicle') return isVehicle
    if (s.showWhenLoanType === 'land_title') return isLand
    return true
  })
}

/** ดึงรายการแนบสำหรับ Card นี้ (ใช้แทรกในแต่ละ Card) */
export function getDocItemsForCard(cardTitle: string, loanType: string): DocumentChecklistItem[] {
  const sections = getDocumentSections(loanType)
  const section = sections.find((s) => s.cardTitle === cardTitle)
  return section?.items ?? []
}

/** รายการ document_type ทั้งหมดที่ใช้กับ loan_type นี้ (สำหรับ submit loop) */
export function getAllDocumentKeys(loanType: string): DocumentChecklistItem[] {
  return getDocumentSections(loanType).flatMap((s) => s.items)
}

/** คืน label จาก key (สำหรับหน้ารายละเอียด) */
export function getDocumentTypeLabel(loanType: string, documentTypeKey: string): string {
  for (const section of DOCUMENT_SECTIONS) {
    const item = section.items.find((i) => i.key === documentTypeKey)
    if (item) return item.label
  }
  return documentTypeKey
}
