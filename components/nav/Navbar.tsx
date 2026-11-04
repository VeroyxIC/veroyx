"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import VeroyxLogo from "@/components/brand/VeroyxLogo"
import { Search, Lock, ShieldCheck, ChevronRight, X, Sparkles, Terminal } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isVipOpen, setIsVipOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false)
        setIsVipOpen(false)
      }
    }
    window.addEventListener("scroll", handleScroll)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const navLinks = [
    { label: "JADC2 C2", href: "/c2" },
    { label: "PLANETARY DEFENSE", href: "/planetary-defense" },
    { label: "HYPERSONIC", href: "/hypersonic" },
    { label: "48K CATALOG", href: "/catalog" },
    { label: "ORBIT VISUALIZER", href: "/visualizer" },
  ]

  return (
    <>
      {/* Top Editorial Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-mono text-xs select-none ${
          isScrolled
            ? "bg-black/90 backdrop-blur-md border-b border-white/10 py-3.5 px-6 sm:px-12"
            : "bg-transparent py-5 px-6 sm:px-12"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left: Brand Logo */}
          <VeroyxLogo size={24} />

          {/* Center: SpaceX Clean Editorial Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold tracking-[0.2em] text-neutral-300">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-white uppercase ${
                    isActive ? "text-white border-b-2 border-white pb-0.5" : "text-neutral-400"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: Search & Enterprise Access (Clean monochrome / subtle gold) */}
          <div className="flex items-center gap-4">
            
            {/* Quick Command Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-none border border-white/15 bg-white/[0.03] hover:border-white/40 text-neutral-400 hover:text-white transition-all text-[10px]"
            >
              <Search className="w-3 h-3" />
              <span>COMMAND SEARCH</span>
              <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 text-[9px]">⌘K</kbd>
            </button>

            {/* Enterprise VIP Portal Button */}
            <button
              onClick={() => setIsVipOpen(true)}
              className="px-4 py-1.5 rounded-none border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-300 font-bold tracking-widest text-[10px] transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              <span>VIP ACCESS</span>
            </button>

          </div>

        </div>
      </header>

      {/* MODAL 1: COMMAND SEARCH (Cmd + K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-[#080808] border border-white/15 shadow-2xl p-6 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="font-bold tracking-wider">VEROYX COMMAND INTERFACE</span>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { label: "JADC2 Battle Systems Glass", path: "/c2", tag: "REAL-TIME" },
                { label: "Planetary Defense & Kinetic Intercept", path: "/planetary-defense", tag: "ASTEROID 9942" },
                { label: "Hypersonic Aero-Orbital CFD Footprint", path: "/hypersonic", tag: "MACH 25" },
                { label: "Space-Track 48K Satellite Catalog", path: "/catalog", tag: "RSO ENCLAVE" },
                { label: "Real-Time Orbit Propagator & Visualizer", path: "/visualizer", tag: "SGP4 / J2" },
              ].map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsSearchOpen(false)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/10 text-neutral-300 hover:text-white transition-all group"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-amber-400/80 group-hover:text-amber-300 font-bold">{item.tag}</span>
                </Link>
              ))}
            </div>

            <div className="pt-2 text-center text-[10px] text-neutral-500">
              Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-neutral-300">ESC</kbd> to exit command mode
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTERPRISE VIP ACCESS PORTAL */}
      {isVipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-3xl bg-[#080808] border border-white/15 p-8 font-mono text-xs space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-amber-400 font-bold tracking-widest block">U.S. &amp; ALLIED DEFENSE ENCLAVE</span>
                <h2 className="text-2xl font-black text-white tracking-widest uppercase">ENTERPRISE VIP ACCESS PORTAL</h2>
              </div>
              <button onClick={() => setIsVipOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tier 1 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-[10px] text-neutral-400 font-bold">TIER 01 // TACTICAL</span>
                <div className="text-xl font-black text-white">$18,000 <span className="text-xs text-neutral-500">/mo</span></div>
                <ul className="text-[10px] text-neutral-400 space-y-1.5 pt-2 border-t border-white/10">
                  <li>✓ 48,000+ SGP4 RSO Tracking</li>
                  <li>✓ NASA CARA Conjunction Alerts</li>
                  <li>✓ Standard API Bandwidth</li>
                </ul>
              </div>

              {/* Tier 2 (Featured) */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/50 space-y-3 relative">
                <span className="text-[10px] text-amber-300 font-bold">TIER 02 // DEFENSE PRIME (MOST REQUESTED)</span>
                <div className="text-xl font-black text-white">$45,000 <span className="text-xs text-neutral-500">/mo</span></div>
                <ul className="text-[10px] text-neutral-300 space-y-1.5 pt-2 border-t border-white/10">
                  <li>✓ Full JADC2 Multi-Domain Glass</li>
                  <li>✓ Kinetic Intercept &amp; Planetary Defense</li>
                  <li>✓ 100 Gbps Laser Datalink Telemetry</li>
                  <li>✓ Sub-second Collision Assessment</li>
                </ul>
              </div>

              {/* Tier 3 */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-[10px] text-neutral-400 font-bold">TIER 03 // SOVEREIGN COMMAND</span>
                <div className="text-xl font-black text-white">$250,000 <span className="text-xs text-neutral-500">/mo</span></div>
                <ul className="text-[10px] text-neutral-400 space-y-1.5 pt-2 border-t border-white/10">
                  <li>✓ Air-Gapped Dedicated Enclave</li>
                  <li>✓ Sovereign Satellite Constellation C2</li>
                  <li>✓ Zero-Trust Cryptographic Hardware</li>
                </ul>
              </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={() => setIsVipOpen(false)}
                className="px-8 py-3 rounded-none bg-white text-black font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all text-xs"
              >
                CLOSE ACCESS BRIEFING
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
