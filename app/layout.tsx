import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import CommandBar from "@/components/CommandBar"
import CommandPalette from "@/components/CommandPalette"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Veroyx // Space Domain Awareness & JADC2 Battle Management",
  description: "Next-generation Space Domain Awareness (SDA), real-time SGP4 orbital propagation, counter-space kinetic intercept modeling, and multi-tier JADC2 battle management.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#01030a] text-slate-100 min-h-screen antialiased selection:bg-cyan-500/30 selection:text-white`}>
        <CommandBar />
        <CommandPalette />
        <main className="w-full min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
