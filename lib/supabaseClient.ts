import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** ชื่อ bucket ใน Supabase Storage สำหรับเก็บเอกสารแนบ (สร้าง bucket นี้ใน Dashboard → Storage ถ้ายังไม่มี) */
export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'loan-docs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)