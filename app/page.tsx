"use client"

import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { ArrowRight } from "lucide-react"

export default function SpaceXMasterHomePage() {
  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-white/20 overflow-x-hidden flex flex-col justify-between">
      
      {/* Absolute Pristine Background */}
      <div className="fixed inset-0 bg-[#000000] z-0" />

      {/* Clean Navigation */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Main Split Layout: Exact SpaceX Proportions */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-12 pt-32 lg:pt-40 pb-16 flex-1 flex flex-col lg:flex-row items-center justify-between">
        
        {/* LEFT 45%: ELITE EDITORIAL TYPOGRAPHY */}
        <section className="w-full lg:w-[45%] space-y-8 z-20 relative">
          
          <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-white/10 bg-white/[0.02] text-slate-300 text-[10px] font-mono tracking-[0.3em] uppercase backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>ALLIED JADC2 &amp; SPACE DEFENSE</span>
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-black uppercase tracking-tighter text-white leading-[0.9]">
            SECURING<br />
            THE HIGH<br />
            GROUND
          </h1>

          <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed max-w-md">
            Veroyx deploys institutional-grade orbital mechanics, high-fidelity kinematic tracking, and multi-domain JADC2 command systems for allied space superiority.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/c2"
              className="px-8 py-4 border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex items-center gap-3"
            >
              <span>EXPLORE PLATFORM</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/planetary-defense"
              className="px-6 py-4 border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors"
            >
              <span>KINETIC INTERCEPT</span>
            </Link>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-8 mt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-[10px] text-slate-500">
            <div>
              <span className="text-slate-400 block font-bold mb-1 tracking-widest">RSO TRACKED</span>
              <span className="text-white text-sm font-bold">48,219</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-1 tracking-widest">PROPAGATOR</span>
              <span className="text-white text-sm font-bold">SGP4 / J2</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-1 tracking-widest">KERR (a*)</span>
              <span className="text-white text-sm font-bold">0.998</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-1 tracking-widest">CROSSLINK</span>
              <span className="text-emerald-400 text-sm font-bold">100 Gbps</span>
            </div>
          </div>
        </section>

        {/* RIGHT 55%: PURE HIGH-RES ASSET RENDER (No canvas overlays, no blend modes) */}
        <section className="relative w-full lg:w-[55%] h-[50vh] lg:h-[80vh] flex items-center justify-end mt-12 lg:mt-0 select-none pointer-events-none z-10">
          
          {/* Mask to ensure the left edge fades into the black background, but the image remains pure */}
          <div 
            className="relative w-full h-full max-w-[900px] flex items-center justify-center"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 100%)"
            }}
          >
            <img
              src="/assets/hero/blackhole-v.jpg"
              alt="Relativistic Kerr Black Hole"
              className="w-full h-full object-contain object-right lg:scale-125"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (!target.src.includes("VBH")) {
                  target.src = "/VBH.jpg"
                }
              }}
            />
          </div>
        </section>

      </main>

      {/* Ultra-Minimalist Footer */}
      <footer className="relative z-20 w-full px-6 sm:px-12 py-5 border-t border-white/10 bg-[#000000] flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-widest">VEROYX AEROSPACE © 2026</span>
          <span className="text-neutral-800">|</span>
          <span>ITAR RESTRICTED</span>
          <span className="text-neutral-800">|</span>
          <span>FIPS 140-3 COMPLIANT</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors tracking-widest">C2 BATTLE GLASS</Link>
          <Link href="/planetary-defense" className="hover:text-white transition-colors tracking-widest">DEFENSE</Link>
          <Link href="/catalog" className="hover:text-white transition-colors tracking-widest">CATALOG</Link>
        </div>
      </footer>
    </div>
  )
}
