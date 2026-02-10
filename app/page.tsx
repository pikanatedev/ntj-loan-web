'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { message } from 'antd'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser, Loan } from '@/lib/types'
import { formatNum } from '@/lib/types'

export default function ListPage() {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [loans, setLoans] = useState<Loan[]>([])
  const [mounted, setMounted] = useState(false)

  const fetchData = async (currentUser: StaffUser) => {
    let query = supabase
      .from('loans')
      .select('*, loan_attachments(*)')
      .order('created_at', { ascending: false })
    if (currentUser.role === 'sale') {
      query = query.eq('sale_id', currentUser.id)
    }
    const { data } = await query
    setLoans(data || [])
  }

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      try {
        const s = localStorage.getItem('loan_user')
        if (cancelled) return
        if (s) {
          const parsed = JSON.parse(s) as StaffUser
          setUser(parsed)
          fetchData(parsed)
        }
      } catch {
        if (!cancelled) setUser(null)
      }
      if (!cancelled) setMounted(true)
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const handleLogin = async () => {
    const { data } = await supabase.from('staff').select('*').eq('pin', pin).single()
    if (data) {
      setUser(data)
      localStorage.setItem('loan_user', JSON.stringify(data))
      window.dispatchEvent(new CustomEvent('loan-user-change'))
      fetchData(data)
    } else {
      message.error('PIN ไม่ถูกต้อง')
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437]">
        <span className="text-gray-500">กำลังโหลด...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437] px-4 py-6">
        <div className="p-6 sm:p-8 bg-white shadow-lg rounded-xl max-w-sm w-full text-center">
          <Image
            src="/images/ntj_logo.png"
            alt="NTJ Logo"
            width={72}
            height={72}
            className="object-contain mx-auto mb-4 sm:w-20 sm:h-20"
          />
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-red-700">กรอก PIN 6 หลัก</h2>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            className="border border-gray-300 p-3 sm:p-2 w-full text-center text-2xl tracking-[0.4em] rounded-lg min-h-[48px]"
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            type="button"
            onClick={handleLogin}
            className="mt-5 w-full bg-red-700 text-white py-3.5 sm:py-2 rounded-lg hover:bg-red-800 min-h-[48px] text-base font-medium touch-manipulation"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700 leading-tight">
          ระบบอนุมัติสินเชื่อ ({user.role === 'sale' ? 'พนักงานขาย' : 'ผู้อนุมัติ'})
        </h1>
        {user.role === 'sale' && (
          <Link
            href="/loan/new"
            className="bg-red-700 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-red-800 text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
          >
            สร้างแบบฟอร์มใหม่
          </Link>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="font-bold text-base sm:text-lg text-red-700">รายการเคสทั้งหมด</h2>
        {loans.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center text-gray-500 text-sm sm:text-base">
            ยังไม่มีรายการเคส
          </div>
        ) : (
          loans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
            >
              <div className="text-gray-900 min-w-0">
                <p className="font-bold text-base truncate">{loan.customer_name ?? '—'} ({loan.license_plate ?? '—'})</p>
                <p className="text-sm text-gray-500 mt-0.5 break-words">
                  ยอดจัด: {formatNum(loan.loan_amount)}
                  {loan.closing_amount != null && ` | ปิดบัญชี: ${formatNum(loan.closing_amount)}`} | สถานะ:{' '}
                  <span
                    className={`ml-1 font-bold ${
                      loan.status === 'อนุมัติ' ? 'text-green-600' : loan.status === 'ปฏิเสธ' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {loan.status ?? '—'}
                  </span>
                </p>
              </div>
              <Link
                href={`/loan/${loan.id}`}
                className="bg-red-700 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-red-800 text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
              >
                ดูรายละเอียด
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
