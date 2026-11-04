"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  ArrowRight, ShieldAlert, Fingerprint, Zap, Unlock, Lock,
  ChevronRight, Radio, Activity, Orbit, Sparkles
} from "lucide-react"

export default function SpaceXMasterHomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleInitiateWarp = () => {
    setIsWarping(true)
    setTimeout(() => {
      setIsWarping(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, 1200)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // Parallax tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    setMouseOffset({
      x: ((clientX / innerWidth) - 0.5) * 16,
      y: ((clientY / innerHeight) - 0.5) * 16
    })
  }

  // Relativistic Accretion Embers Canvas Particle System
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const w = (canvas.width = canvas.parentElement?.clientWidth || 700)
    const h = (canvas.height = canvas.parentElement?.clientHeight || 700)

    // Center of black hole in the image (roughly 56% X, 48% Y)
    const centerX = w * 0.56
    const centerY = h * 0.48

    const particleCount = 75
    const particles = Array.from({ length: particleCount }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 140 + Math.random() * (w * 0.42),
      speed: 0.008 + Math.random() * 0.014,
      size: 0.8 + Math.random() * 2.2,
      opacity: 0.2 + Math.random() * 0.7,
      color: Math.random() > 0.4 ? "#ff9922" : "#ffffff"
    }))

    const render = () => {
      animId = requestAnimationFrame(render)
      ctx.clearRect(0, 0, w, h)

      particles.forEach(p => {
        p.angle += p.speed
        p.radius -= 0.18 // Slowly spiral inwards into singularity
        if (p.radius < 45) {
          p.radius = 160 + Math.random() * (w * 0.38)
        }

        // Elliptical accretion distortion (flatter on Y)
        const x = centerX + Math.cos(p.angle) * p.radius * 1.25
        const y = centerY + Math.sin(p.angle) * (p.radius * 0.65)

        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    render()

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", onResize)
    }
  }, [isAuthenticated])

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-amber-500/30 overflow-x-hidden flex flex-col justify-between"
    >
      
      {/* STATE 1: ZERO-TRUST WARP GATEWAY */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-30 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#030712]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(245,158,11,0.2)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>RESTRICTED ACCESS // ALLIED SPACE COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                TOP SECRET ENCLAVE. RELATIVISTIC KERR ASTRODYNAMICS &amp; JADC2 PROPAGATION INITIALIZED.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  <span>CLEARANCE: TOP SECRET SI-TK</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">STATUS: VERIFIED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-amber-300 font-bold">
                [ CRYPTOGRAPHIC FIPS 140-3 TOKEN VALIDATED ]
              </div>
            </div>

            <button
              onClick={handleInitiateWarp}
              disabled={isWarping}
              className="w-full py-4 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
            >
              {isWarping ? <Zap className="w-4 h-4 animate-spin text-amber-200" /> : <Unlock className="w-4 h-4" />}
              <span>{isWarping ? "ENGAGING SECURE TERMINAL..." : "ENTER OPERATIONAL PROPAGATOR"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: SPACEX EDITORIAL HERO THEATER (Clean Left Typography + Living Black Hole on Right) */
        <div className="relative w-full min-h-screen flex flex-col justify-between z-10 select-none">
          
          {/* Top Session Security Banner */}
          <div className="fixed top-14 left-0 right-0 z-40 bg-black/85 backdrop-blur-md border-b border-white/10 px-8 py-2.5 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-3 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider">VEROYX // RELATIVISTIC SPACE DOMAIN AWARENESS</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">CLEARANCE: TS-SCI</span>
            </div>
            <button 
              onClick={handleLockTerminal} 
              className="px-3 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1.5 text-[10px]"
            >
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* MAIN HERO SPLIT: UNCLUTTERED LEFT EDITORIAL + RIGHT ANIMATED BLACK HOLE */}
          <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 pt-32 pb-16 flex-1 flex flex-col lg:flex-row items-center justify-between">
            
            {/* LEFT 45%: SPACEX EDITORIAL COLUMN */}
            <div className="w-full lg:w-[45%] space-y-6 z-20 pointer-events-auto">
              
              {/* Clearance Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300 text-[10px] font-mono tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>ALLIED JADC2 &amp; SPACE DEFENSE</span>
              </div>

              {/* Bold SpaceX-Grade Headline */}
              <div className="space-y-1">
                <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-white leading-[1.04]">
                  SECURING<br />
                  THE HIGH<br />
                  GROUND
                </h1>
              </div>

              {/* Minimalist Sub-Copy */}
              <p className="text-sm sm:text-base text-slate-400 font-sans leading-relaxed max-w-md">
                Veroyx deploys institutional-grade orbital mechanics, relativistic gravitational tracking, and multi-domain JADC2 command systems for allied space dominance.
              </p>

              {/* Minimalist SpaceX Outline CTA Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/c2"
                  className="px-8 py-3.5 border border-white text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-3 hover:scale-105"
                >
                  <span>EXPLORE PLATFORM</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/planetary-defense"
                  className="px-6 py-3.5 border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-amber-400 hover:text-amber-300 transition-all"
                >
                  <span>KINETIC INTERCEPT</span>
                </Link>

                <Link
                  href="/hypersonic"
                  className="px-6 py-3.5 border border-white/20 text-slate-300 font-mono text-xs font-bold uppercase tracking-widest hover:border-cyan-400 hover:text-cyan-300 transition-all"
                >
                  <span>AERO-ORBITAL CFD</span>
                </Link>
              </div>

              {/* Bottom Telemetry Ticker (Left Edge Only) */}
              <div className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-6 font-mono text-[10px] text-slate-500">
                <div>
                  <span className="text-slate-400 block font-bold">RSO TRACKED</span>
                  <span className="text-white text-sm font-bold">48,219</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">PROPAGATION</span>
                  <span className="text-cyan-400 text-sm font-bold">SGP4 / J2</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">KERR SPIN (a*)</span>
                  <span className="text-amber-400 text-sm font-bold">0.998</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">OISL CROSSLINK</span>
                  <span className="text-emerald-400 text-sm font-bold">100 Gbps</span>
                </div>
              </div>

            </div>

            {/* RIGHT 55%: CLEAN, LIVING BLACK HOLE "V" THEATER (COMPLETELY UNOBSTRUCTED) */}
            <div 
              className="relative w-full lg:w-[55%] h-[55vh] lg:h-[78vh] flex items-center justify-center pointer-events-none mt-8 lg:mt-0"
              style={{
                transform: `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`
              }}
            >
              {/* Outer radial fade so the asset dissolves seamlessly into pure #000000 void */}
              <div className="relative w-full h-full flex items-center justify-center [mask-image:radial-gradient(circle_at_center,black_64%,transparent_98%)]">
                
                {/* The Real Render Image (Clean, No Overlapping Cards) */}
                <img
                  src="/assets/hero/blackhole-v.jpg"
                  alt="Relativistic Kerr Black Hole with V Singularity"
                  className="w-full h-full object-contain filter contrast-[1.08] brightness-[1.02] animate-pulse duration-[6000ms]"
                  onError={(e) => {
                    // Fallback to placeholder if not yet copied to public folder
                    (e.target as HTMLElement).style.display = "none"
                  }}
                />

                {/* Animated Glowing V Singularity Hotspot */}
                <div className="absolute top-[48%] left-[56%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-transparent blur-2xl animate-ping duration-[3500ms] pointer-events-none" />

                {/* Relativistic Accretion Sparks & Dust Stream Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                />

              </div>
            </div>

          </div>

          {/* Simple Bottom SpaceX Footer Bar */}
          <div className="relative w-full px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 z-20">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold tracking-wider">VEROYX AEROSPACE © 2026</span>
              <span className="text-slate-700">|</span>
              <span>MIL-STD-188 COMPLIANT</span>
              <span className="text-slate-700">|</span>
              <span>FIPS 140-3 ZERO-TRUST</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/c2" className="hover:text-white transition-all">C2 BATTLE GLASS</Link>
              <Link href="/catalog" className="hover:text-white transition-all">48K SATELLITE CATALOG</Link>
              <Link href="/visualizer" className="hover:text-white transition-all">ORBIT VISUALIZER</Link>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
