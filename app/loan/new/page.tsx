'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Form, Input, InputNumber, DatePicker, Upload, Button, message, Select } from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs, { DATE_DISPLAY_FORMAT } from '@/lib/dayjs'
import { supabase, STORAGE_BUCKET } from '@/lib/supabaseClient'
import { getSafeStoragePath } from '@/lib/storage'
import type { StaffUser, LoanType } from '@/lib/types'

export default function NewLoanPage() {
  const router = useRouter()
  const [user, setUser] = useState<StaffUser | null>(null)
  const [form] = Form.useForm()
  const watchedLoanType = Form.useWatch<LoanType>('loan_type', form)
  const loanType = watchedLoanType ?? 'personal_car'
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isLandTitle = loanType === 'land_title'

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

  const onFinish = async (values: Record<string, unknown>) => {
    if (!user) return
    setSubmitting(true)
    const toStr = (v: unknown) => (v != null && v !== '' ? String(v) : null)
    const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null)
    const toDate = (v: unknown) => (v ? dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD') : null)

    try {
      const payload: Record<string, unknown> = {
        submission_date: toDate(values.submission_date) || dayjs().format('YYYY-MM-DD'),
        sale_id: user.id,
        sales_name: user.name,
        loan_reference_number: toStr(values.loan_reference_number),
        customer_name: toStr(values.customer_name),
        id_card_number: toStr(values.id_card_number),
        birth_date: toDate(values.birth_date),
        loan_type: toStr(values.loan_type) || null,
        loan_amount: toNum(values.loan_amount),
        closing_amount: toNum(values.closing_amount),
        term_months: toNum(values.term_months),
        interest_rate: toNum(values.interest_rate),
        status: 'รอตรวจสอบ',
      }
      if (values.loan_type === 'land_title') {
        payload.residence_address = toStr(values.residence_address)
        payload.land_deed_no = toStr(values.land_deed_no)
        payload.residence_details = toStr(values.residence_details)
      } else {
        payload.car_brand = toStr(values.car_brand)
        payload.car_model = toStr(values.car_model)
        payload.car_type = toStr(values.car_type)
        payload.registration_date = toDate(values.registration_date)
        payload.license_plate = toStr(values.license_plate)
        payload.car_details = toStr(values.car_details)
      }

      const { data: loan, error } = await supabase
        .from('loans')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      const rawFiles = fileList.map((f) => f.originFileObj).filter(Boolean)
      const files = rawFiles as File[]
      for (const file of files) {
        const path = getSafeStoragePath(loan.id, file)
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file)
        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(uploadError.message === 'Bucket not found' ? 'ไม่พบ Storage bucket กรุณาสร้าง bucket ใน Supabase Dashboard' : uploadError.message)
        }
        const { error: insertError } = await supabase
          .from('loan_attachments')
          .insert([{ loan_id: loan.id, file_path: path, file_name: file.name }])
        if (insertError) throw insertError
      }

      message.success('ส่งสินเชื่อสำเร็จ!')
      router.push('/')
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

  const isImageFile = (file: UploadFile) => {
    const f = file.originFileObj as File | undefined
    if (!f) return false
    if (f.type?.startsWith('image/')) return true
    const ext = (file.name ?? '').toLowerCase().split('.').pop()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext ?? '')
  }

  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const thumbUrlsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const uids = new Set(fileList.map((f) => f.uid))
    const next: Record<string, string> = {}
    fileList.forEach((file) => {
      if (!isImageFile(file) || !file.originFileObj) return
      const url = thumbUrlsRef.current[file.uid] ?? URL.createObjectURL(file.originFileObj)
      next[file.uid] = url
    })
    Object.keys(thumbUrlsRef.current).forEach((uid) => {
      if (!uids.has(uid)) URL.revokeObjectURL(thumbUrlsRef.current[uid])
    })
    thumbUrlsRef.current = next
    setThumbUrls(next)
  }, [fileList])

  useEffect(() => {
    return () => {
      Object.values(thumbUrlsRef.current).forEach(URL.revokeObjectURL)
      thumbUrlsRef.current = {}
    }
  }, [])

  const removeFile = (uid: string) => {
    setFileList((prev) => prev.filter((f) => f.uid !== uid))
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

  if (user == null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBE437]">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  const sectionTitle = (title: string) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1 h-6 sm:h-7 bg-red-600 rounded-full shrink-0" aria-hidden />
      <h2 className="text-red-700 font-semibold text-base sm:text-lg m-0">{title}</h2>
    </div>
  )

  const formItemClass = "w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-picker]:min-h-[44px] [&_.ant-picker]:!rounded-lg [&_.ant-picker]:w-full [&_.ant-input-number]:!flex [&_.ant-input-number]:!w-full [&_.ant-input-number]:!max-w-full [&_.ant-input-number-input]:!min-h-[44px] [&_.ant-input-number-input]:!flex-1 [&_.ant-input-number-input]:!min-w-0 [&_.ant-input-number-input]:!rounded-lg"
  const formItemClassFull = formItemClass + " md:col-span-2"

  return (
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700">แบบฟอร์มเสนอสินเชื่อใหม่</h1>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-300 font-medium min-h-[48px] touch-manipulation shrink-0"
        >
          กลับหน้ารายการ
        </Link>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="space-y-6 sm:space-y-8"
        initialValues={{ submission_date: dayjs(), loan_type: 'personal_car' }}
      >
        {/* เลขที่อ้างอิงสินเชื่อ */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('เลขที่อ้างอิงสินเชื่อ')}
          </div>
          <div className="p-4 sm:p-6">
            <Form.Item name="loan_reference_number" label="เลขที่อ้างอิงสินเชื่อ" className={formItemClass}>
              <Input size="large" placeholder="กรอกเลขที่อ้างอิง (ไม่บังคับ)" className="!rounded-lg w-full" />
            </Form.Item>
          </div>
        </section>

        {/* ข้อมูลผู้กู้ */}
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

        {/* ประเภทสินเชื่อ */}
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

        {/* ข้อมูลรถ — แสดงเมื่อเลือกประเภท 1 หรือ 2 */}
        {!isLandTitle && (
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
              {sectionTitle('ข้อมูลรถ')}
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
              <Form.Item name="car_brand" label="ยี่ห้อรถ" rules={[{ required: !isLandTitle, message: 'กรุณากรอกยี่ห้อรถ' }]} className={formItemClass}>
                <Input size="large" placeholder="เช่น Toyota, Isuzu" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_model" label="รุ่นรถ" rules={[{ required: !isLandTitle, message: 'กรุณากรอกรุ่นรถ' }]} className={formItemClass}>
                <Input size="large" placeholder="กรอกรุ่นรถ" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_type" label="ลักษณะรถ" className={formItemClass}>
                <Input size="large" placeholder="เช่น 10 ล้อ, หัวลาก" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="registration_date" label="วันที่จดทะเบียนรถ" className={formItemClass}>
                <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
              </Form.Item>
              <Form.Item name="license_plate" label="เลขทะเบียนรถ" rules={[{ required: !isLandTitle, message: 'กรุณากรอกเลขทะเบียน' }]} className={formItemClassFull}>
                <Input size="large" placeholder="กรอกเลขทะเบียน" className="!rounded-lg w-full" />
              </Form.Item>
              <Form.Item name="car_details" label="รายละเอียด/ตำหนิของรถ" className={formItemClassFull}>
                <Input.TextArea rows={3} placeholder="ระบุรายละเอียดหรือตำหนิ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
              </Form.Item>
            </div>
          </section>
        )}

        {/* ข้อมูลที่อยู่อาศัย — แสดงเมื่อเลือกโฉนดที่ดิน */}
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

        {/* ข้อมูลสินเชื่อ */}
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

        {/* แนบเอกสาร */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('แนบเอกสาร')}
          </div>
          <div className="p-4 sm:p-6">
            <Form.Item
              label={<span className="text-gray-700 font-medium">เลือกไฟล์ (ทีละไฟล์หรือหลายไฟล์)</span>}
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
            {fileList.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 font-medium mb-3">ไฟล์ที่แนบแล้ว ({fileList.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {fileList.map((file) => {
                    const isImg = isImageFile(file)
                    const thumbUrl = isImg ? thumbUrls[file.uid] : null
                    return (
                      <div
                        key={file.uid}
                        className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group"
                      >
                        <button
                          type="button"
                          onClick={() => removeFile(file.uid)}
                          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                          aria-label="ลบไฟล์"
                        >
                          <CloseOutlined className="!text-xs" />
                        </button>
                        {thumbUrl ? (
                          <div className="aspect-square bg-gray-100">
                            <img
                              src={thumbUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center text-gray-400 p-2">
                            <FileOutlined style={{ fontSize: 28 }} />
                            <span className="text-xs mt-1 truncate w-full text-center" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                        )}
                        {isImg && (
                          <p className="text-xs text-gray-500 truncate px-2 py-1.5" title={file.name}>
                            {file.name}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
            className="!min-h-[52px] !text-base !rounded-xl !font-semibold touch-manipulation shadow-lg shadow-red-900/20"
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งข้อมูลให้ผู้อนุมัติ'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
