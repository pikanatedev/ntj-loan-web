'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { App, Modal, Input } from 'antd'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser } from '@/lib/types'

export function Header() {
  const { message } = App.useApp()
  const [user, setUser] = useState<StaffUser | null>(null)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)

  const syncUser = () => {
    try {
      const s = localStorage.getItem('loan_user')
      setUser(s ? (JSON.parse(s) as StaffUser) : null)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    syncUser()
    const onUserChange = () => syncUser()
    window.addEventListener('loan-user-change', onUserChange)
    return () => window.removeEventListener('loan-user-change', onUserChange)
  }, [])

  useEffect(() => {
    if (phoneModalOpen && user) {
      setPhoneValue(user.phone ?? '')
    }
  }, [phoneModalOpen, user])

  const handleSavePhone = async () => {
    if (!user) return
    setPhoneSaving(true)
    try {
      const { error } = await supabase
        .from('staff')
        .update({ phone: phoneValue.trim() || null })
        .eq('id', user.id)
      if (error) throw error
      const updated = { ...user, phone: phoneValue.trim() || null }
      localStorage.setItem('loan_user', JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('loan-user-change'))
      setUser(updated)
      message.success('บันทึกเบอร์รับ SMS แล้ว')
      setPhoneModalOpen(false)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setPhoneSaving(false)
    }
  }

  const handleLogout = () => {
    Modal.confirm({
      title: 'ออกจากระบบ',
      content: 'ต้องการออกจากระบบจริงหรือไม่?',
      okText: 'ออกจากระบบ',
      cancelText: 'ยกเลิก',
      okButtonProps: { danger: true, className: '!bg-red-700 hover:!bg-red-800 !border-red-700' },
      onOk() {
        localStorage.removeItem('loan_user')
        window.location.href = '/'
      },
    })
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-h-[48px] sm:min-h-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image
            src="/images/ntj_logo.png"
            alt="NTJ Logo"
            width={36}
            height={36}
            className="object-contain shrink-0 sm:w-10 sm:h-10"
          />
          <span className="font-bold text-red-700 text-base sm:text-lg truncate">ระบบอนุมัติสินเชื่อ</span>
        </Link>
        {user != null && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setPhoneModalOpen(true)}
              className="text-gray-600 hover:text-red-700 text-sm py-1 px-2 rounded border border-gray-300 hover:border-red-600"
            >
              เบอร์รับ SMS
            </button>
            <span className="text-gray-700 text-sm sm:text-base truncate max-w-[120px] sm:max-w-[180px]" title={user.name}>
              {user.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              data-testid="header-logout"
              className="bg-red-700 text-white hover:bg-red-800 py-2 px-4 rounded-lg text-sm sm:text-base touch-manipulation font-medium"
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
      <Modal
        title="ตั้งค่าเบอร์รับ SMS"
        open={phoneModalOpen}
        onCancel={() => setPhoneModalOpen(false)}
        onOk={handleSavePhone}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={phoneSaving}
        destroyOnClose
      >
        <p className="text-gray-600 text-sm mb-2">เบอร์มือถือที่ใช้รับการแจ้งเตือนเมื่อมีการเปลี่ยนสถานะเคส</p>
        <Input
          placeholder="เช่น 0956610230"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          maxLength={15}
        />
      </Modal>
    </header>
  )
}
