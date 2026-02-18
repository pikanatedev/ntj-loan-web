'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { App, Form, Input, InputNumber, DatePicker, Upload, Button, Select, Radio } from 'antd'
import type { UploadFile } from 'antd'
import { InboxOutlined, FilePdfOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs, { DATE_DISPLAY_FORMAT } from '@/lib/dayjs'
import { supabase, STORAGE_BUCKET } from '@/lib/supabaseClient'
import { getSafeStoragePath } from '@/lib/storage'
import { ThaiAddressSelects, ProvinceSelect } from '@/app/components/ThaiAddressSelects'
import { CarBrandSelect, CarModelSelect, CarFuelTypeSelect } from '@/app/components/ThaiCarSelects'
import {
  CommercialCarBrandSelect,
  CommercialCarTypeSelect,
  CommercialCarModelSelect,
} from '@/app/components/CommercialCarSelects'
import type { StaffUser, Loan, LoanAttachment, LoanType, BorrowerInfo } from '@/lib/types'
import {
  getDocumentSections,
  getAllDocumentKeys,
  DOC_ITEMS_BORROWER_PERSONAL,
  DOC_ITEMS_INCOME,
  DOC_ITEMS_VEHICLE,
  DOC_ITEMS_LAND,
  DOC_ITEMS_LOAN,
  type DocumentChecklistItem,
} from '@/lib/data/documentChecklist'

function loanToInitialValues(row: Loan) {
  const bo = row.borrower_info as BorrowerInfo | undefined
  return {
    loan_reference_number: row.loan_reference_number ?? undefined,
    customer_name: row.customer_name ?? undefined,
    id_card_number: row.id_card_number ?? undefined,
    birth_date: row.birth_date ? dayjs(row.birth_date) : undefined,
    ...(bo && {
      id_card_expiry_date: bo.id_card_expiry_date ? dayjs(bo.id_card_expiry_date) : undefined,
      nationality: bo.nationality ?? undefined,
      age: bo.age ?? undefined,
      marital_status: bo.marital_status ?? undefined,
      children_count: bo.children_count ?? undefined,
      company_history: bo.company_history ?? undefined,
      company_history_type: bo.company_history_type ?? undefined,
      education_level: bo.education_level ?? undefined,
      payer: bo.payer ?? undefined,
      car_user: bo.car_user ?? undefined,
      car_user_name: bo.car_user_name ?? undefined,
      car_user_phone: bo.car_user_phone ?? undefined,
      address_no: bo.address_no ?? undefined,
      address_moo: bo.address_moo ?? undefined,
      address_village: bo.address_village ?? undefined,
      address_soi: bo.address_soi ?? undefined,
      address_road: bo.address_road ?? undefined,
      address_subdistrict: bo.address_subdistrict ?? undefined,
      address_district: bo.address_district ?? undefined,
      address_province: bo.address_province ?? undefined,
      address_postal_code: bo.address_postal_code ?? undefined,
      address_type: bo.address_type ?? undefined,
      address_years: bo.address_years ?? undefined,
      ownership_type: bo.ownership_type ?? undefined,
      rent_amount: bo.rent_amount ?? undefined,
      phone_home: bo.phone_home ?? undefined,
      phone_work: bo.phone_work ?? undefined,
      phone_fax: bo.phone_fax ?? undefined,
      mobile_phone: bo.mobile_phone ?? undefined,
      email: bo.email ?? undefined,
      line_id: bo.line_id ?? undefined,
      facebook: bo.facebook ?? undefined,
      instagram: bo.instagram ?? undefined,
      map_note: bo.map_note ?? undefined,
      occupation_type: bo.occupation_type ?? undefined,
      business_size: bo.business_size ?? undefined,
      business_type: bo.business_type ?? undefined,
      asset_value: bo.asset_value ?? undefined,
      land_value: bo.land_value ?? undefined,
      employee_count: bo.employee_count ?? undefined,
      workplace_name: bo.workplace_name ?? undefined,
      workplace_address: bo.workplace_address ?? undefined,
      position: bo.position ?? undefined,
      department: bo.department ?? undefined,
      income_salary: bo.income_salary ?? undefined,
      income_commission: bo.income_commission ?? undefined,
      income_other: bo.income_other ?? undefined,
      income_foreign_country: bo.income_foreign_country ?? undefined,
      income_foreign_amount: bo.income_foreign_amount ?? undefined,
      payment_channel: bo.payment_channel ?? undefined,
      bank_name: bo.bank_name ?? undefined,
      bank_account: bo.bank_account ?? undefined,
      payment_other: bo.payment_other ?? undefined,
      years_current_job: bo.years_current_job ?? undefined,
      years_total_job: bo.years_total_job ?? undefined,
      prev_workplace_name: bo.prev_workplace_name ?? undefined,
      prev_position: bo.prev_position ?? undefined,
      prev_department: bo.prev_department ?? undefined,
      monthly_car_installment: bo.monthly_car_installment ?? undefined,
      monthly_house_installment: bo.monthly_house_installment ?? undefined,
    }),
    loan_type: (row.loan_type as LoanType) ?? 'personal_car',
    car_brand: row.car_brand ?? undefined,
    car_model: row.car_model ?? undefined,
    car_type: row.car_type ?? undefined,
    car_fuel_type: row.car_fuel_type ?? undefined,
    registration_date: row.registration_date ? dayjs(row.registration_date) : undefined,
    license_plate: row.license_plate ?? undefined,
    registration_province: row.registration_province ?? undefined,
    car_details: row.car_details ?? undefined,
    residence_address: row.residence_address ?? undefined,
    land_deed_no: row.land_deed_no ?? undefined,
    residence_details: row.residence_details ?? undefined,
    submission_date: row.submission_date ? dayjs(row.submission_date) : dayjs(),
    loan_amount: row.loan_amount ?? undefined,
    closing_amount: row.closing_amount ?? undefined,
    term_months: row.term_months ?? undefined,
    interest_rate: row.interest_rate ?? undefined,
  }
}

export default function EditLoanPage() {
  const { message } = App.useApp()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()
  const [fileListByType, setFileListByType] = useState<Record<string, UploadFile[]>>({})
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
      setLoading(false)
    }
    fetchLoan()
  }, [id, user, form])

  // เมื่อมี loan แล้ว ต้อง set ค่าฟอร์มเอง เพราะ Form ที่ใช้ form prop จะไม่เอา initialValues ไปใส่ store
  useEffect(() => {
    if (!loan) return
    const values = loanToInitialValues(loan)
    // set หลัง Form + ลูก mount แล้ว (รอบถัดไป) เพื่อให้ useWatch ในลูกได้ค่าตอน re-render
    const t = setTimeout(() => form.setFieldsValue(values), 0)
    return () => clearTimeout(t)
  }, [loan, form])

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

  const allNewFiles = useMemo(() => Object.values(fileListByType).flat(), [fileListByType])
  useEffect(() => {
    const uids = new Set(allNewFiles.map((f) => f.uid))
    const next: Record<string, string> = {}
    allNewFiles.forEach((file) => {
      if (!isImageNewFile(file) || !file.originFileObj) return
      const url = newFileThumbUrlsRef.current[file.uid] ?? URL.createObjectURL(file.originFileObj)
      next[file.uid] = url
    })
    Object.keys(newFileThumbUrlsRef.current).forEach((uid) => {
      if (!uids.has(uid)) URL.revokeObjectURL(newFileThumbUrlsRef.current[uid])
    })
    newFileThumbUrlsRef.current = next
    setNewFileThumbUrls(next)
  }, [allNewFiles])

  useEffect(() => {
    return () => {
      Object.values(newFileThumbUrlsRef.current).forEach(URL.revokeObjectURL)
      newFileThumbUrlsRef.current = {}
    }
  }, [])

  const removeNewFile = (documentType: string, uid: string) => {
    setFileListByType((prev) => {
      const list = prev[documentType] ?? []
      const next = list.filter((f) => f.uid !== uid)
      if (next.length === 0) {
        const rest = { ...prev }
        delete rest[documentType]
        return rest
      }
      return { ...prev, [documentType]: next }
    })
  }

  const onFinish = async (values: Record<string, unknown>) => {
    if (!user || !id) return
    setSubmitting(true)
    const toStr = (v: unknown) => (v != null && v !== '' ? String(v) : null)
    const toNum = (v: unknown) => (v != null && v !== '' ? Number(v) : null)
    const toDate = (v: unknown) => (v ? dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD') : null)

    try {
      const borrower_info: BorrowerInfo = {
        id_card_expiry_date: toDate(values.id_card_expiry_date) ?? toStr(values.id_card_expiry_date),
        nationality: toStr(values.nationality),
        age: toNum(values.age),
        marital_status: toStr(values.marital_status),
        children_count: toNum(values.children_count),
        company_history: toStr(values.company_history),
        company_history_type: toStr(values.company_history_type),
        education_level: toStr(values.education_level),
        payer: toStr(values.payer),
        car_user: toStr(values.car_user),
        car_user_name: toStr(values.car_user_name),
        car_user_phone: toStr(values.car_user_phone),
        address_no: toStr(values.address_no),
        address_moo: toStr(values.address_moo),
        address_village: toStr(values.address_village),
        address_soi: toStr(values.address_soi),
        address_road: toStr(values.address_road),
        address_subdistrict: toStr(values.address_subdistrict),
        address_district: toStr(values.address_district),
        address_province: toStr(values.address_province),
        address_postal_code: toStr(values.address_postal_code),
        address_type: toStr(values.address_type),
        address_years: toNum(values.address_years),
        ownership_type: toStr(values.ownership_type),
        rent_amount: toNum(values.rent_amount),
        phone_home: toStr(values.phone_home),
        phone_work: toStr(values.phone_work),
        phone_fax: toStr(values.phone_fax),
        mobile_phone: toStr(values.mobile_phone),
        email: toStr(values.email),
        line_id: toStr(values.line_id),
        facebook: toStr(values.facebook),
        instagram: toStr(values.instagram),
        map_note: toStr(values.map_note),
        occupation_type: toStr(values.occupation_type),
        business_size: toStr(values.business_size),
        business_type: toStr(values.business_type),
        asset_value: toNum(values.asset_value),
        land_value: toNum(values.land_value),
        employee_count: toNum(values.employee_count),
        workplace_name: toStr(values.workplace_name),
        workplace_address: toStr(values.workplace_address),
        position: toStr(values.position),
        department: toStr(values.department),
        income_salary: toNum(values.income_salary),
        income_commission: toNum(values.income_commission),
        income_other: toNum(values.income_other),
        income_foreign_country: toStr(values.income_foreign_country),
        income_foreign_amount: toNum(values.income_foreign_amount),
        payment_channel: toStr(values.payment_channel),
        bank_name: toStr(values.bank_name),
        bank_account: toStr(values.bank_account),
        payment_other: toStr(values.payment_other),
        years_current_job: toNum(values.years_current_job),
        years_total_job: toNum(values.years_total_job),
        prev_workplace_name: toStr(values.prev_workplace_name),
        prev_position: toStr(values.prev_position),
        prev_department: toStr(values.prev_department),
        monthly_car_installment: toNum(values.monthly_car_installment),
        monthly_house_installment: toNum(values.monthly_house_installment),
      }
      const updatePayload: Record<string, unknown> = {
        submission_date: toDate(values.submission_date) || dayjs().format('YYYY-MM-DD'),
        ...(loan?.status === 'ส่งกลับไปแก้ไข' ? { status: 'รอตรวจสอบ' as const } : {}),
        loan_reference_number: toStr(values.loan_reference_number),
        customer_name: toStr(values.customer_name),
        id_card_number: toStr(values.id_card_number),
        birth_date: toDate(values.birth_date),
        borrower_info: Object.fromEntries(Object.entries(borrower_info).filter(([, v]) => v != null && v !== '')),
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
        updatePayload.car_fuel_type = null
        updatePayload.registration_date = null
        updatePayload.license_plate = null
        updatePayload.registration_province = null
        updatePayload.car_details = null
      } else {
        updatePayload.car_brand = toStr(
          values.car_brand === 'อื่นๆ'
            ? (String((values as { car_brand_other?: string }).car_brand_other ?? '').trim() || 'อื่นๆ')
            : values.car_brand
        )
        updatePayload.car_model = toStr(
          values.car_model === 'อื่นๆ'
            ? (String((values as { car_model_other?: string }).car_model_other ?? '').trim() || 'อื่นๆ')
            : values.car_model
        )
        updatePayload.car_type = toStr(values.car_type)
        updatePayload.car_fuel_type = toStr(
          values.car_fuel_type === 'อื่นๆ'
            ? (String((values as { car_fuel_type_other?: string }).car_fuel_type_other ?? '').trim() || 'อื่นๆ')
            : values.car_fuel_type
        )
        updatePayload.registration_date = toDate(values.registration_date)
        updatePayload.license_plate = toStr(values.license_plate)
        updatePayload.registration_province = toStr(values.registration_province)
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

      const docKeys = getAllDocumentKeys(String(values.loan_type || loan?.loan_type || 'personal_car'))
      for (const item of docKeys) {
        const list = fileListByType[item.key] ?? []
        const rawFiles = list.map((f) => f.originFileObj).filter(Boolean)
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
            .insert([{ loan_id: id, file_path: path, file_name: file.name, document_type: item.key }])
          if (insertError) throw insertError
        }
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

  const normFile = (documentType: string) => (e: { fileList: UploadFile[] }) => {
    setFileListByType((prev) => ({ ...prev, [documentType]: e.fileList }))
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
  const loanType = watchedLoanType ?? (loan?.loan_type as LoanType) ?? 'personal_car'
  const isLandTitle = loanType === 'land_title'
  const isPersonalCar = loanType === 'personal_car'
  const documentSections = getDocumentSections(loanType)
  const existingByType = useMemo(() => {
    const list = (loan?.loan_attachments ?? []) as LoanAttachment[]
    const kept = list.filter((a) => !idsToRemove.includes(a.id))
    const map: Record<string, LoanAttachment[]> = {}
    kept.forEach((att) => {
      const key = att.document_type ?? '_other'
      if (!map[key]) map[key] = []
      map[key].push(att)
    })
    return map
  }, [loan?.loan_attachments, idsToRemove])

  /** แสดงบล็อกแนบเอกสารใน Card (ใช้แทรกในแต่ละ section) */
  const renderEditDocUpload = (items: DocumentChecklistItem[]) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
        {items.map((item) => {
          const existingForType = existingByType[item.key] ?? []
          const newList = fileListByType[item.key] ?? []
          const hasExisting = existingForType.length > 0
          const hasNew = newList.length > 0
          return (
            <div key={item.key} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <Form.Item label={<span className="text-gray-700 font-medium">☐ {item.label}</span>} className="mb-0">
                {hasExisting && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {existingForType.map((att) => {
                      const thumbUrl = existingFileUrls[att.file_path]
                      const isImg = isImage(att.file_name)
                      const isPdfFile = isPdf(att.file_name)
                      return (
                        <div key={att.id} className="relative w-20 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0">
                          <button type="button" onClick={() => removeExistingAttachment(att.id)} className="absolute top-0.5 right-0.5 z-10 w-5 h-5 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center text-xs" aria-label="ลบไฟล์">
                            <CloseOutlined />
                          </button>
                          {isImg && thumbUrl ? (
                            <img src={thumbUrl} alt={att.file_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-1">
                              {isPdfFile ? <FilePdfOutlined style={{ fontSize: 20, color: '#b91c1c' }} /> : <FileOutlined style={{ fontSize: 20 }} />}
                              <span className="text-[10px] truncate w-full text-center" title={att.file_name}>{att.file_name}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <Upload.Dragger multiple fileList={newList} onChange={normFile(item.key)} beforeUpload={() => false} maxCount={99} showUploadList={false} className="!rounded-lg !border-2 !border-dashed !border-gray-200 hover:!border-red-300 !bg-white [&.ant-upload-drag]:!rounded-lg">
                  <p className="ant-upload-drag-icon mb-1"><InboxOutlined style={{ fontSize: 28, color: '#b91c1c' }} /></p>
                  <p className="ant-upload-text text-gray-600 text-sm font-medium">คลิกหรือลากไฟล์มาวาง (เพิ่มเติม)</p>
                </Upload.Dragger>
                {hasNew && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newList.map((file) => {
                      const isImg = isImageNewFile(file)
                      const thumbUrl = isImg ? newFileThumbUrls[file.uid] : null
                      return (
                        <div key={file.uid} className="relative w-20 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0">
                          <button type="button" onClick={() => removeNewFile(item.key, file.uid)} className="absolute top-0.5 right-0.5 z-10 w-5 h-5 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center text-xs" aria-label="ลบไฟล์">
                            <CloseOutlined />
                          </button>
                          {thumbUrl ? <img src={thumbUrl} alt={file.name} className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-1">
                              <FileOutlined style={{ fontSize: 20 }} />
                              <span className="text-[10px] truncate w-full text-center" title={file.name}>{file.name}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Form.Item>
            </div>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    setFileListByType({})
  }, [loanType])

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
    <div className={loan ? 'pb-24 sm:pb-28' : ''}>
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
            className="edit-btn-gray mt-3 inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium min-h-[48px] touch-manipulation"
          >
            กลับหน้ารายการ
          </Link>
        </>
      ) : (
        <Form
          form={form}
          initialValues={loanToInitialValues(loan)}
          key={loan.id}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={({ errorFields }) => {
            const count = errorFields?.length ?? 0
            const firstErrors = errorFields?.slice(0, 3).map((f) => f.errors?.[0]).filter(Boolean) as string[] | undefined
            const detail = firstErrors?.length ? ` เช่น ${firstErrors.join(', ')}` : ''
            message.warning(`กรุณากรอกข้อมูลในส่วนที่จำเป็นให้ครบ (พบ ${count} รายการ)${detail}`, 5)
          }}
          scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
          className="space-y-6 sm:space-y-8"
        >
          <div className="space-y-6 sm:space-y-8">
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
            {sectionTitle('ข้อมูลผู้กู้ — 1. ข้อมูลส่วนตัว')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="customer_name" label="ชื่อ-นามสกุลผู้กู้" rules={[{ required: true }]} className={formItemClass}>
              <Input size="large" placeholder="กรอกชื่อ-นามสกุล" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="birth_date" label="วันเดือนปีเกิดผู้กู้" className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
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
            <Form.Item name="id_card_expiry_date" label="วันหมดอายุบัตร" className={formItemClass}>
              <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
            </Form.Item>
            <Form.Item name="nationality" label="สัญชาติ" className={formItemClass}>
              <Input size="large" placeholder="ระบุสัญชาติ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="age" label="อายุ (ปี)" className={formItemClass}>
              <InputNumber size="large" min={1} max={120} placeholder="ระบุอายุ" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="marital_status" label="สถานภาพ" className={formItemClass}>
              <Select size="large" placeholder="เลือกสถานภาพ" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกสถานภาพ' }, { value: 'โสด', label: 'โสด' }, { value: 'สมรส', label: 'สมรส' }, { value: 'หย่า', label: 'หย่า' }, { value: 'แยกกันอยู่', label: 'แยกกันอยู่' }]} />
            </Form.Item>
            <Form.Item name="children_count" label="จำนวนบุตร (คน)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุจำนวน" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="company_history" label="เคยเป็นลูกค้าของบริษัท" className={formItemClass}>
              <Radio.Group size="large" className="flex flex-wrap gap-2">
                <Radio value="ไม่เคย">ไม่เคย</Radio>
                <Radio value="เคย">เคย</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="company_history_type" label="ประเภทบริการ (กรณีเคย)" className={formItemClass}>
              <Input size="large" placeholder="ระบุประเภทบริการ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="education_level" label="ระดับการศึกษา" className={formItemClass}>
              <Select size="large" placeholder="เลือกระดับการศึกษา" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกระดับการศึกษา' }, { value: 'ต่ำกว่ามัธยมศึกษา', label: 'ต่ำกว่ามัธยมศึกษา' }, { value: 'มัธยมศึกษา', label: 'มัธยมศึกษา' }, { value: 'ปวช./ปวส.', label: 'ปวช./ปวส.' }, { value: 'ปริญญาตรี', label: 'ปริญญาตรี' }, { value: 'ปริญญาโทหรือสูงกว่า', label: 'ปริญญาโทหรือสูงกว่า' }]} />
            </Form.Item>
            <Form.Item name="payer" label="ผู้ชำระเงิน" className={formItemClass}>
              <Select size="large" placeholder="เลือกผู้ชำระเงิน" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกผู้ชำระเงิน' }, { value: 'ตนเอง', label: 'ตนเอง' }, { value: 'บิดา/มารดา', label: 'บิดา/มารดา' }, { value: 'คู่สมรส', label: 'คู่สมรส' }, { value: 'บุตร', label: 'บุตร' }, { value: 'นายจ้าง', label: 'นายจ้าง' }, { value: 'ผู้ค้ำประกัน', label: 'ผู้ค้ำประกัน' }, { value: 'รับภาระร่วมกันหลายคน', label: 'รับภาระร่วมกันหลายคน' }, { value: 'อื่นๆ', label: 'อื่นๆ' }]} />
            </Form.Item>
            <Form.Item name="car_user" label="ผู้ใช้รถ" className={formItemClass}>
              <Select size="large" placeholder="เลือกผู้ใช้รถ" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกผู้ใช้รถ' }, { value: 'ตนเอง', label: 'ตนเอง' }, { value: 'บิดา/มารดา', label: 'บิดา/มารดา' }, { value: 'คู่สมรส', label: 'คู่สมรส' }, { value: 'บุตร', label: 'บุตร' }, { value: 'ลูกจ้าง', label: 'ลูกจ้าง' }, { value: 'ผู้ค้ำประกัน', label: 'ผู้ค้ำประกัน' }]} />
            </Form.Item>
            <Form.Item name="car_user_name" label="ชื่อผู้ใช้รถ" className={formItemClass}>
              <Input size="large" placeholder="ระบุชื่อ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="car_user_phone" label="โทรผู้ใช้รถ" className={formItemClass}>
              <Input size="large" placeholder="ระบุเบอร์โทรศัพท์" className="!rounded-lg w-full" />
            </Form.Item>
          </div>
          {renderEditDocUpload(DOC_ITEMS_BORROWER_PERSONAL)}
        </section>

        {/* 2. ที่อยู่ปัจจุบัน */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลผู้กู้สินเชื่อ — 2. ที่อยู่ปัจจุบัน')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="address_no" label="เลขที่" className={formItemClass}>
              <Input size="large" placeholder="ระบุเลขที่" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="address_moo" label="หมู่ที่" className={formItemClass}>
              <Input size="large" placeholder="ระบุหมู่ที่" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="address_village" label="หมู่บ้าน/อาคาร" className={formItemClass}>
              <Input size="large" placeholder="ระบุหมู่บ้าน/อาคาร" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="address_soi" label="ซอย" className={formItemClass}>
              <Input size="large" placeholder="ระบุซอย" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="address_road" label="ถนน" className={formItemClass}>
              <Input size="large" placeholder="ระบุถนน" className="!rounded-lg w-full" />
            </Form.Item>
            <ThaiAddressSelects form={form} namePrefix="address" className={formItemClass} />
            <Form.Item name="address_type" label="ลักษณะที่อยู่" className={formItemClass}>
              <Select size="large" placeholder="เลือกลักษณะที่อยู่" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกลักษณะที่อยู่' }, { value: 'ตึกแถว', label: 'ตึกแถว' }, { value: 'ทาวน์เฮ้าส์', label: 'ทาวน์เฮ้าส์' }, { value: 'บ้านเดี่ยว', label: 'บ้านเดี่ยว' }, { value: 'คอนโดมิเนียม', label: 'คอนโดมิเนียม' }, { value: 'อพาร์ทเม้นท์', label: 'อพาร์ทเม้นท์' }]} />
            </Form.Item>
            <Form.Item name="address_years" label="อยู่อาศัยมากี่ปี" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุจำนวนปี" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="ownership_type" label="ลักษณะการเป็นเจ้าของ" className={formItemClass}>
              <Select size="large" placeholder="เลือกลักษณะการเป็นเจ้าของ" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกลักษณะการเป็นเจ้าของ' }, { value: 'บ้านตนเอง', label: 'บ้านตนเอง' }, { value: 'บ้านพ่อแม่', label: 'บ้านพ่อแม่' }, { value: 'บ้านญาติ', label: 'บ้านญาติ' }, { value: 'บ้านเช่า', label: 'บ้านเช่า' }, { value: 'อื่นๆ', label: 'อื่นๆ' }]} />
            </Form.Item>
            <Form.Item name="rent_amount" label="ค่าเช่าเดือนละ (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุค่าเช่า" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
          </div>
        </section>

        {/* 3. ช่องทางการติดต่อ */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลผู้กู้สินเชื่อ — 3. ช่องทางการติดต่อ')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="mobile_phone" label="โทรศัพท์มือถือ" rules={[{ required: true, message: 'กรุณากรอกโทรศัพท์มือถือ' }]} className={formItemClass}>
              <Input size="large" placeholder="ระบุเบอร์มือถือ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="phone_home" label="เบอร์บ้าน" className={formItemClass}>
              <Input size="large" placeholder="เบอร์บ้าน" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="phone_work" label="เบอร์ที่ทำงาน" className={formItemClass}>
              <Input size="large" placeholder="เบอร์ที่ทำงาน" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="phone_fax" label="โทรสาร" className={formItemClass}>
              <Input size="large" placeholder="โทรสาร" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="email" label="Email" className={formItemClass}>
              <Input size="large" type="email" placeholder="ระบุ Email" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="line_id" label="ID Line" className={formItemClass}>
              <Input size="large" placeholder="ระบุ ID Line" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="facebook" label="Facebook" className={formItemClass}>
              <Input size="large" placeholder="ระบุ Facebook" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="instagram" label="Instagram" className={formItemClass}>
              <Input size="large" placeholder="ระบุ Instagram" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="map_note" label="แผนที่ (ที่อยู่บ้าน/ที่ทำงาน)" className={formItemClassFull}>
              <Input.TextArea rows={2} placeholder="ระบุหรืออธิบายตำแหน่งแผนที่บ้านและที่ทำงาน" className="!rounded-lg [&_.ant-input]:min-h-[60px]" />
            </Form.Item>
          </div>
        </section>

        {/* 4. อาชีพและรายได้ */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
            {sectionTitle('ข้อมูลผู้กู้สินเชื่อ — 4. อาชีพและรายได้')}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-4">
            <Form.Item name="occupation_type" label="ประเภทอาชีพ" className={formItemClass}>
              <Select size="large" placeholder="เลือกประเภทอาชีพ" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกประเภทอาชีพ' }, { value: 'ข้าราชการ', label: 'ข้าราชการ' }, { value: 'ทหาร/ตำรวจ', label: 'ทหาร/ตำรวจ' }, { value: 'ครู/อาจารย์', label: 'ครู/อาจารย์' }, { value: 'พนักงานออฟฟิศ', label: 'พนักงานออฟฟิศ' }, { value: 'พนักงานรัฐวิสาหกิจ', label: 'พนักงานรัฐวิสาหกิจ' }, { value: 'นายหน้า/ตัวแทน', label: 'นายหน้า/ตัวแทน' }, { value: 'อาชีพอิสระ', label: 'อาชีพอิสระ' }]} />
            </Form.Item>
            <Form.Item name="business_size" label="กรณีค้าขาย/ธุรกิจส่วนตัว" className={formItemClass}>
              <Select size="large" placeholder="เลือกขนาดธุรกิจ" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกขนาดธุรกิจ' }, { value: 'ขนาดเล็ก', label: 'ขนาดเล็ก' }, { value: 'ขนาดกลาง', label: 'ขนาดกลาง' }, { value: 'ขนาดใหญ่', label: 'ขนาดใหญ่' }]} />
            </Form.Item>
            <Form.Item name="business_type" label="ประเภทธุรกิจ" className={formItemClass}>
              <Input size="large" placeholder="ระบุลักษณะธุรกิจ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="asset_value" label="มูลค่าทรัพย์สินถาวร ไม่รวมที่ดิน (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุมูลค่า" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="land_value" label="มูลค่าที่ดิน (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุมูลค่าที่ดิน" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="employee_count" label="จำนวนพนักงาน" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุจำนวน" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="workplace_name" label="ชื่อบริษัท/หน่วยงาน" className={formItemClass}>
              <Input size="large" placeholder="ระบุชื่อบริษัท/หน่วยงาน" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="workplace_address" label="ที่ตั้งสถานที่ทำงาน" className={formItemClass}>
              <Input size="large" placeholder="ที่ตั้งโดยละเอียด" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="position" label="ตำแหน่ง" className={formItemClass}>
              <Input size="large" placeholder="ระบุตำแหน่ง" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="department" label="ฝ่าย/แผนก" className={formItemClass}>
              <Input size="large" placeholder="ระบุฝ่าย/แผนก" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="income_salary" label="รายได้เงินเดือน/กำไรสุทธิ (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="income_commission" label="รายได้ค่าคอมมิชชั่น (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="income_other" label="รายได้อื่นๆ (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="income_foreign_country" label="รายได้จากต่างประเทศ — ประเทศ" className={formItemClass}>
              <Input size="large" placeholder="ระบุประเทศ (ถ้ามี)" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="income_foreign_amount" label="รายได้จากต่างประเทศ — จำนวน (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="payment_channel" label="ช่องทางการรับเงิน" className={formItemClass}>
              <Select size="large" placeholder="เลือกช่องทาง" className="!rounded-lg w-full" allowClear options={[{ value: '', label: 'เลือกช่องทาง' }, { value: 'เข้าบัญชีธนาคาร', label: 'เข้าบัญชีธนาคาร' }, { value: 'เงินสด', label: 'เงินสด' }, { value: 'อื่นๆ', label: 'อื่นๆ' }]} />
            </Form.Item>
            <Form.Item name="bank_name" label="ชื่อธนาคาร" className={formItemClass}>
              <Input size="large" placeholder="ระบุชื่อธนาคาร" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="bank_account" label="เลขที่บัญชี" className={formItemClass}>
              <Input size="large" placeholder="ระบุเลขที่บัญชี" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="payment_other" label="ช่องทางรับเงิน อื่นๆ" className={formItemClass}>
              <Input size="large" placeholder="ระบุ" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="years_current_job" label="อายุงานที่ทำงานปัจจุบัน (ปี)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุปี" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="years_total_job" label="อายุงานรวม (ปี)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุปี" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="prev_workplace_name" label="ชื่อสถานที่ทำงานเดิม (กรณีอายุงานปัจจุบันไม่ถึง 1 ปี)" className={formItemClass}>
              <Input size="large" placeholder="ระบุชื่อสถานที่ทำงานเดิม" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="prev_position" label="ตำแหน่ง (ที่ทำงานเดิม)" className={formItemClass}>
              <Input size="large" placeholder="ระบุตำแหน่ง" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="prev_department" label="ฝ่าย/แผนก (ที่ทำงานเดิม)" className={formItemClass}>
              <Input size="large" placeholder="ระบุฝ่าย/แผนก" className="!rounded-lg w-full" />
            </Form.Item>
            <Form.Item name="monthly_car_installment" label="ภาระประจำเดือน — ค่างวดรถ (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
            <Form.Item name="monthly_house_installment" label="ภาระประจำเดือน — ค่างวดบ้าน (บาท)" className={formItemClass}>
              <InputNumber size="large" min={0} placeholder="ระบุบาท" className="!rounded-lg w-full !max-w-full" />
            </Form.Item>
          </div>
          {renderEditDocUpload(DOC_ITEMS_INCOME)}
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
                  { value: '', label: 'เลือกประเภทสินเชื่อ' },
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
              {isPersonalCar ? (
                <>
                  <CarBrandSelect name="car_brand" label="ยี่ห้อรถ" placeholder="เลือกยี่ห้อรถ" className={formItemClass} rules={[{ required: true, message: 'กรุณากรอกยี่ห้อรถ' }]} />
                  <CarModelSelect name="car_model" label="รุ่นรถ" placeholder="เลือกรุ่นรถ (เลือกยี่ห้อก่อน)" className={formItemClass} rules={[{ required: true, message: 'กรุณากรอกรุ่นรถ' }]} />
                </>
              ) : (
                <>
                  <CommercialCarBrandSelect name="car_brand" label="ยี่ห้อรถ" placeholder="เลือกยี่ห้อรถ (HINO, ISUZU)" className={formItemClass} rules={[{ required: true, message: 'กรุณากรอกยี่ห้อรถ' }]} />
                  <CommercialCarTypeSelect name="car_type" label="ลักษณะรถ (ประเภทล้อ)" placeholder="เลือก 6 ล้อ หรือ 10 ล้อ" className={formItemClass} rules={[{ required: true, message: 'กรุณาเลือกประเภทล้อ' }]} />
                  <CommercialCarModelSelect name="car_model" label="รุ่นรถ" placeholder="เลือกรุ่นรถ (เลือกยี่ห้อและประเภทล้อก่อน)" className={formItemClass} rules={[{ required: true, message: 'กรุณากรอกรุ่นรถ' }]} />
                </>
              )}
              {isPersonalCar && (
                <Form.Item name="car_type" label="ลักษณะรถ" className={formItemClass}>
                  <Input size="large" placeholder="เช่น 10 ล้อ, หัวลาก" className="!rounded-lg w-full" />
                </Form.Item>
              )}
              <CarFuelTypeSelect name="car_fuel_type" label="ประเภทเชื้อเพลิง" placeholder="เลือกประเภทเชื้อเพลิง" className={formItemClass} />
              <Form.Item name="registration_date" label="วันที่จดทะเบียนรถ" className={formItemClass}>
                <DatePicker className="w-full !rounded-lg" format={DATE_DISPLAY_FORMAT} size="large" placeholder="เลือกวันที่" />
              </Form.Item>
              <Form.Item name="license_plate" label="เลขทะเบียนรถ" rules={[{ required: true, message: 'กรุณากรอกเลขทะเบียน' }]} className={formItemClass}>
                <Input size="large" placeholder="กรอกเลขทะเบียน" className="!rounded-lg w-full" />
              </Form.Item>
              <ProvinceSelect name="registration_province" label="จังหวัดทะเบียนรถ" placeholder="เลือกจังหวัด (ตามป้ายทะเบียน)" className={formItemClass} />
              <Form.Item name="car_details" label="รายละเอียด/ตำหนิของรถ" className={formItemClassFull}>
                <Input.TextArea rows={3} placeholder="ระบุรายละเอียดหรือตำหนิ (ถ้ามี)" className="!rounded-lg [&_.ant-input]:min-h-[88px]" />
              </Form.Item>
            </div>
            {renderEditDocUpload(DOC_ITEMS_VEHICLE)}
          </section>
        )}

        {isLandTitle && (
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
              {sectionTitle('ข้อมูลโฉนดที่ดิน')}
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
            {renderEditDocUpload(DOC_ITEMS_LAND)}
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
          {renderEditDocUpload(DOC_ITEMS_LOAN)}
        </section>

        {(existingByType['_other']?.length ?? 0) > 0 && (
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-1 border-b border-gray-100 bg-gray-50/50">
              {sectionTitle('เอกสารอื่นๆ')}
            </div>
            <div className="p-4 sm:p-6">
              <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50">
                <p className="text-sm font-medium text-amber-800 mb-3">เอกสารอื่นๆ (ไม่มีประเภท)</p>
                <div className="flex flex-wrap gap-2">
                  {existingByType['_other'].map((att) => {
                    const thumbUrl = existingFileUrls[att.file_path]
                    const isImg = isImage(att.file_name)
                    const isPdfFile = isPdf(att.file_name)
                    return (
                      <div key={att.id} className="relative w-20 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden shrink-0">
                        <button type="button" onClick={() => removeExistingAttachment(att.id)} className="absolute top-0.5 right-0.5 z-10 w-5 h-5 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center text-xs" aria-label="ลบไฟล์">
                          <CloseOutlined />
                        </button>
                        {isImg && thumbUrl ? <img src={thumbUrl} alt={att.file_name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-1">
                            {isPdfFile ? <FilePdfOutlined style={{ fontSize: 20, color: '#b91c1c' }} /> : <FileOutlined style={{ fontSize: 20 }} />}
                            <span className="text-[10px] truncate w-full text-center" title={att.file_name}>{att.file_name}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

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
          </div>
        </Form>
      )}

      {/* ปุ่มลอยกดบันทึกได้ตลอด ไม่ต้องเลื่อนลงล่าง */}
      {user != null && !loading && loan != null && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-4xl mx-auto">
            <Button
              type="primary"
              size="large"
              block
              loading={submitting}
              onClick={() => form.submit()}
              className="!min-h-[52px] !text-base !rounded-xl !font-semibold touch-manipulation shadow-lg shadow-red-900/20"
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </Button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
