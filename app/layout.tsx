import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "@/lib/dayjs";
import { AntdProvider } from "./components/AntdProvider";
import { Header } from "./components/Header";
import { ScrollToTop } from "./components/ScrollToTop";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ระบบอนุมัติสินเชื่อ",
  description: "บริหารจัดการการเสนอสินเชื่อรถบรรทุก",
  icons: {
    icon: [
      { url: "/images/favicon_io/favicon.ico", sizes: "any" },
      { url: "/images/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/images/favicon_io/apple-touch-icon.png",
  },
  manifest: "/images/favicon_io/site.webmanifest",
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
          <ScrollToTop />
          <Header />
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
