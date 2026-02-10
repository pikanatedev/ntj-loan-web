'use client'

import '@/lib/dayjs'
import { ConfigProvider } from 'antd'
import type { Locale } from 'antd/es/locale'
import thTH from 'antd/locale/th_TH'

const theme = {
  token: {
    colorPrimary: '#b91c1c',
    borderRadius: 6,
    fontFamily: "var(--font-prompt), 'Prompt', ui-sans-serif, system-ui, sans-serif",
  },
}

const datePickerLang = thTH.DatePicker?.lang ? { ...thTH.DatePicker.lang, yearFormat: 'BBBB', monthFormat: 'MMMM', cellYearFormat: 'BBBB', fieldYearFormat: 'BBBB' } : undefined
const calendarLang = thTH.Calendar?.lang ? { ...thTH.Calendar.lang, yearFormat: 'BBBB', monthFormat: 'MMMM', cellYearFormat: 'BBBB', fieldYearFormat: 'BBBB' } : undefined

const locale = {
  ...thTH,
  DatePicker: datePickerLang ? { ...thTH.DatePicker, lang: datePickerLang } : thTH.DatePicker,
  Calendar: calendarLang ? { ...thTH.Calendar, lang: calendarLang } : thTH.Calendar,
} as Locale

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={locale} theme={theme}>
      {children}
    </ConfigProvider>
  )
}
