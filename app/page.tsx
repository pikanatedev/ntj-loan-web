'use client'
import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { App, Input, Select, Pagination, DatePicker, Button } from 'antd'
import type { Dayjs } from 'dayjs'
import { DATE_DISPLAY_FORMAT } from '@/lib/dayjs'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser, Loan } from '@/lib/types'
import { formatNum, formatDate } from '@/lib/types'

const { RangePicker } = DatePicker

const PAGE_SIZE = 10
const STATUS_OPTIONS = [
  { value: '', label: 'เลือกสถานะ' },
  { value: 'รอตรวจสอบ', label: 'รอตรวจสอบ' },
  { value: 'ส่งกลับไปแก้ไข', label: 'ส่งกลับไปแก้ไข' },
  { value: 'อนุมัติ', label: 'อนุมัติ' },
  { value: 'ปฏิเสธ', label: 'ปฏิเสธ' },
]

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal_car: 'รถยนต์ส่วนบุคคล',
  commercial_vehicle: 'รถยนต์เชิงพาณิชย์',
  land_title: 'โฉนดที่ดิน',
}

function getLoanTypeLabel(loanType: string | null | undefined): string {
  if (!loanType) return '—'
  return LOAN_TYPE_LABELS[loanType] ?? loanType
}

function matchKeyword(loan: Loan, keyword: string): boolean {
  if (!keyword.trim()) return true
  const k = keyword.trim().toLowerCase()
  const typeLabel = getLoanTypeLabel(loan.loan_type)
  const fields = [
    loan.customer_name,
    loan.license_plate,
    loan.car_brand,
    loan.car_model,
    loan.car_type,
    loan.sales_name,
    loan.id_card_number,
    typeLabel,
    loan.residence_address,
    loan.land_deed_no,
  ]
  return fields.some((f) => (f ?? '').toString().toLowerCase().includes(k))
}

function matchDateRange(submissionDate: string | null | undefined, range: [Dayjs | null, Dayjs | null] | null): boolean {
  if (!range || (!range[0] && !range[1])) return true
  const d = submissionDate ? submissionDate.slice(0, 10) : ''
  if (!d) return false
  if (range[0] && d < range[0].format('YYYY-MM-DD')) return false
  if (range[1] && d > range[1].format('YYYY-MM-DD')) return false
  return true
}

export default function ListPage() {
  const { message } = App.useApp()
  const [user, setUser] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [loans, setLoans] = useState<Loan[]>([])
  const [mounted, setMounted] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [submissionDateRange, setSubmissionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async (currentUser: StaffUser) => {
    let query = supabase
      .from('loans')
      .select('*, loan_attachments(*)')
      .order('created_at', { ascending: false })
    if (currentUser.role === 'sale') {
      query = query.eq('sale_id', currentUser.id)
    }
    // approver และ manager เห็นทุกรายการ
    const { data } = await query
    setLoans(data || [])
  }

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (!matchKeyword(loan, keyword)) return false
      if (statusFilter && loan.status !== statusFilter) return false
      if (!matchDateRange(loan.submission_date, submissionDateRange)) return false
      return true
    })
  }, [loans, keyword, statusFilter, submissionDateRange])

  const totalFiltered = filteredLoans.length
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredLoans.slice(start, start + PAGE_SIZE)
  }, [filteredLoans, currentPage])

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
            data-testid="login-pin-input"
            className="border border-gray-300 p-3 sm:p-2 w-full text-center text-2xl tracking-[0.4em] rounded-lg min-h-[48px]"
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            type="button"
            onClick={handleLogin}
            data-testid="login-submit"
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
          ระบบอนุมัติสินเชื่อ ({user.role === 'sale' ? 'พนักงานขาย' : user.role?.toLowerCase() === 'manager' ? 'ผู้จัดการ' : 'ผู้อนุมัติ'})
        </h1>
        {user.role === 'sale' && (
          <Link
            href="/loan/new"
            data-testid="link-new-loan"
            className="edit-btn-red px-4 py-3 sm:py-2 rounded-lg text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
          >
            สร้างแบบฟอร์มใหม่
          </Link>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="font-bold text-base sm:text-lg text-red-700">รายการสินเชื่อทั้งหมด</h2>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ค้นหา</label>
              <Input.Search
                placeholder="ชื่อ, ทะเบียน, ประเภท (โฉนด/รถ), ยี่ห้อ, พนักงานขาย..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setCurrentPage(1)
                }}
                allowClear
                className="w-full"
                size="large"
              />
            </div>
            <div data-testid="filter-status">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">สถานะ</label>
              <Select
                placeholder="เลือกสถานะ"
                value={statusFilter || undefined}
                onChange={(v) => {
                  setStatusFilter(v ?? '')
                  setCurrentPage(1)
                }}
                options={STATUS_OPTIONS}
                allowClear
                className="w-full"
                size="large"
              />
            </div>
            <div className="lg:col-span-2 min-w-0" data-testid="filter-date-range">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่เสนอสินเชื่อ</label>
              <RangePicker
                value={submissionDateRange}
                onChange={(dates) => {
                  setSubmissionDateRange(dates ?? null)
                  setCurrentPage(1)
                }}
                className="w-full [&_.ant-picker-input>input]:!rounded-lg [&_.ant-picker-input]:!min-w-[8rem]"
                size="large"
                format={DATE_DISPLAY_FORMAT}
                placeholder={['เริ่มต้น', 'สิ้นสุด']}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="default"
              onClick={() => {
                setKeyword('')
                setStatusFilter('')
                setSubmissionDateRange(null)
                setCurrentPage(1)
              }}
              className="!rounded-lg"
            >
              ล้างตัวกรอง
            </Button>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center text-gray-500 text-sm sm:text-base">
            ยังไม่มีรายการสินเชื่อ
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center text-gray-500 text-sm sm:text-base">
            ไม่พบรายการที่ตรงกับตัวกรอง
          </div>
        ) : (
          <>
            {paginatedLoans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
            >
              <div className="text-gray-900 min-w-0">
                <p className="font-bold text-base truncate">
                  {loan.customer_name ?? '—'}
                  {loan.loan_type === 'land_title' ? (
                    <span className="font-normal text-gray-600"> · {getLoanTypeLabel(loan.loan_type)}</span>
                  ) : (
                    <> ({loan.license_plate ?? '—'})</>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 break-words">
                  {(user.role === 'approver' || user.role?.toLowerCase() === 'manager') && (
                    <>
                      พนักงานขาย: {loan.sales_name ?? '—'}
                      {' · '}
                    </>
                  )}
                  {loan.loan_type && (
                    <>
                      ประเภท: {getLoanTypeLabel(loan.loan_type)}
                      {' · '}
                    </>
                  )}
                  วันที่เสนอสินเชื่อ: {formatDate(loan.submission_date)}
                  {' · '}
                  ยอดจัด: {formatNum(loan.loan_amount)}
                  {loan.closing_amount != null && ` | ปิดบัญชี: ${formatNum(loan.closing_amount)}`} | สถานะ:{' '}
                  <span
                    className={`ml-1 font-bold ${
                      loan.status === 'อนุมัติ'
                        ? 'text-green-600'
                        : loan.status === 'ปฏิเสธ'
                          ? 'text-red-600'
                          : loan.status === 'ส่งกลับไปแก้ไข'
                            ? 'text-orange-600'
                            : 'text-amber-600'
                    }`}
                  >
                    {loan.status ?? '—'}
                  </span>
                </p>
              </div>
              <Link
                href={`/loan/${loan.id}`}
                className="edit-btn-red px-4 py-3 sm:py-2 rounded-lg text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
              >
                ดูรายละเอียด
              </Link>
            </div>
            ))}
            <div className="flex justify-center pt-4">
              <Pagination
                current={currentPage}
                total={totalFiltered}
                pageSize={PAGE_SIZE}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showTotal={(total) => `ทั้งหมด ${total} รายการ`}
                className="[&_.ant-pagination-item]:!rounded [&_.ant-pagination-prev]:!rounded [&_.ant-pagination-next]:!rounded"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
