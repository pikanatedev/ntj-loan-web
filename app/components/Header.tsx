'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { StaffUser } from '@/lib/types'

export function Header() {
  const [user, setUser] = useState<StaffUser | null>(null)

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

  const handleLogout = () => {
    localStorage.removeItem('loan_user')
    window.location.href = '/'
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
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-700 hover:underline shrink-0 py-2 px-3 -my-2 -mr-2 text-sm sm:text-base touch-manipulation"
          >
            ออกจากระบบ
          </button>
        )}
      </div>
    </header>
  )
}
