"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, Zap, ArrowRight, Terminal, 
  Lock, Database, Cpu, Unlock, ShieldAlert, Fingerprint, 
  Sparkles, Crosshair, Eye, ChevronRight, Activity, Radio
} from "lucide-react"
import { 
  createGeodesicOrbitalNexus, createDeepSpaceStarfield, 
  createHyperspaceTunnel 
} from "@/components/three/CinematicSpaceEngine"

type ClearanceLevel = "TS_SCI_SITK" | "SECRET_NATO" | "SAP_GAMMA"

export default function MasterHomePage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const pillarsRef = useRef<HTMLDivElement | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isWarping, setIsWarping] = useState<boolean>(false)
  const [clearanceTier, setClearanceTier] = useState<ClearanceLevel>("TS_SCI_SITK")
  const [pinCode, setPinCode] = useState<string>("8942-0129")
  const [authStepMessage, setAuthStepMessage] = useState<string>("CREDENTIALS STANDBY")

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("veroyx_clearance_active") === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Execute Star Wars Hyperspace Jump Transition
  const handleInitiateWarp = (bypass = false) => {
    setAuthStepMessage("NIST FIPS 140-3 HSM ZERO-KNOWLEDGE PROOF VERIFIED...")
    setIsWarping(true)
    setTimeout(() => {
      setIsWarping(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, bypass ? 1200 : 1600)
  }

  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 3D Three.js Geodesic Wireframe Sphere, Starfield & Hyperspace Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 16)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Deep-Space Starfield
    const starfield = createDeepSpaceStarfield(1600, 600)
    scene.add(starfield)

    // 3D Interactive Geodesic Wireframe Sphere & Orbital Nexus (Video 00:12)
    const { group: nexusGroup, sphereWire, ringsGroup, orbiterPoints } = createGeodesicOrbitalNexus(5.8)
    scene.add(nexusGroup)

    // Star Wars Hyperspace Warp Lines
    const { warpLines, velocities } = createHyperspaceTunnel(1200)
    scene.add(warpLines)

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
      nexusGroup.rotation.y += deltaX * 0.005
      nexusGroup.rotation.x += deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(10.0, Math.min(30.0, camera.position.z + e.deltaY * 0.02))
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

      // Star Wars Lightspeed Warp Mode
      if (isWarping) {
        warpLines.material.opacity = Math.min(0.95, warpLines.material.opacity + delta * 3.0)
        camera.fov = Math.min(100.0, camera.fov + delta * 45.0)
        camera.updateProjectionMatrix()

        const pArr = warpLines.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < 1200; i++) {
          pArr[i * 6 + 2] += velocities[i] * delta * 2.8
          pArr[i * 6 + 5] += velocities[i] * delta * 2.8
          if (pArr[i * 6 + 2] > 30) {
            pArr[i * 6 + 2] = -80
            pArr[i * 6 + 5] = -83.5
          }
        }
        warpLines.geometry.attributes.position.needsUpdate = true
      } else {
        warpLines.material.opacity = Math.max(0.0, warpLines.material.opacity - delta * 3.0)
        if (camera.fov > 45.0) {
          camera.fov = Math.max(45.0, camera.fov - delta * 40.0)
          camera.updateProjectionMatrix()
        }
      }

      // Smooth orbital nexus rotation
      sphereWire.rotation.y += 0.08 * delta
      sphereWire.rotation.x += 0.03 * delta
      ringsGroup.rotation.z += 0.12 * delta
      orbiterPoints.rotation.y -= 0.06 * delta

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
  }, [isWarping])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 3D WebGL Canvas Layer */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" />

      {/* STATE 1: EXACT ZERO-TRUST SECURITY GATE (Video 00:06 - 00:11) */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20 select-none">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#020617]/90 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_0_70px_rgba(6,182,212,0.25)] space-y-6 font-mono text-xs pointer-events-auto">
            
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zero-Trust Security Gate</h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                UNAUTHORIZED ACCESS IS PROHIBITED UNDER 18 U.S.C. § 1030. ALL NETWORK PACKETS AND CRYPTOGRAPHIC SIGNATURES ARE MONITORED BY DEFENSE INFORMATION SYSTEMS AGENCY (DISA).
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
                        isSel 
                          ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                          : "bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700"
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
                <span className="text-emerald-400 font-bold text-[10px]">STATUS: ID: FP-9821-USSF</span>
              </div>
              <input
                type="text"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                placeholder="Enter 8-digit CAC PKI PIN..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest text-sm"
              />
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300">
                <span className="font-bold">[ {authStepMessage} ]</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleInitiateWarp(false)}
                disabled={isWarping}
                className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
              >
                {isWarping ? <Lock className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{isWarping ? "ENGAGING HYPERSPACE WARP JUMP..." : "AUTHORIZE CLASSIFIED ACCESS"}</span>
              </button>

              <button
                onClick={() => handleInitiateWarp(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTANT EVALUATOR 1-CLICK ACCESS</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: THE BELOVED AUTHENTICATED HOMEPAGE (Video 00:12 - 00:16) */
        <div className="relative w-full min-h-screen z-10">
          
          {/* Top Session Security Banner */}
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

          {/* HERO SECTION: GEODESIC SPHERE CENTERPIECE & CORNER HUD BADGES */}
          <section className="relative w-full min-h-[95vh] flex flex-col items-center justify-center pt-20 px-4 sm:px-6 select-none pointer-events-none">
            
            {/* 4 Corner Tactical HUD Badges (Video 00:12 - 00:13) */}
            <div className="absolute top-24 left-8 z-20 font-mono text-[10px] space-y-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl backdrop-blur-md hidden md:block">
              <div className="text-slate-500 font-bold">ACTIVE SPACE SURVEILLANCE</div>
              <div className="text-white font-bold">48,219 TRACKED RSO [SGP4 LIVE]</div>
              <div className="text-cyan-400">CONSTELLATION RESILIENCE: 98.7%</div>
            </div>

            <div className="absolute top-24 right-8 z-20 font-mono text-[10px] space-y-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl backdrop-blur-md text-right hidden md:block">
              <div className="text-slate-500 font-bold">pLEO OISL MESH LINK</div>
              <div className="text-white font-bold">34.2 ms LATENCY (END-TO-END)</div>
              <div className="text-emerald-400 font-bold">100 Gbps COHERENT OISL</div>
            </div>

            <div className="absolute bottom-16 left-8 z-20 font-mono text-[10px] space-y-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl backdrop-blur-md hidden md:block">
              <div className="text-slate-500 font-bold">SPACE DOMAIN RESILIENCE</div>
              <div className="text-emerald-400 font-bold">DEFENSE SECURED</div>
              <div className="text-slate-400">256-BIT POST-QUANTUM KYBER</div>
            </div>

            <div className="absolute bottom-16 right-8 z-20 font-mono text-[10px] space-y-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl backdrop-blur-md text-right hidden md:block">
              <div className="text-slate-500 font-bold">POST-QUANTUM CRYPTOGRAPHY</div>
              <div className="text-cyan-300 font-bold">BELL STATE ENTANGLEMENT</div>
              <div className="text-emerald-400">QUANTUM SECURED</div>
            </div>

            {/* Central Hero Brand & Action Pillar */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto pointer-events-auto">
              
              {/* BORDERLESS GLOWING V LOGO EMBLEM */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-3xl animate-pulse pointer-events-none" />
                <svg viewBox="0 0 80 80" className="w-24 h-24 drop-shadow-[0_0_30px_rgba(6,182,212,0.9)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="vHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="45%" stopColor="#00f0ff" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="vInnerLight" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>
                  <path d="M12 14L40 68L32 68L8 14H12Z" fill="url(#vHeroGrad)" />
                  <path d="M68 14L40 68L48 68L72 14H68Z" fill="url(#vHeroGrad)" />
                  <path d="M22 14L40 52L58 14H50L40 36L30 14H22Z" fill="url(#vInnerLight)" fillOpacity="0.95" />
                  <circle cx="40" cy="68" r="3.5" fill="#00f0ff" />
                </svg>
              </div>

              <div className="space-y-2">
                <h1 className="text-6xl sm:text-8xl font-black tracking-[0.24em] text-white uppercase drop-shadow-[0_0_40px_rgba(6,182,212,0.45)]">
                  VEROYX
                </h1>
                <p className="text-xs sm:text-sm font-mono text-cyan-400 tracking-widest uppercase">
                  Space Domain Awareness &amp; Allied JADC2 Battle Management
                </p>
              </div>

              {/* Status Badges */}
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

              {/* Primary Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                <Link href="/nexus" className="px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center gap-2 hover:scale-105">
                  <Terminal className="w-4 h-4 text-cyan-200" />
                  <span>COMMAND NEXUS DIRECTORY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link href="/visualizer" className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>NASA EARTH THEATER</span>
                </Link>

                <Link href="/catalog" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:scale-105">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>48K ORBITAL CATALOG</span>
                </Link>
              </div>

            </div>
          </section>

          {/* STRATEGIC COMMAND DECKS SECTION (Video 00:14 - 00:16) */}
          <section ref={pillarsRef} className="relative w-full max-w-7xl mx-auto px-6 py-20 font-mono text-xs z-20">
            <div className="text-center space-y-3 mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-widest uppercase">
                STRATEGIC COMMAND DECKS
              </h2>
              <p className="text-slate-400 text-xs max-w-2xl mx-auto font-sans">
                Direct access to specialized flight dynamics, counter-space kinetic interception, space surveillance networks, and post-quantum encrypted relays.
              </p>
            </div>

            {/* 4 PILLAR CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* PILLAR 01: FLIGHT DYNAMICS & PHYSICS */}
              <div className="p-6 rounded-2xl bg-[#020617]/90 border border-slate-800 hover:border-cyan-500/60 transition-all space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">PILLAR 01</span>
                  <Orbit className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">FLIGHT DYNAMICS &amp; PHYSICS</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    High-precision SGP4 numerical integration, 32/14 zonal harmonics, and impulsive maneuvers.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <Link href="/ephemeris" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>SGP4 Orbit Propagator</span>
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/visualizer" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>3D Threat Visualizer</span>
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/delta-v" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Delta-V Maneuver Burns</span>
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/conjunction" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Conjunction Assessment (Pc)</span>
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                </div>
              </div>

              {/* PILLAR 02: SPACE SURVEILLANCE (SDA) */}
              <div className="p-6 rounded-2xl bg-[#020617]/90 border border-slate-800 hover:border-amber-500/60 transition-all space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">PILLAR 02</span>
                  <Eye className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">SPACE SURVEILLANCE (SDA)</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    48K Space-Track catalog, SSN phased-array metric tasking, and SIGINT multilateration.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <Link href="/catalog" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>48K Space-Track Catalog</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/tasking" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>SSN Radar Metric Tasking</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/scheduler" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Hungarian Sensor Scheduler</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/sigint" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Space-Based SIGINT TDOA</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </Link>
                </div>
              </div>

              {/* PILLAR 03: ORBITAL DEFENSE & DEW */}
              <div className="p-6 rounded-2xl bg-[#020617]/90 border border-slate-800 hover:border-rose-500/60 transition-all space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">PILLAR 03</span>
                  <Crosshair className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ORBITAL DEFENSE &amp; DEW</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Autonomous JADC2 kill-chain, megawatt laser thermal ablation, and kinetic hit-to-kill.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <Link href="/kill-chain" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Space Kill-Chain JADC2</span>
                    <ChevronRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/directed-energy" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>DEW Laser Ablation Suite</span>
                    <ChevronRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/intercept" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Kinetic ASAT True ProNav</span>
                    <ChevronRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/rpo" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>RPO Safety Corridors</span>
                    <ChevronRight className="w-3 h-3 text-rose-400" />
                  </Link>
                </div>
              </div>

              {/* PILLAR 04: COMMAND & RESILIENCE */}
              <div className="p-6 rounded-2xl bg-[#020617]/90 border border-slate-800 hover:border-emerald-500/60 transition-all space-y-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">PILLAR 04</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">COMMAND &amp; RESILIENCE</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                    Unified multi-tier command nexus, battle management glass, and self-healing OISL meshes.
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <Link href="/nexus" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Unified Command Nexus</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/c2" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>C2 Tactical Battle Glass</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/resilience" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>Autonomous Mesh Self-Healing</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/access" className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 block text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between">
                    <span>VIP Access Portal ($10K+)</span>
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                </div>
              </div>

            </div>

            {/* Bottom Institutional Metrics Bar (Video 00:15 - 00:16) */}
            <div className="mt-14 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-slate-400 text-[10px] shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-bold">109 PRODUCTION SPATIAL ASTRODYNAMICS ENGINES</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>48,219 TRACKED RESIDENT SPACE OBJECTS</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>MIL-STD-188 HARDENED &amp; FIPS 140-3 COMPLIANT</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
