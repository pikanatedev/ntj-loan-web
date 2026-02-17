'use client'

import { useState, useEffect, useCallback } from 'react'
import { Form, Input, Select } from 'antd'
import type { FormInstance } from 'antd'

type Province = { id: number; name_th: string; name_en: string }
type District = { id: number; name_th: string; name_en: string }
type SubDistrict = { id: number; name_th: string; name_en: string; zip_code: number }

const formItemClass =
  'w-full min-w-0 mb-4 [&_.ant-form-item-label]:!pt-0 [&_.ant-form-item-label>label]:!text-gray-700 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-control]:!w-full [&_.ant-input]:min-h-[44px] [&_.ant-input]:!rounded-lg [&_.ant-input]:w-full [&_.ant-select]:min-h-[44px] [&_.ant-select]:!rounded-lg [&_.ant-select]:w-full'

type ThaiAddressSelectsProps = {
  form: FormInstance
  /** ชื่อฟิลด์ใน Form (ต้องตรงกับที่ใช้ใน form) */
  namePrefix?: 'address'
  className?: string
}

const namePrefixDefault = 'address'

export function ThaiAddressSelects({
  form,
  namePrefix = namePrefixDefault,
  className = formItemClass,
}: ThaiAddressSelectsProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([])
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingSubDistricts, setLoadingSubDistricts] = useState(false)

  const provinceName = Form.useWatch(`${namePrefix}_province`, form)
  const districtName = Form.useWatch(`${namePrefix}_district`, form)

  useEffect(() => {
    let cancelled = false
    fetch('/api/thai-address/provinces')
      .then((res) => res.json())
      .then((data: Province[]) => {
        if (!cancelled) setProvinces(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!provinceName || provinces.length === 0) {
      setDistricts([])
      form.setFieldValue(`${namePrefix}_district`, undefined)
      form.setFieldValue(`${namePrefix}_subdistrict`, undefined)
      form.setFieldValue(`${namePrefix}_postal_code`, undefined)
      return
    }
    const province = provinces.find((p) => p.name_th === provinceName)
    if (!province) {
      setDistricts([])
      return
    }
    let cancelled = false
    setLoadingDistricts(true)
    fetch(`/api/thai-address/districts?province_id=${province.id}`)
      .then((res) => res.json())
      .then((data: District[]) => {
        if (!cancelled) setDistricts(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false)
      })
    return () => {
      cancelled = true
    }
  }, [provinceName, provinces, form, namePrefix])

  useEffect(() => {
    if (!districtName || districts.length === 0) {
      setSubDistricts([])
      form.setFieldValue(`${namePrefix}_subdistrict`, undefined)
      form.setFieldValue(`${namePrefix}_postal_code`, undefined)
      return
    }
    const district = districts.find((d) => d.name_th === districtName)
    if (!district) {
      setSubDistricts([])
      return
    }
    let cancelled = false
    setLoadingSubDistricts(true)
    fetch(`/api/thai-address/subdistricts?district_id=${district.id}`)
      .then((res) => res.json())
      .then((data: SubDistrict[]) => {
        if (!cancelled) setSubDistricts(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingSubDistricts(false)
      })
    return () => {
      cancelled = true
    }
  }, [districtName, districts, form, namePrefix])

  const onSubDistrictSelect = useCallback(
    (value: string) => {
      const sub = subDistricts.find((s) => s.name_th === value)
      if (sub) form.setFieldValue(`${namePrefix}_postal_code`, String(sub.zip_code))
    },
    [subDistricts, form, namePrefix]
  )

  const filterOption = useCallback((input: string, option?: { label?: string }) => {
    return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }, [])

  return (
    <>
      <Form.Item name={`${namePrefix}_province`} label="จังหวัด" className={className}>
        <Select
          size="large"
          placeholder="เลือกจังหวัด"
          className="!rounded-lg w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterOption}
          loading={loadingProvinces}
          options={provinces.map((p) => ({ value: p.name_th, label: p.name_th }))}
        />
      </Form.Item>
      <Form.Item name={`${namePrefix}_district`} label="เขต/อำเภอ" className={className}>
        <Select
          size="large"
          placeholder="เลือกเขต/อำเภอ"
          className="!rounded-lg w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterOption}
          loading={loadingDistricts}
          disabled={!provinceName}
          options={districts.map((d) => ({ value: d.name_th, label: d.name_th }))}
        />
      </Form.Item>
      <Form.Item name={`${namePrefix}_subdistrict`} label="แขวง/ตำบล" className={className}>
        <Select
          size="large"
          placeholder="เลือกแขวง/ตำบล"
          className="!rounded-lg w-full"
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterOption}
          loading={loadingSubDistricts}
          disabled={!districtName}
          options={subDistricts.map((s) => ({ value: s.name_th, label: s.name_th }))}
          onSelect={onSubDistrictSelect}
        />
      </Form.Item>
      <Form.Item name={`${namePrefix}_postal_code`} label="รหัสไปรษณีย์" className={className}>
        <Input
          size="large"
          placeholder="ระบุรหัสไปรษณีย์ (เติมอัตโนมัติเมื่อเลือกตำบล)"
          className="!rounded-lg w-full"
          maxLength={5}
        />
      </Form.Item>
    </>
  )
}

type ProvinceSelectProps = {
  name: string
  label?: string
  placeholder?: string
  className?: string
}

/** Select เดี่ยวสำหรับเลือกจังหวัด (ใช้กับข้อมูลทะเบียนรถ เป็นต้น) */
export function ProvinceSelect({
  name,
  label = 'จังหวัด',
  placeholder = 'เลือกจังหวัด',
  className = formItemClass,
}: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/thai-address/provinces')
      .then((res) => res.json())
      .then((data: Province[]) => {
        if (!cancelled) setProvinces(data)
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

  return (
    <Form.Item name={name} label={label} className={className}>
      <Select
        size="large"
        placeholder={placeholder}
        className="!rounded-lg w-full"
        allowClear
        showSearch
        optionFilterProp="label"
        filterOption={filterOption}
        loading={loading}
        options={provinces.map((p) => ({ value: p.name_th, label: p.name_th }))}
      />
    </Form.Item>
  )
}
