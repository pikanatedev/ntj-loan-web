import { NextRequest, NextResponse } from 'next/server'
import models from '@/lib/data/thai_car/model.json'

type Model = { id: number; name_th: string; name_en: string; brand_id: number }

export async function GET(request: NextRequest) {
  const brandId = request.nextUrl.searchParams.get('brand_id')
  if (!brandId) {
    return NextResponse.json({ error: 'brand_id is required' }, { status: 400 })
  }
  const id = parseInt(brandId, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'brand_id must be a number' }, { status: 400 })
  }
  const list = (models as Model[])
    .filter((m) => m.brand_id === id)
    .map((m) => ({ id: m.id, name_th: m.name_th, name_en: m.name_en }))
  return NextResponse.json(list)
}
