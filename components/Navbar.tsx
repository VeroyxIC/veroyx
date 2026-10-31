"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import CommandPalette from "@/components/CommandPalette"

export default function Navbar() {
  const triggerPalette = () => {
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true })
    window.dispatchEvent(event)
  }

  return (
    <>
      <CommandPalette />
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Typographic Brand + Palette Trigger */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-mono font-black text-xl tracking-widest text-white group-hover:text-cyan-400 transition-colors">
                VEROYX<span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1 animate-pulse" />
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/60 text-cyan-300 font-bold hidden sm:inline-block">
                FLIGHT OS
              </span>
            </Link>

            <button
              onClick={triggerPalette}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Search index...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] border border-slate-700 text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 font-mono text-xs text-slate-300">
            <Link href="/mission-builder" className="hover:text-cyan-400 transition-colors">
              MISSION BUILDER
            </Link>
            <Link href="/telemetry" className="hover:text-cyan-400 transition-colors text-cyan-300 font-bold">
              TELEMETRY
            </Link>
            <Link href="/visualizer" className="hover:text-cyan-400 transition-colors">
              3D VISUALIZER
            </Link>
            <Link href="/contracts" className="hover:text-cyan-400 transition-colors text-slate-300">
              CONTRACTS
            </Link>
            <Link href="/launches" className="hover:text-cyan-400 transition-colors">
              RADAR
            </Link>
            <Link href="/briefing" className="hover:text-cyan-400 transition-colors text-amber-300 font-bold">
              DOSSIER
            </Link>
            <Link href="/compliance" className="hover:text-cyan-400 transition-colors">
              COMPLIANCE
            </Link>
            <Link href="/developers" className="hover:text-cyan-400 transition-colors">
              API
            </Link>
          </nav>

        </div>
      </header>
    </>
  )
}
