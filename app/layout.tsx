import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWARegister from "./PWARegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "快報 TripClaim｜共同行程與個人報支",
  description: "先共同規劃行程，再讓每位同行者整理自己的航班、住宿、單據與報支。",
  applicationName: "快報 TripClaim",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "快報",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "codex-preview": "development",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#145c47",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 手動輸出 manifest link 以附帶 use-credentials：Sites 的驗證需要
            cookie，預設的 manifest 請求不帶憑證會得到 401。 */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
