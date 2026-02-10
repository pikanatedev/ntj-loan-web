'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Form, Input, InputNumber, DatePicker, Upload, Button, message } from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser } from '@/lib/types'

export default function NewLoanPage() {
  const router = useRouter()
  const [user, setUser] = useState<StaffUser | null>(null)
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

  const onFinish = async (values: Record<string, unknown>) => {
    if (!user) return
    setSubmitting(true)
    const toStr = (v: unknown) => (v != null && v !== '' ? String(v) : null)
    const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null)
    const toDate = (v: unknown) => (v ? dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD') : null)

    try {
      const { data: loan, error } = await supabase
        .from('loans')
        .insert([
          {
            submission_date: toDate(values.submission_date) || dayjs().format('YYYY-MM-DD'),
            sale_id: user.id,
            sales_name: user.name,
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
            status: 'รอตรวจสอบ',
          },
        ])
        .select()
        .single()

      if (error) throw error

      const rawFiles = fileList.map((f) => f.originFileObj).filter(Boolean)
      const files = rawFiles as File[]
      for (const file of files) {
        const path = `loans/${loan.id}/${Date.now()}_${file.name}`
        await supabase.storage.from('loan-docs').upload(path, file)
        await supabase
          .from('loan_attachments')
          .insert([{ loan_id: loan.id, file_path: path, file_name: file.name }])
      }

      message.success('ส่งเคสสำเร็จ!')
      router.push('/')
    } catch {
      message.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  const normFile = (e: { fileList: UploadFile[] }) => {
    setFileList(e.fileList)
  }

  if (user == null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-yellow-50">
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
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-yellow-50">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700">แบบฟอร์มส่งเคสใหม่</h1>
        <Link href="/" className="text-red-700 hover:underline py-2 -my-2 text-sm sm:text-base touch-manipulation">
          ← กลับหน้ารายการ
        </Link>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="space-y-6 sm:space-y-8"
        initialValues={{ submission_date: dayjs() }}
      >
        {/* ข้อมูลผู้กู้ */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลผู้กู้')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="customer_name" label="ชื่อ-นามสกุลผู้กู้" rules={[{ required: true }]} className={formItemClass}>
              <Input size="large" placeholder="กรอกชื่อ-นามสกุล" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="id_card_number" label="เลขบัตรประชาชน" className={formItemClass}>
              <Input size="large" placeholder="กรอกเลขบัตร 13 หลัก" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="birth_date" label="วันเดือนปีเกิดผู้กู้" className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format="DD/MM/YYYY" size="large" placeholder="เลือกวันที่" />
            </Form.Item>
          </div>
        </section>

        {/* ข้อมูลรถ */}
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
              <DatePicker className="w-full !rounded-lg" format="DD/MM/YYYY" size="large" placeholder="เลือกวันที่" />
            </Form.Item>
            <Form.Item name="license_plate" label="เลขทะเบียนรถ" rules={[{ required: true }]} className={formItemClassFull}>
              <Input size="large" placeholder="กรอกเลขทะเบียน" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="car_details" label="รายละเอียด/ตำหนิของรถ" className={formItemClassFull}>
              <Input.TextArea rows={3} placeholder="ระบุรายละเอียดหรือตำหนิ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
            </Form.Item>
          </div>
        </section>

        {/* ข้อมูลสินเชื่อ */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลสินเชื่อ')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="submission_date" label="วันที่เสนอเคส" rules={[{ required: true }]} className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format="DD/MM/YYYY" size="large" placeholder="เลือกวันที่" />
            </Form.Item>
            <Form.Item name="loan_amount" label="ยอดจัดที่ขอ (บาท)" rules={[{ required: true }]} className={formItemClass}>
              <InputNumber size="large" className="!w-full" min={0} placeholder="0" addonAfter="บาท" />
            </Form.Item>
            <Form.Item name="closing_amount" label="ยอดปิดบัญชีเดิม (ถ้ามี)" className={formItemClass}>
              <InputNumber size="large" className="!w-full" min={0} placeholder="0" addonAfter="บาท" />
            </Form.Item>
            <Form.Item name="term_months" label="จำนวนงวด (เดือน)" className={formItemClass}>
              <InputNumber size="large" className="!w-full" min={1} step={1} placeholder="เช่น 48" addonAfter="เดือน" />
            </Form.Item>
            <Form.Item name="interest_rate" label="อัตราดอกเบี้ย (%)" className={formItemClass}>
              <InputNumber size="large" className="!w-full" min={0} placeholder="เช่น 3.5" addonAfter="%" />
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
            className="!min-h-[52px] !text-base !rounded-xl !font-semibold touch-manipulation shadow-lg shadow-red-900/20"
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งข้อมูลให้ผู้อนุมัติ'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
