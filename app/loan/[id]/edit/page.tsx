'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Form, Input, InputNumber, DatePicker, Upload, Button, message, Select } from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined, FilePdfOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs, { DATE_DISPLAY_FORMAT } from '@/lib/dayjs'
import { supabase, STORAGE_BUCKET } from '@/lib/supabaseClient'
import { getSafeStoragePath } from '@/lib/storage'
import type { StaffUser, Loan, LoanAttachment, LoanType } from '@/lib/types'

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
  const [idsToRemove, setIdsToRemove] = useState<string[]>([])
  const [existingFileUrls, setExistingFileUrls] = useState<Record<string, string>>({})
  const [newFileThumbUrls, setNewFileThumbUrls] = useState<Record<string, string>>({})
  const newFileThumbUrlsRef = useRef<Record<string, string>>({})

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
      const { data, error } = await supabase.from('loans').select('*, loan_attachments(*)').eq('id', id).single()
      if (error || !data) {
        setLoan(null)
        setLoading(false)
        return
      }
      const row = data as Loan
      if (
        (row.status !== 'รอตรวจสอบ' && row.status !== 'ส่งกลับไปแก้ไข') ||
        row.sale_id !== user.id
      ) {
        setLoan(null)
        setLoading(false)
        return
      }
      setLoan(row)
      form.setFieldsValue({
        loan_reference_number: row.loan_reference_number ?? undefined,
        customer_name: row.customer_name ?? undefined,
        id_card_number: row.id_card_number ?? undefined,
        birth_date: row.birth_date ? dayjs(row.birth_date) : undefined,
        loan_type: (row.loan_type as LoanType) ?? 'personal_car',
        car_brand: row.car_brand ?? undefined,
        car_model: row.car_model ?? undefined,
        car_type: row.car_type ?? undefined,
        registration_date: row.registration_date ? dayjs(row.registration_date) : undefined,
        license_plate: row.license_plate ?? undefined,
        car_details: row.car_details ?? undefined,
        residence_address: row.residence_address ?? undefined,
        land_deed_no: row.land_deed_no ?? undefined,
        residence_details: row.residence_details ?? undefined,
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

  useEffect(() => {
    const attachments = (loan?.loan_attachments ?? []) as LoanAttachment[]
    if (!attachments.length) return
    const loadUrls = async () => {
      const map: Record<string, string> = {}
      for (const att of attachments) {
        const { data: urlData } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(att.file_path, 3600)
        if (urlData?.signedUrl) map[att.file_path] = urlData.signedUrl
      }
      setExistingFileUrls((prev) => ({ ...prev, ...map }))
    }
    loadUrls()
  }, [loan?.id, loan?.loan_attachments])

  const existingAttachments = useMemo(() => {
    const list = (loan?.loan_attachments ?? []) as LoanAttachment[]
    return list.filter((a) => !idsToRemove.includes(a.id))
  }, [loan?.loan_attachments, idsToRemove])

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)
  const isPdf = (name: string) => /\.pdf$/i.test(name)

  const removeExistingAttachment = (attachmentId: string) => {
    setIdsToRemove((prev) => (prev.includes(attachmentId) ? prev : [...prev, attachmentId]))
  }

  const isImageNewFile = (file: UploadFile) => {
    const f = file.originFileObj as File | undefined
    if (!f) return false
    if (f.type?.startsWith('image/')) return true
    const ext = (file.name ?? '').toLowerCase().split('.').pop()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext ?? '')
  }

  useEffect(() => {
    const uids = new Set(fileList.map((f) => f.uid))
    const next: Record<string, string> = {}
    fileList.forEach((file) => {
      if (!isImageNewFile(file) || !file.originFileObj) return
      const url = newFileThumbUrlsRef.current[file.uid] ?? URL.createObjectURL(file.originFileObj)
      next[file.uid] = url
    })
    Object.keys(newFileThumbUrlsRef.current).forEach((uid) => {
      if (!uids.has(uid)) URL.revokeObjectURL(newFileThumbUrlsRef.current[uid])
    })
    newFileThumbUrlsRef.current = next
    setNewFileThumbUrls(next)
  }, [fileList])

  useEffect(() => {
    return () => {
      Object.values(newFileThumbUrlsRef.current).forEach(URL.revokeObjectURL)
      newFileThumbUrlsRef.current = {}
    }
  }, [])

  const removeNewFile = (uid: string) => {
    setFileList((prev) => prev.filter((f) => f.uid !== uid))
  }

  const onFinish = async (values: Record<string, unknown>) => {
    if (!user || !id) return
    setSubmitting(true)
    const toStr = (v: unknown) => (v != null && v !== '' ? String(v) : null)
    const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null)
    const toDate = (v: unknown) => (v ? dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD') : null)

    try {
      const updatePayload: Record<string, unknown> = {
        submission_date: toDate(values.submission_date) || dayjs().format('YYYY-MM-DD'),
        ...(loan?.status === 'ส่งกลับไปแก้ไข' ? { status: 'รอตรวจสอบ' as const } : {}),
        loan_reference_number: toStr(values.loan_reference_number),
        customer_name: toStr(values.customer_name),
        id_card_number: toStr(values.id_card_number),
        birth_date: toDate(values.birth_date),
        loan_type: toStr(values.loan_type) || null,
        loan_amount: toNum(values.loan_amount),
        closing_amount: toNum(values.closing_amount),
        term_months: toNum(values.term_months),
        interest_rate: toNum(values.interest_rate),
      }
      if (values.loan_type === 'land_title') {
        updatePayload.residence_address = toStr(values.residence_address)
        updatePayload.land_deed_no = toStr(values.land_deed_no)
        updatePayload.residence_details = toStr(values.residence_details)
        updatePayload.car_brand = null
        updatePayload.car_model = null
        updatePayload.car_type = null
        updatePayload.registration_date = null
        updatePayload.license_plate = null
        updatePayload.car_details = null
      } else {
        updatePayload.car_brand = toStr(values.car_brand)
        updatePayload.car_model = toStr(values.car_model)
        updatePayload.car_type = toStr(values.car_type)
        updatePayload.registration_date = toDate(values.registration_date)
        updatePayload.license_plate = toStr(values.license_plate)
        updatePayload.car_details = toStr(values.car_details)
        updatePayload.residence_address = null
        updatePayload.land_deed_no = null
        updatePayload.residence_details = null
      }

      const { error } = await supabase.from('loans').update(updatePayload).eq('id', id)

      if (error) throw error

      const attachmentsToRemove = ((loan?.loan_attachments ?? []) as LoanAttachment[]).filter((a) =>
        idsToRemove.includes(a.id)
      )
      for (const att of attachmentsToRemove) {
        const { error: delError } = await supabase.from('loan_attachments').delete().eq('id', att.id).eq('loan_id', id)
        if (delError) {
          console.error('Delete attachment error:', delError)
          throw delError
        }
        const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([att.file_path])
        if (storageError) {
          console.error('Delete storage error:', storageError)
          // ไม่ throw เพื่อให้การลบแถวใน DB ยังถือว่าสำเร็จ ไฟล์ใน storage อาจต้องลบทีหลัง
        }
      }

      const rawFiles = fileList.map((f) => f.originFileObj).filter(Boolean)
      const files = rawFiles as File[]
      for (const file of files) {
        const path = getSafeStoragePath(id, file)
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file)
        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(uploadError.message === 'Bucket not found' ? 'ไม่พบ Storage bucket กรุณาสร้าง bucket ใน Supabase Dashboard' : uploadError.message)
        }
        const { error: insertError } = await supabase
          .from('loan_attachments')
          .insert([{ loan_id: id, file_path: path, file_name: file.name }])
        if (insertError) throw insertError
      }

      message.success('บันทึกการแก้ไขเรียบร้อย')
      router.push(`/loan/${id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      message.error(msg)
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

  const sectionTitle = (title: string) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1 h-6 sm:h-7 bg-red-600 rounded-full shrink-0" aria-hidden />
      <h2 className="text-red-700 font-semibold text-base sm:text-lg m-0">{title}</h2>
    </div>
  )

  const formItemClass =
    'w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-picker]:min-h-[44px] [&_.ant-picker]:!rounded-lg [&_.ant-picker]:w-full [&_.ant-input-number]:!flex [&_.ant-input-number]:!w-full [&_.ant-input-number]:!max-w-full [&_.ant-input-number-input]:!min-h-[44px] [&_.ant-input-number-input]:!flex-1 [&_.ant-input-number-input]:!min-w-0 [&_.ant-input-number-input]:!rounded-lg'
  const formItemClassFull = formItemClass + ' md:col-span-2'

  const watchedLoanType = Form.useWatch<LoanType>('loan_type', form)
  const loanType = watchedLoanType ?? 'personal_car'
  const isLandTitle = loanType === 'land_title'

  const watchedLoanAmount = Form.useWatch('loan_amount', form)
  const watchedTermMonths = Form.useWatch('term_months', form)
  const watchedInterestRate = Form.useWatch('interest_rate', form)

  /** คำนวณแบบ Flat Rate: อัตรา % ต่อเดือน → ดอกเบี้ยต่อเดือน = ยอดกู้ × อัตราต่อเดือน */
  const calculatedMonthlyInstallment = (() => {
    const principal = Number(watchedLoanAmount)
    const months = Number(watchedTermMonths)
    const ratePerMonth = Number(watchedInterestRate) / 100
    if (!principal || principal <= 0 || !months || months <= 0 || ratePerMonth < 0 || Number.isNaN(ratePerMonth)) return null
    const monthlyInterest = principal * ratePerMonth
    const totalInterest = monthlyInterest * months
    const totalRepay = principal + totalInterest
    return totalRepay / months
  })()

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={loan ? onFinish : undefined}
      className="space-y-6 sm:space-y-8"
    >
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437]">
        {user == null || loading ? (
          <div className="flex items-center justify-center min-h-screen bg-[#FBE437]">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        ) : !loan ? (
          <>
            <p className="text-gray-500 text-sm sm:text-base">ไม่พบรายการนี้หรือไม่มีสิทธิ์แก้ไข</p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 font-medium min-h-[48px] touch-manipulation"
            >
              กลับหน้ารายการ
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-red-700">แก้ไขข้อมูลสินเชื่อ</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/loan/${id}`}
                  className="edit-btn-amber px-4 py-3 sm:py-2 rounded-lg text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
                >
                  กลับรายละเอียด
                </Link>
                <Link
                  href="/"
                  className="edit-btn-gray px-4 py-2.5 sm:py-2 rounded-lg font-medium min-h-[48px] inline-flex items-center justify-center touch-manipulation shrink-0"
                >
                  หน้ารายการ
                </Link>
              </div>
            </div>
            <div className="space-y-6 sm:space-y-8">
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('เลขที่อ้างอิงสินเชื่อ')}
          </div>
          <div className="p-4 sm:p-6">
            <Form.Item name="loan_reference_number" label="เลขที่อ้างอิงสินเชื่อ" className={formItemClass}>
              <Input size="large" disabled placeholder="—" className="!rounded-lg w-full !bg-gray-50" />
            </Form.Item>
          </div>
        </section>

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
            {sectionTitle('ประเภทสินเชื่อ')}
          </div>
          <div className="p-4 sm:p-6">
            <Form.Item
              name="loan_type"
              label="ประเภทของสินเชื่อ"
              rules={[{ required: true, message: 'กรุณาเลือกประเภทสินเชื่อ' }]}
              className={formItemClass}
            >
              <Select
                size="large"
                placeholder="เลือกประเภทสินเชื่อ"
                className="!rounded-lg w-full"
                options={[
                  { value: 'personal_car', label: 'รถยนต์ส่วนบุคคล (รถยนต์นั่งไม่เกิน 7 ที่นั่ง)' },
                  { value: 'commercial_vehicle', label: 'รถยนต์เชิงพาณิชย์' },
                  { value: 'land_title', label: 'โฉนดที่ดิน' },
                ]}
              />
            </Form.Item>
          </div>
        </section>

        {!isLandTitle && (
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
              {sectionTitle('ข้อมูลรถ')}
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
              <Form.Item name="car_brand" label="ยี่ห้อรถ" rules={[{ required: true, message: 'กรุณากรอกยี่ห้อรถ' }]} className={formItemClass}>
                <Input size="large" placeholder="เช่น Toyota, Isuzu" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_model" label="รุ่นรถ" rules={[{ required: true, message: 'กรุณากรอกรุ่นรถ' }]} className={formItemClass}>
                <Input size="large" placeholder="กรอกรุ่นรถ" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_type" label="ลักษณะรถ" className={formItemClass}>
                <Input size="large" placeholder="เช่น 10 ล้อ, หัวลาก" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="registration_date" label="วันที่จดทะเบียนรถ" className={formItemClass}>
                <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
              </Form.Item>
              <Form.Item name="license_plate" label="เลขทะเบียนรถ" rules={[{ required: true, message: 'กรุณากรอกเลขทะเบียน' }]} className={formItemClassFull}>
                <Input size="large" placeholder="กรอกเลขทะเบียน" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_details" label="รายละเอียด/ตำหนิของรถ" className={formItemClassFull}>
                <Input.TextArea rows={3} placeholder="ระบุรายละเอียดหรือตำหนิ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
              </Form.Item>
            </div>
          </section>
        )}

        {isLandTitle && (
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
              {sectionTitle('ข้อมูลที่อยู่อาศัย')}
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
              <Form.Item name="residence_address" label="ที่อยู่" rules={[{ required: true, message: 'กรุณากรอกที่อยู่' }]} className={formItemClassFull}>
                <Input.TextArea rows={3} placeholder="กรอกที่อยู่ที่อยู่อาศัยตามโฉนดที่ดิน" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
              </Form.Item>
              <Form.Item name="land_deed_no" label="เลขที่โฉนด" className={formItemClass}>
                <Input size="large" placeholder="เลขที่โฉนดที่ดิน (ไม่บังคับ)" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="residence_details" label="รายละเอียดเพิ่มเติม" className={formItemClassFull}>
                <Input.TextArea rows={3} placeholder="รายละเอียดอื่นๆ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
              </Form.Item>
            </div>
          </section>
        )}

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
              label="อัตราดอกเบี้ย (% ต่อเดือน)"
              rules={[{ type: 'number', message: 'กรอกตัวเลขเท่านั้น' }]}
              className={formItemClass}
            >
              <InputNumber
                size="large"
                className="!w-full"
                min={0}
                placeholder="เช่น 1.25"
                addonAfter="%"
                controls={false}
                onKeyDown={allowDigitsAndDecimalKey}
                inputMode="decimal"
              />
            </Form.Item>
            <Form.Item label="ยอดผ่อนต่อเดือน (บาท)" className={formItemClass}>
              <Input
                size="large"
                disabled
                value={calculatedMonthlyInstallment != null ? formatCurrency(calculatedMonthlyInstallment) : ''}
                placeholder="กรอกยอดจัด จำนวนงวด และอัตราดอกเบี้ยต่อเดือนครบจะแสดงผลคำนวณ (Flat Rate)"
                className="!rounded-lg w-full !bg-gray-50"
              />
            </Form.Item>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('แนบเอกสาร')}
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {existingAttachments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">เอกสารที่มีอยู่ (กด X เพื่อลบออกจากเคส)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingAttachments.map((att) => {
                    const thumbUrl = existingFileUrls[att.file_path]
                    const isImg = isImage(att.file_name)
                    const isPdfFile = isPdf(att.file_name)
                    return (
                      <div
                        key={att.id}
                        className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group"
                      >
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(att.id)}
                          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                          aria-label="ลบไฟล์"
                        >
                          <CloseOutlined className="!text-xs" />
                        </button>
                        {isImg && thumbUrl ? (
                          <>
                            <div className="aspect-square bg-gray-100">
                              <img
                                src={thumbUrl}
                                alt={att.file_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={att.file_name}>
                              {att.file_name}
                            </p>
                          </>
                        ) : isImg && !thumbUrl ? (
                          <>
                            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">โหลด...</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={att.file_name}>
                              {att.file_name}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="aspect-square flex flex-col items-center justify-center text-gray-500 p-3">
                              {isPdfFile ? (
                                <FilePdfOutlined style={{ fontSize: 40, color: '#b91c1c' }} />
                              ) : (
                                <FileOutlined style={{ fontSize: 40, color: '#6b7280' }} />
                              )}
                              <span className="text-xs mt-2 truncate w-full text-center" title={att.file_name}>
                                {isPdfFile ? 'PDF' : att.file_name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={att.file_name}>
                              {att.file_name}
                            </p>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <Form.Item
                label={<span className="text-gray-700 font-medium">เพิ่มไฟล์ใหม่ (ถ้ามี)</span>}
                className="mb-0"
              >
                <Upload.Dragger
                  multiple
                  fileList={fileList}
                  onChange={normFile}
                  beforeUpload={() => false}
                  maxCount={999}
                  showUploadList={false}
                  className="!rounded-xl !border-2 !border-dashed !border-gray-200 hover:!border-red-300 !bg-gray-50/50 hover:!bg-red-50/30 [&.ant-upload-drag]:!rounded-xl"
                >
                  <p className="ant-upload-drag-icon mb-2">
                    <InboxOutlined style={{ fontSize: 40, color: '#b91c1c' }} />
                  </p>
                  <p className="ant-upload-text text-gray-700 font-medium">คลิกหรือลากไฟล์มาวางที่นี่</p>
                  <p className="ant-upload-hint text-gray-500 text-sm mt-1">รายการไฟล์จะแสดงด้านล่าง (รูปแสดงเป็น thumbnail)</p>
                </Upload.Dragger>
              </Form.Item>
              {fileList.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">ไฟล์ใหม่ที่เลือก ({fileList.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {fileList.map((file) => {
                      const isImg = isImageNewFile(file)
                      const thumbUrl = isImg ? newFileThumbUrls[file.uid] : null
                      return (
                        <div
                          key={file.uid}
                          className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group"
                        >
                          <button
                            type="button"
                            onClick={() => removeNewFile(file.uid)}
                            className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                            aria-label="ลบไฟล์"
                          >
                            <CloseOutlined className="!text-xs" />
                          </button>
                          {thumbUrl ? (
                            <>
                              <div className="aspect-square bg-gray-100">
                                <img
                                  src={thumbUrl}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={file.name}>
                                {file.name}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="aspect-square flex flex-col items-center justify-center text-gray-500 p-3">
                                {isPdf(file.name ?? '') ? (
                                  <FilePdfOutlined style={{ fontSize: 40, color: '#b91c1c' }} />
                                ) : (
                                  <FileOutlined style={{ fontSize: 40, color: '#6b7280' }} />
                                )}
                                <span className="text-xs mt-2 truncate w-full text-center" title={file.name}>
                                  {isPdf(file.name ?? '') ? 'PDF' : file.name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={file.name}>
                                {file.name}
                              </p>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="pt-2">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            className="!min-h-[52px] !text-base !rounded-xl !font-semibold touch-manipulation shadow-lg shadow-red-900/20"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
            </div>
          </>
        )}
      </div>
    </Form>
  )
}
