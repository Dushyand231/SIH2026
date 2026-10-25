import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google"
import "./globals.css"

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans", display: "swap" })
const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-noto-deva",
  display: "swap",
})
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "National Technical Education Security Deposit & FDR Lifecycle Management System",
  description:
    "e-Governance portal for assessment, verification, vaulting, maturity tracking, multi-bureau NOC clearance and digitally signed release of institutional security deposit FDRs.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0f172a",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDeva.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
