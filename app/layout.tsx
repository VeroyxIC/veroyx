import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Navbar } from "@/components/navbar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Veroyx · The Space Infrastructure Economy",
  description: "B2B intelligence platform and programmatic directory indexing the commercial space and low-Earth orbit economy.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} min-h-screen bg-[#05070a] font-sans antialiased text-neutral-100`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
