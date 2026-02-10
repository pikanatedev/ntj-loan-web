'use client'

import '@/lib/dayjs'
import { ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'

const theme = {
  token: {
    colorPrimary: '#b91c1c',
    borderRadius: 6,
    fontFamily: "var(--font-prompt), 'Prompt', ui-sans-serif, system-ui, sans-serif",
  },
}

const locale = {
  ...thTH,
  DatePicker: {
    ...thTH.DatePicker,
    lang: {
      ...(thTH.DatePicker as { lang?: Record<string, unknown> })?.lang,
      yearFormat: 'BBBB',
      monthFormat: 'MMMM',
      cellYearFormat: 'BBBB',
      fieldYearFormat: 'BBBB',
    },
  },
  Calendar: {
    ...thTH.Calendar,
    lang: {
      ...(thTH.Calendar as { lang?: Record<string, unknown> })?.lang,
      yearFormat: 'BBBB',
      monthFormat: 'MMMM',
      cellYearFormat: 'BBBB',
      fieldYearFormat: 'BBBB',
    },
  },
}

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={locale} theme={theme}>
      {children}
    </ConfigProvider>
  )
}
