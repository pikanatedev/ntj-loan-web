'use client'

import { useState, useEffect, useCallback } from 'react'
import { Form, Input, Select } from 'antd'

type Brand = { id: number; name_th: string; name_en: string }
type Model = { id: number; name_th: string; name_en: string }

const formItemClass =
  'w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-select]:min-h-[44px] [&_.ant-select]:!rounded-lg [&_.ant-select]:w-full'

const OTHER_VALUE = 'อื่นๆ'

const WHEEL_OPTIONS: { value: string; label: string }[] = [
  { value: '6 ล้อ', label: '6 ล้อ' },
  { value: '10 ล้อ', label: '10 ล้อ' },
]

function wheelTypeToApi(wheelLabel: string | undefined): string | null {
  if (wheelLabel === '6 ล้อ') return '6'
  if (wheelLabel === '10 ล้อ') return '10'
  return null
}

type CommercialCarBrandSelectProps = {
  name?: string
  label?: string
  placeholder?: string
  className?: string
  rules?: { required?: boolean; message?: string }[]
  otherFieldName?: string
}

/** Select ยี่ห้อรถ (รถยนต์เชิงพาณิชย์: HINO, ISUZU) — เลือก "อื่นๆ" จะแสดงช่องกรอกเอง */
export function CommercialCarBrandSelect({
  name = 'car_brand',
  label = 'ยี่ห้อรถ',
  placeholder = 'เลือกยี่ห้อรถ',
  className = formItemClass,
  rules,
  otherFieldName = 'car_brand_other',
}: CommercialCarBrandSelectProps) {
  const form = Form.useFormInstance()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const brandValue = Form.useWatch(name, form)

  useEffect(() => {
    let cancelled = false
    fetch('/api/commercial-car/brands')
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
          options={[
            ...brands.map((b) => ({ value: b.name_th, label: b.name_th })),
            ...(!brands.some((b) => b.name_th === OTHER_VALUE) ? [{ value: OTHER_VALUE, label: OTHER_VALUE }] : []),
            ...(brandValue && brandValue !== OTHER_VALUE && !brands.some((b) => b.name_th === brandValue)
              ? [{ value: brandValue, label: brandValue }]
              : []),
          ]}
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

type CommercialCarTypeSelectProps = {
  name?: string
  label?: string
  placeholder?: string
  className?: string
  rules?: { required?: boolean; message?: string }[]
}

/** Select ลักษณะรถ / ประเภทล้อ (6 ล้อ, 10 ล้อ) สำหรับรถยนต์เชิงพาณิชย์ */
export function CommercialCarTypeSelect({
  name = 'car_type',
  label = 'ลักษณะรถ (ประเภทล้อ)',
  placeholder = 'เลือกประเภทล้อ',
  className = formItemClass,
  rules,
}: CommercialCarTypeSelectProps) {
  return (
    <Form.Item name={name} label={label} className={className} rules={rules}>
      <Select
        size="large"
        placeholder={placeholder}
        className="!rounded-lg w-full"
        allowClear
        options={WHEEL_OPTIONS}
      />
    </Form.Item>
  )
}

type CommercialCarModelSelectProps = {
  brandNameField?: string
  wheelTypeField?: string
  name?: string
  label?: string
  placeholder?: string
  className?: string
  rules?: { required?: boolean; message?: string }[]
  otherFieldName?: string
}

/** Select รุ่นรถ (รถยนต์เชิงพาณิชย์) — ขึ้นกับยี่ห้อ + ประเภทล้อ (6 ล้อ/10 ล้อ) */
export function CommercialCarModelSelect({
  brandNameField = 'car_brand',
  wheelTypeField = 'car_type',
  name = 'car_model',
  label = 'รุ่นรถ',
  placeholder = 'เลือกรุ่นรถ (เลือกยี่ห้อและประเภทล้อก่อน)',
  className = formItemClass,
  rules,
  otherFieldName = 'car_model_other',
}: CommercialCarModelSelectProps) {
  const form = Form.useFormInstance()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const brandName = Form.useWatch(brandNameField, form)
  const wheelLabel = Form.useWatch(wheelTypeField, form)
  const modelValue = Form.useWatch(name, form)

  useEffect(() => {
    if (!brandName || !wheelLabel) {
      setModels([])
      form?.setFieldValue(name, undefined)
      return
    }
    const wheelApi = wheelTypeToApi(wheelLabel)
    if (!wheelApi) {
      setModels([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetch('/api/commercial-car/brands')
      .then((res) => res.json())
      .then((brands: Brand[]) => {
        const brand = brands.find((b) => b.name_th === brandName)
        if (!brand || cancelled) return
        return fetch(`/api/commercial-car/models?brand_id=${brand.id}&wheel_type=${wheelApi}`).then((r) => r.json())
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
  }, [brandName, wheelLabel, form, name])

  const filterOption = useCallback((input: string, option?: { label?: string }) => {
    return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }, [])

  const showModelOther = modelValue === OTHER_VALUE
  const isOtherBrand = brandName === OTHER_VALUE

  const onModelChange = useCallback(
    (v: string | undefined) => {
      if (v !== OTHER_VALUE) form?.setFieldValue(otherFieldName, undefined)
    },
    [form, otherFieldName]
  )

  if (isOtherBrand) {
    return (
      <Form.Item name={name} label={label} className={className} rules={rules}>
        <Input size="large" placeholder="กรอกรุ่นรถ (กรอกเอง)" className="!rounded-lg w-full" />
      </Form.Item>
    )
  }

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
          options={[
            ...models.map((m) => ({ value: m.name_th, label: m.name_th })),
            ...(!models.some((m) => m.name_th === OTHER_VALUE) ? [{ value: OTHER_VALUE, label: OTHER_VALUE }] : []),
            ...(modelValue && modelValue !== OTHER_VALUE && !models.some((m) => m.name_th === modelValue)
              ? [{ value: modelValue, label: modelValue }]
              : []),
          ]}
          disabled={!brandName || !wheelLabel}
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
