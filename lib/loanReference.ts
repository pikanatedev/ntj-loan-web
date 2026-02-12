import type { SupabaseClient } from '@supabase/supabase-js'
import dayjs from '@/lib/dayjs'

/**
 * สร้างเลขที่อ้างอิงสินเชื่อรูปแบบ RYYMMDDXXXX
 * R = prefix, YY = ปี พ.ศ. 2 หลัก, MM = เดือน 2 หลัก, DD = วันที่ 2 หลัก, XXXX = running number ของวันนี้ (4 หลัก)
 */
export async function generateNextLoanReference(supabase: SupabaseClient): Promise<string> {
  const now = dayjs()
  const yy = String((now.year() + 543) % 100).padStart(2, '0') // พ.ศ. 2 หลัก
  const mm = now.format('MM')
  const dd = now.format('DD')
  const prefix = `R${yy}${mm}${dd}`

  const todayStart = now.startOf('day').toISOString()
  const todayEnd = now.endOf('day').toISOString()

  const { data } = await supabase
    .from('loans')
    .select('loan_reference_number')
    .like('loan_reference_number', `${prefix}%`)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
    .order('loan_reference_number', { ascending: false })
    .limit(1)

  let next = 1
  if (data?.[0]?.loan_reference_number) {
    const ref = data[0].loan_reference_number
    const lastFour = ref.slice(-4)
    const num = parseInt(lastFour, 10)
    if (!Number.isNaN(num)) next = num + 1
  }

  const xxxx = String(next).padStart(4, '0')
  return `${prefix}${xxxx}`
}
