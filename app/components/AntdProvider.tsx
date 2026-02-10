'use client'

import { ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'

const theme = {
  token: {
    colorPrimary: '#b91c1c',
    borderRadius: 6,
  },
}

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={thTH} theme={theme}>
      {children}
    </ConfigProvider>
  )
}
