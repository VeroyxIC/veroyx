"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: "/companies", label: "Directory" },
    { href: "/technologies", label: "Technologies" },
    { href: "/grants", label: "Grants" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-[#05070a]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tracking-widest text-white uppercase">
              VEROYX
            </span>
            <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400 border border-cyan-800/40">
              LEO
            </span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            {links.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-mono text-xs transition-colors ${
                    active ? "text-cyan-400" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">DATA LAYER</span> ONLINE
          </div>
          <Link
            href="/companies"
            className="rounded border border-neutral-700 bg-neutral-900/80 px-3 py-1 font-mono text-xs text-white transition-colors hover:border-cyan-500/50 hover:bg-neutral-800"
          >
            Launch Terminal
          </Link>
        </div>
      </div>
    </header>
  )
}
