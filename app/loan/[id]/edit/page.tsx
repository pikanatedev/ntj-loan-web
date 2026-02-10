'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Form, Input, InputNumber, DatePicker, Upload, Button, message } from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs, { DATE_DISPLAY_FORMAT } from '@/lib/dayjs'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser, Loan } from '@/lib/types'

export default function EditLoanPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('loan_user')
    if (!stored) {
      router.replace('/')
      return
    }
    try {
      const parsed = JSON.parse(stored) as StaffUser
      if (parsed.role !== 'sale') {
        router.replace('/')
        return
      }
      setUser(parsed)
    } catch {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    if (!id || !user) return
    const fetchLoan = async () => {
      const { data, error } = await supabase.from('loans').select('*').eq('id', id).single()
      if (error || !data) {
        setLoan(null)
        setLoading(false)
        return
      }
      const row = data as Loan
      if (row.status !== 'รอตรวจสอบ' || row.sale_id !== user.id) {
        setLoan(null)
        setLoading(false)
        return
      }
      setLoan(row)
      form.setFieldsValue({
        customer_name: row.customer_name ?? undefined,
        id_card_number: row.id_card_number ?? undefined,
        birth_date: row.birth_date ? dayjs(row.birth_date) : undefined,
        car_brand: row.car_brand ?? undefined,
        car_model: row.car_model ?? undefined,
        car_type: row.car_type ?? undefined,
        registration_date: row.registration_date ? dayjs(row.registration_date) : undefined,
        license_plate: row.license_plate ?? undefined,
        car_details: row.car_details ?? undefined,
        submission_date: row.submission_date ? dayjs(row.submission_date) : dayjs(),
        loan_amount: row.loan_amount ?? undefined,
        closing_amount: row.closing_amount ?? undefined,
        term_months: row.term_months ?? undefined,
        interest_rate: row.interest_rate ?? undefined,
      })
      setLoading(false)
    }
    fetchLoan()
  }, [id, user, form])

  const onFinish = async (values: Record<string, unknown>) => {
    if (!user || !id) return
    setSubmitting(true)
    const toStr = (v: unknown) => (v != null && v !== '' ? String(v) : null)
    const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null)
    const toDate = (v: unknown) => (v ? dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD') : null)

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          submission_date: toDate(values.submission_date) || dayjs().format('YYYY-MM-DD'),
          customer_name: toStr(values.customer_name),
          id_card_number: toStr(values.id_card_number),
          birth_date: toDate(values.birth_date),
          car_brand: toStr(values.car_brand),
          car_model: toStr(values.car_model),
          car_type: toStr(values.car_type),
          registration_date: toDate(values.registration_date),
          license_plate: toStr(values.license_plate),
          car_details: toStr(values.car_details),
          loan_amount: toNum(values.loan_amount),
          closing_amount: toNum(values.closing_amount),
          term_months: toNum(values.term_months),
          interest_rate: toNum(values.interest_rate),
        })
        .eq('id', id)

      if (error) throw error

      const rawFiles = fileList.map((f) => f.originFileObj).filter(Boolean)
      const files = rawFiles as File[]
      for (const file of files) {
        const path = `loans/${id}/${Date.now()}_${file.name}`
        await supabase.storage.from('loan-docs').upload(path, file)
        await supabase
          .from('loan_attachments')
          .insert([{ loan_id: id, file_path: path, file_name: file.name }])
      }

      message.success('บันทึกการแก้ไขเรียบร้อย')
      router.push(`/loan/${id}`)
    } catch {
      message.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  const normFile = (e: { fileList: UploadFile[] }) => {
    setFileList(e.fileList)
  }

  const idCardRules = [
    { pattern: /^$|^\d{13}$/, message: 'กรอกตัวเลข 13 หลักเท่านั้น' },
  ]
  const onlyDigitsIdCard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 13)
    form.setFieldValue('id_card_number', v || undefined)
  }

  const formatCurrency = (val: number | string | undefined) => {
    if (val == null || val === '') return ''
    const n = Number(String(val).replace(/,/g, ''))
    if (Number.isNaN(n)) return ''
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  const parseCurrency = (str: string | undefined): string | number => {
    if (str == null || str === '') return ''
    const raw = String(str).replace(/,/g, '')
    const parts = raw.replace(/[^\d.]/g, '').split('.')
    const intPart = parts[0] ?? ''
    const decPart = parts.slice(1).join('').slice(0, 2)
    const s = decPart ? `${intPart}.${decPart}` : intPart
    if (s === '' || s === '.') return ''
    const n = Number(s)
    return Number.isNaN(n) ? '' : n
  }

  const allowOnlyDigitsKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowed.includes(e.key)) return
    if (!/^\d$/.test(e.key)) e.preventDefault()
  }
  const allowDigitsAndDecimalKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowed.includes(e.key)) return
    if (e.key === '.' && (e.target as HTMLInputElement).value?.includes('.')) e.preventDefault()
    else if (!/^[\d.]$/.test(e.key)) e.preventDefault()
  }

  if (user == null || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBE437]">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] bg-[#FBE437]">
        <p className="text-gray-500 text-sm sm:text-base">ไม่พบรายการนี้หรือไม่มีสิทธิ์แก้ไข</p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 font-medium touch-manipulation"
        >
          กลับหน้ารายการ
        </Link>
      </div>
    )
  }

  const sectionTitle = (title: string) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1 h-6 sm:h-7 bg-red-600 rounded-full shrink-0" aria-hidden />
      <h2 className="text-red-700 font-semibold text-base sm:text-lg m-0">{title}</h2>
    </div>
  )

  const formItemClass =
    'w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-picker]:min-h-[44px] [&_.ant-picker]:!rounded-lg [&_.ant-picker]:w-full [&_.ant-input-number]:!flex [&_.ant-input-number]:!w-full [&_.ant-input-number]:!max-w-full [&_.ant-input-number-input]:!min-h-[44px] [&_.ant-input-number-input]:!flex-1 [&_.ant-input-number-input]:!min-w-0 [&_.ant-input-number-input]:!rounded-lg'
  const formItemClassFull = formItemClass + ' md:col-span-2'

  return (
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700">แก้ไขข้อมูลสินเชื่อ</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/loan/${id}`}
            className="inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-300 font-medium min-h-[48px] touch-manipulation shrink-0"
          >
            กลับรายละเอียด
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-300 font-medium min-h-[48px] touch-manipulation shrink-0"
          >
            หน้ารายการ
          </Link>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} className="space-y-6 sm:space-y-8">
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลผู้กู้')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="customer_name" label="ชื่อ-นามสกุลผู้กู้" rules={[{ required: true }]} className={formItemClass}>
              <Input size="large" placeholder="กรอกชื่อ-นามสกุล" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="id_card_number" label="เลขบัตรประชาชน" rules={idCardRules} className={formItemClass}>
              <Input
                size="large"
                placeholder="กรอกเลขบัตร 13 หลัก"
                className="!rounded-lg w-full"
                maxLength={13}
                inputMode="numeric"
                onChange={onlyDigitsIdCard}
              />
            </Form.Item>
            <Form.Item name="birth_date" label="วันเดือนปีเกิดผู้กู้" className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
            </Form.Item>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลรถ')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="car_brand" label="ยี่ห้อรถ" rules={[{ required: true }]} className={formItemClass}>
              <Input size="large" placeholder="เช่น Toyota, Isuzu" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="car_model" label="รุ่นรถ" rules={[{ required: true }]} className={formItemClass}>
              <Input size="large" placeholder="กรอกรุ่นรถ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="car_type" label="ลักษณะรถ" className={formItemClass}>
              <Input size="large" placeholder="เช่น 10 ล้อ, หัวลาก" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="registration_date" label="วันที่จดทะเบียนรถ" className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
            </Form.Item>
            <Form.Item name="license_plate" label="เลขทะเบียนรถ" rules={[{ required: true }]} className={formItemClassFull}>
              <Input size="large" placeholder="กรอกเลขทะเบียน" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="car_details" label="รายละเอียด/ตำหนิของรถ" className={formItemClassFull}>
              <Input.TextArea rows={3} placeholder="ระบุรายละเอียดหรือตำหนิ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
            </Form.Item>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลสินเชื่อ')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="submission_date" label="วันที่เสนอสินเชื่อ" rules={[{ required: true }]} className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
            </Form.Item>
            <Form.Item
              name="loan_amount"
              label="ยอดจัดที่ขอ (บาท)"
              rules={[{ required: true, message: 'กรุณากรอกยอดจัด' }, { type: 'number', message: 'กรอกตัวเลขเท่านั้น' }]}
              className={formItemClass}
            >
              <InputNumber
                size="large"
                className="!w-full"
                min={0}
                placeholder="0"
                addonAfter="บาท"
                controls={false}
                formatter={formatCurrency}
                parser={parseCurrency}
                onKeyDown={allowDigitsAndDecimalKey}
                inputMode="decimal"
              />
            </Form.Item>
            <Form.Item
              name="closing_amount"
              label="ยอดปิดบัญชีเดิม (ถ้ามี)"
              rules={[{ type: 'number', message: 'กรอกตัวเลขเท่านั้น' }]}
              className={formItemClass}
            >
              <InputNumber
                size="large"
                className="!w-full"
                min={0}
                placeholder="0"
                addonAfter="บาท"
                controls={false}
                formatter={formatCurrency}
                parser={parseCurrency}
                onKeyDown={allowDigitsAndDecimalKey}
                inputMode="decimal"
              />
            </Form.Item>
            <Form.Item
              name="term_months"
              label="จำนวนงวด (เดือน)"
              rules={[
                { type: 'number', message: 'กรอกตัวเลขเท่านั้น' },
                {
                  validator: (_, val) =>
                    val == null || val === '' || Number.isInteger(Number(val))
                      ? Promise.resolve()
                      : Promise.reject(new Error('กรอกจำนวนเต็มเท่านั้น')),
                },
              ]}
              className={formItemClass}
            >
              <InputNumber
                size="large"
                className="!w-full"
                min={1}
                step={1}
                placeholder="เช่น 48"
                addonAfter="เดือน"
                controls={false}
                decimalSeparator=""
                onKeyDown={allowOnlyDigitsKey}
                inputMode="numeric"
              />
            </Form.Item>
            <Form.Item
              name="interest_rate"
              label="อัตราดอกเบี้ย (%)"
              rules={[{ type: 'number', message: 'กรอกตัวเลขเท่านั้น' }]}
              className={formItemClass}
            >
              <InputNumber
                size="large"
                className="!w-full"
                min={0}
                placeholder="เช่น 3.5"
                addonAfter="%"
                controls={false}
                onKeyDown={allowDigitsAndDecimalKey}
                inputMode="decimal"
              />
            </Form.Item>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('แนบเอกสารเพิ่ม (ถ้ามี)')}
          </div>
          <div className="p-4 sm:p-6">
            <Form.Item
              label={<span className="text-gray-700 font-medium">เลือกไฟล์เพิ่ม (เอกสารเดิมยังอยู่)</span>}
              className="mb-0"
            >
              <Upload.Dragger
                multiple
                fileList={fileList}
                onChange={normFile}
                beforeUpload={() => false}
                maxCount={999}
                className="!rounded-xl !border-2 !border-dashed !border-gray-200 hover:!border-red-300 !bg-gray-50/50 hover:!bg-red-50/30 [&.ant-upload-drag]:!rounded-xl"
              >
                <p className="ant-upload-drag-icon mb-2">
                  <InboxOutlined style={{ fontSize: 40, color: '#b91c1c' }} />
                </p>
                <p className="ant-upload-text text-gray-700 font-medium">คลิกหรือลากไฟล์มาวางที่นี่</p>
                <p className="ant-upload-hint text-gray-500 text-sm mt-1">รายการไฟล์จะแสดงด้านล่างหลังเลือก</p>
              </Upload.Dragger>
            </Form.Item>
          </div>
        </section>

        <div className="pt-2">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            className="!min-h-[52px] !text-base !rounded-xl !font-semibold touch-manipulation shadow-lg shadow-red-900/20 !bg-amber-600 hover:!bg-amber-700 !border-amber-600"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
