import { NextRequest, NextResponse } from 'next/server'
import districts from '@/lib/data/thai_address/district.json'

type District = { id: number; name_th: string; name_en: string; province_id: number }

export async function GET(request: NextRequest) {
  const provinceId = request.nextUrl.searchParams.get('province_id')
  if (!provinceId) {
    return NextResponse.json(
      { error: 'province_id is required' },
      { status: 400 }
    )
  }
  const id = parseInt(provinceId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { error: 'province_id must be a number' },
      { status: 400 }
    )
  }
  const list = (districts as District[])
    .filter((d) => d.province_id === id)
    .map((d) => ({ id: d.id, name_th: d.name_th, name_en: d.name_en }))
  return NextResponse.json(list)
}
