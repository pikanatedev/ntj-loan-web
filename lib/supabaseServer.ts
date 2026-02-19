import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Supabase client ที่ใช้ Service Role (ใช้ใน API routes เท่านั้น)
 * ใช้สำหรับดึงข้อมูล staff/loans เพื่อส่ง SMS (ต้องอ่าน staff.phone ได้)
 */
export function createSupabaseServerClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server operations')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
