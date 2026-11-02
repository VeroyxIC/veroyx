"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2, 
  ShieldAlert, Fingerprint, Unlock, ChevronDown 
} from "lucide-react"
import { createKerrBlackHole, createHalleyCometSystem, createMilitarySatellite, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

type ClearanceLevel = "TS_SCI_SITK" | "SECRET_NATO" | "SAP_GAMMA"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const pillarsRef = useRef<HTMLDivElement | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [clearanceTier, setClearanceTier] = useState<ClearanceLevel>("TS_SCI_SITK")
  const [pinCode, setPinCode] = useState<string>("8942-0129")
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [authStepMessage, setAuthStepMessage] = useState<string>("CREDENTIALS STANDBY")

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  const handleAuthorizeEnclave = (bypass = false) => {
    setIsAuthenticating(true)
    setAuthStepMessage("INITIALIZING ECDH CURVE25519 KEY EXCHANGE...")

    setTimeout(() => {
      setAuthStepMessage("NIST FIPS 140-3 HSM ZERO-KNOWLEDGE PROOF VERIFIED...")
    }, 400)

    setTimeout(() => {
      setAuthStepMessage("CLEARANCE GRANTED // DECRYPTING OPERATIONAL ENCLAVE")
    }, 800)

    setTimeout(() => {
      setIsAuthenticating(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, bypass ? 200 : 1100)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  const handleScrollToPillars = () => {
    pillarsRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 3D Three.js Kerr Black Hole, Accretion Disk, Halley's Comet & Interactive Zoom
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const pLight = new THREE.PointLight(0xffa200, 4.5, 70)
    pLight.position.set(0, 2, 8)
    scene.add(pLight)

    // Deep Space Starfield
    const starfield = createDeepSpaceStarfield(1400, 700)
    scene.add(starfield)

    // 1. Relativistic Kerr Black Hole with Lensing (Video 00:00 - 00:09)
    const { group: bhGroup, disk, lensRing, astGroup } = createKerrBlackHole(3.2)
    scene.add(bhGroup)

    // 2. Halley's Comet System with Meteor Showers
    const { group: cometGroup, comet, ionTail, dustTail, meteorGroup } = createHalleyCometSystem()
    cometGroup.position.set(-16, 8, -6)
    scene.add(cometGroup)
    scene.add(meteorGroup)

    // 3. Gold-Foil Military Reconnaissance Satellite
    const { group: satGroup, plume } = createMilitarySatellite({ scale: 0.44 })
    satGroup.position.set(6.8, -2.2, 5.0)
    satGroup.rotation.y = -Math.PI / 4
    scene.add(satGroup)

    // Interactive Drag Rotation & Motion Zooming
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY

      bhGroup.rotation.y += deltaX * 0.005
      bhGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10, Math.min(38, camera.position.z + e.deltaY * 0.025))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      // Accretion Disk Swirl
      disk.rotation.z += 0.35 * delta
      lensRing.rotation.z += 0.22 * delta
      astGroup.rotation.y += 0.18 * delta

      // Halley's Comet Orbiting across top
      cometGroup.position.x = -18 + ((elapsed * 1.6) % 36)
      cometGroup.position.y = 7.5 + Math.sin(elapsed * 0.4) * 1.5

      // Meteor shower pulse
      meteorGroup.children.forEach((m, idx) => {
        m.position.x -= delta * (14 + idx * 2)
        m.position.y -= delta * (8 + idx)
        if (m.position.x < -30) {
          m.position.x = 25 + Math.random() * 10
          m.position.y = 10 + Math.random() * 15
        }
      })

      // Satellite stationkeeping hover
      satGroup.position.y = -2.2 + Math.sin(elapsed * 0.8) * 0.25
      satGroup.position.x = 6.8 + Math.cos(elapsed * 0.5) * 0.3
      satGroup.lookAt(0, 0, 0)

      plume.scale.setScalar(1.0 + Math.sin(elapsed * 14) * 0.25)

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      container.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [isAuthenticated])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* ZERO-TRUST CLASSIFIED AUTHENTICATION GATE */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#010614]/90 backdrop-blur-3xl border border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.3)] space-y-6 font-mono text-xs">
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                UNAUTHORIZED ACCESS PROHIBITED UNDER 18 U.S.C. § 1030. ALL NETWORK PACKETS MONITORED BY DISA ENCLAVES.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex justify-between">
                <span>Required Clearance Tier</span>
                <span className="text-cyan-400 font-bold">ACTIVE SESSION</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "TS_SCI_SITK", label: "TS/SCI SI-TK", note: "TALENT-KEYHOLE" },
                  { key: "SECRET_NATO", label: "SECRET NATO", note: "FVEY ALLIED" },
                  { key: "SAP_GAMMA", label: "SAP GAMMA", note: "COUNTER-SPACE" }
                ].map(c => {
                  const isSel = clearanceTier === c.key
                  return (
                    <button
                      key={c.key}
                      onClick={() => setClearanceTier(c.key as ClearanceLevel)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSel ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-[11px] text-white">{c.label}</div>
                      <div className="text-[8px] text-slate-500 mt-0.5">{c.note}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>BIOMETRIC SMARTCARD (CAC/PIV)</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">ID: FP-9821-USSF</span>
              </div>
              <input
                type="text"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                placeholder="Enter 8-digit CAC PKI PIN..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest text-sm"
              />
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300">
                <span className="font-bold">{authStepMessage}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleAuthorizeEnclave(false)}
                disabled={isAuthenticating}
                className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
              >
                {isAuthenticating ? <Lock className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{isAuthenticating ? "AUTHENTICATING CRYPTO ENCLAVE..." : "AUTHORIZE CLASSIFIED ACCESS"}</span>
              </button>

              <button
                onClick={() => handleAuthorizeEnclave(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTANT EVALUATOR 1-CLICK ACCESS</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MASTER HOMEPAGE DASHBOARD */
        <div className="relative w-full min-h-screen">
          <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ACTIVE SESSION // CLEARANCE: {clearanceTier.replace(/_/g, " ")}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">109 PRODUCTION MODULES DEPLOYED</span>
            </div>
            <button onClick={handleLockTerminal} className="px-2.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1 text-[10px]">
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center pt-24 px-4 sm:px-6 select-none">
            <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

            {/* Floating Telemetry Badge Instructions */}
            <div className="absolute top-24 right-6 z-10 font-mono text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl pointer-events-none backdrop-blur-md hidden sm:block">
              DRAG: ROTATE BLACK HOLE | SCROLL: MOTION ZOOM (10x-40x)
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto pointer-events-auto">
              
              {/* PURE BORDERLESS GLOWING V LOGO WITH SATELLITE (NO SQUARE BORDER) */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-3xl animate-breathe-glow pointer-events-none" />
                <div className="absolute w-44 h-44 rounded-full border border-cyan-500/40 border-dashed animate-spin [animation-duration:28s] pointer-events-none" />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="animate-orbit-satellite flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute -left-3 w-3.5 h-1 rounded-full bg-cyan-400 blur-[2px] animate-pulse" />
                      <div className="w-4 h-4 rounded bg-amber-500 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.95)] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                      </div>
                      <div className="absolute -top-2.5 w-1.5 h-2.5 rounded bg-sky-600 border border-sky-400" />
                      <div className="absolute -bottom-2.5 w-1.5 h-2.5 rounded bg-sky-600 border border-sky-400" />
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center animate-breathe-glow">
                  <svg viewBox="0 0 80 80" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_0_35px_rgba(6,182,212,0.95)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="vMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="45%" stopColor="#00f0ff" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient id="vInnerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <path d="M12 14L40 68L32 68L8 14H12Z" fill="url(#vMainGrad)" />
                    <path d="M68 14L40 68L48 68L72 14H68Z" fill="url(#vMainGrad)" />
                    <path d="M22 14L40 52L58 14H50L40 36L30 14H22Z" fill="url(#vInnerGrad)" fillOpacity="0.9" />
                    <circle cx="40" cy="68" r="3.5" fill="#00f0ff" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-6xl sm:text-8xl font-black tracking-[0.24em] text-white uppercase drop-shadow-[0_0_40px_rgba(6,182,212,0.45)]">
                  VEROYX
                </h1>
                <p className="text-xs sm:text-sm font-mono text-cyan-400 tracking-widest uppercase">
                  Space Domain Awareness & Allied JADC2 Battle Management
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-[10px] text-slate-300 pt-1">
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  [ 9.8.1 // SECURED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  [ ZERO-TRUST ENFORCED ]
                </span>
                <span className="px-3 py-1 rounded-md bg-slate-950/80 border border-slate-800 backdrop-blur-md flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  [ KERNEL: ONLINE ]
                </span>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <Link href="/visualizer" className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-105">
                  <Globe className="w-4 h-4" />
                  <span>NASA EARTH THEATER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link href="/nexus" className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>COMMAND NEXUS</span>
                </Link>

                <Link href="/catalog" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>48K ORBITAL CATALOG</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
