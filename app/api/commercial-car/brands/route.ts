import { NextResponse } from 'next/server'
import brands from '@/lib/data/commercial_car/brand.json'

export async function GET() {
  const list = (brands as { id: number; name_th: string; name_en: string }[]).map((b) => ({
    id: b.id,
    name_th: b.name_th,
    name_en: b.name_en,
  }))
  return NextResponse.json(list)
}
