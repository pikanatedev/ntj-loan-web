import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { AntdProvider } from "./components/AntdProvider";
import { Header } from "./components/Header";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ระบบอนุมัติสินเชื่อ",
  description: "บริหารจัดการการเสนอเคสสินเชื่อรถบรรทุก",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.variable} font-sans antialiased`}>
        <AntdProvider>
          <Header />
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
