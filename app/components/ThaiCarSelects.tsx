'use client'

import { useState, useEffect, useCallback } from 'react'
import { Form, Input, Select } from 'antd'

type Brand = { id: number; name_th: string; name_en: string }
type Model = { id: number; name_th: string; name_en: string }

const formItemClass =
  'w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-select]:min-h-[44px] [&_.ant-select]:!rounded-lg [&_.ant-select]:w-full'

const OTHER_VALUE = 'อื่นๆ'

type CarBrandSelectProps = {
  name?: string
  label?: string
  placeholder?: string
  className?: string
  rules?: { required?: boolean; message?: string }[]
  /** ชื่อฟิลด์สำหรับกรอกเองเมื่อเลือก "อื่นๆ" */
  otherFieldName?: string
}

/** Select ยี่ห้อรถ (รถยนต์ส่วนบุคคล) — เลือก "อื่นๆ" จะแสดงช่องกรอกเอง */
export function CarBrandSelect({
  name = 'car_brand',
  label = 'ยี่ห้อรถ',
  placeholder = 'เลือกยี่ห้อรถ',
  className = formItemClass,
  rules,
  otherFieldName = 'car_brand_other',
}: CarBrandSelectProps) {
  const form = Form.useFormInstance()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const brandValue = Form.useWatch(name, form)

  useEffect(() => {
    let cancelled = false
    fetch('/api/car/brands')
      .then((res) => res.json())
      .then((data: Brand[]) => {
        if (!cancelled) setBrands(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filterOption = useCallback((input: string, option?: { label?: string }) => {
    return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }, [])

  const showBrandOther = brandValue === OTHER_VALUE

  const onBrandChange = useCallback(
    (v: string | undefined) => {
      if (v !== OTHER_VALUE) form?.setFieldValue(otherFieldName, undefined)
    },
    [form, otherFieldName]
  )

  return (
    <>
      <Form.Item name={name} label={label} className={className} rules={rules}>
        <Select
          size="large"
          placeholder={placeholder}
          className="!rounded-lg w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterOption}
          loading={loading}
          options={brands.map((b) => ({ value: b.name_th, label: b.name_th }))}
          onChange={onBrandChange}
        />
      </Form.Item>
      {showBrandOther && (
        <Form.Item
          name={otherFieldName}
          label="ระบุยี่ห้อรถ (กรอกเอง)"
          className={className}
          rules={rules?.some((r) => r.required) ? [{ required: true, message: 'กรุณาระบุยี่ห้อรถ' }] : undefined}
        >
          <Input size="large" placeholder="กรอกยี่ห้อรถ" className="!rounded-lg w-full" />
        </Form.Item>
      )}
    </>
  )
}

type CarModelSelectProps = {
  brandNameField?: string
  name?: string
  label?: string
  placeholder?: string
  className?: string
  rules?: { required?: boolean; message?: string }[]
  /** ชื่อฟิลด์สำหรับกรอกเองเมื่อเลือก "อื่นๆ" */
  otherFieldName?: string
}

/** Select รุ่นรถ (ขึ้นกับยี่ห้อที่เลือก) — เลือก "อื่นๆ" จะแสดงช่องกรอกเอง */
export function CarModelSelect({
  brandNameField = 'car_brand',
  name = 'car_model',
  label = 'รุ่นรถ',
  placeholder = 'เลือกรุ่นรถ',
  className = formItemClass,
  rules,
  otherFieldName = 'car_model_other',
}: CarModelSelectProps) {
  const form = Form.useFormInstance()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const brandName = Form.useWatch(brandNameField, form)
  const modelValue = Form.useWatch(name, form)

  useEffect(() => {
    if (!brandName) {
      setModels([])
      form?.setFieldValue(name, undefined)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch('/api/car/brands')
      .then((res) => res.json())
      .then((brands: Brand[]) => {
        const brand = brands.find((b) => b.name_th === brandName)
        if (!brand || cancelled) return
        return fetch(`/api/car/models?brand_id=${brand.id}`).then((r) => r.json())
      })
      .then((data: Model[] | undefined) => {
        if (!cancelled && Array.isArray(data)) setModels(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [brandName, form, name])

  const filterOption = useCallback((input: string, option?: { label?: string }) => {
    return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }, [])

  const showModelOther = modelValue === OTHER_VALUE

  const onModelChange = useCallback(
    (v: string | undefined) => {
      if (v !== OTHER_VALUE) form?.setFieldValue(otherFieldName, undefined)
    },
    [form, otherFieldName]
  )

  return (
    <>
      <Form.Item name={name} label={label} className={className} rules={rules}>
        <Select
          size="large"
          placeholder={placeholder}
          className="!rounded-lg w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterOption}
          loading={loading}
          options={models.map((m) => ({ value: m.name_th, label: m.name_th }))}
          disabled={!brandName}
          onChange={onModelChange}
        />
      </Form.Item>
      {showModelOther && (
        <Form.Item
          name={otherFieldName}
          label="ระบุรุ่นรถ (กรอกเอง)"
          className={className}
          rules={rules?.some((r) => r.required) ? [{ required: true, message: 'กรุณาระบุรุ่นรถ' }] : undefined}
        >
          <Input size="large" placeholder="กรอกรุ่นรถ" className="!rounded-lg w-full" />
        </Form.Item>
      )}
    </>
  )
}
