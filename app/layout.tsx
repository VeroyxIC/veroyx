import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import FlightDeckLayout from "@/app/components/FlightDeckLayout"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Veroyx | Flight Dynamics",
  description: "Space Domain Awareness and Flight Dynamics Facility",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="bg-slate-950 text-slate-100 overflow-hidden antialiased">
        <FlightDeckLayout>
          {children}
        </FlightDeckLayout>
      </body>
    </html>
  )
}
