/**
 * สร้าง path สำหรับ Supabase Storage ที่ใช้เฉพาะตัวอักษร ASCII
 * (Storage ไม่รองรับ unicode/ภาษาไทย ใน key จึงต้องไม่ใช้ file.name โดยตรง)
 * ชื่อไฟล์จริงเก็บในคอลัมน์ file_name ของ loan_attachments สำหรับแสดงผล
 */
export function getSafeStoragePath(loanId: string, file: File): string {
  const ext = (file.name ?? '')
    .toLowerCase()
    .split('.')
    .pop()
  const safeExt = ext && /^[a-z0-9]+$/i.test(ext) ? ext : 'bin'
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `loans/${loanId}/${Date.now()}_${id}.${safeExt}`
}
