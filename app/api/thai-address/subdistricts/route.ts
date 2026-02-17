import { NextRequest, NextResponse } from 'next/server'
import subDistricts from '@/lib/data/thai_address/sub_district.json'

type SubDistrict = { id: number; name_th: string; name_en: string; district_id: number; zip_code: number }

export async function GET(request: NextRequest) {
  const districtId = request.nextUrl.searchParams.get('district_id')
  if (!districtId) {
    return NextResponse.json(
      { error: 'district_id is required' },
      { status: 400 }
    )
  }
  const id = parseInt(districtId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { error: 'district_id must be a number' },
      { status: 400 }
    )
  }
  const list = (subDistricts as SubDistrict[])
    .filter((s) => s.district_id === id)
    .map((s) => ({ id: s.id, name_th: s.name_th, name_en: s.name_en, zip_code: s.zip_code }))
  return NextResponse.json(list)
}
