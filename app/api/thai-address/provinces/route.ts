import { NextResponse } from 'next/server'
import provinces from '@/lib/data/thai_adddress/province.json'

export async function GET() {
  const list = (provinces as { id: number; name_th: string; name_en: string }[])
    .map((p) => ({ id: p.id, name_th: p.name_th, name_en: p.name_en }))
  return NextResponse.json(list)
}
