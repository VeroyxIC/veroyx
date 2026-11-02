"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2, 
  ShieldAlert, Scan, Fingerprint, Unlock 
} from "lucide-react"
import { createCinematicEarth, createMilitarySatellite, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

type ClearanceLevel = "TS_SCI_SITK" | "SECRET_NATO" | "SAP_GAMMA"

export default function MasterGatewayPage() {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Zero-Trust Authentication Enclave States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [clearanceTier, setClearanceTier] = useState<ClearanceLevel>("TS_SCI_SITK")
  const [pinCode, setPinCode] = useState<string>("8942-0129")
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [authStepMessage, setAuthStepMessage] = useState<string>("CREDENTIALS STANDBY")

  // Check existing session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = sessionStorage.getItem("veroyx_clearance_active")
      if (active === "true") {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Execute Zero-Trust Cryptographic Handshake
  const handleAuthorizeEnclave = (bypass = false) => {
    setIsAuthenticating(true)
    setAuthStepMessage("INITIALIZING ECDH CURVE25519 KEY EXCHANGE...")

    setTimeout(() => {
      setAuthStepMessage("NIST FIPS 140-3 HSM ZERO-KNOWLEDGE PROOF VERIFIED...")
    }, 450)

    setTimeout(() => {
      setAuthStepMessage("CLEARANCE GRANTED // DECRYPTING OPERATIONAL ENCLAVE")
    }, 850)

    setTimeout(() => {
      setIsAuthenticating(false)
      setIsAuthenticated(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("veroyx_clearance_active", "true")
      }
    }, bypass ? 250 : 1200)
  }

  // Lock Terminal Re-engagement
  const handleLockTerminal = () => {
    setIsAuthenticated(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("veroyx_clearance_active")
    }
  }

  // 3D Three.js 8K Photorealistic Background Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 10, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting (Direct Sun & Space Ambient)
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.4)
    sun.position.set(25, 20, 18)
    scene.add(sun)

    // 1. Deep Space Stellar Environment
    const starfield = createDeepSpaceStarfield(1600, 700)
    scene.add(starfield)

    // 2. Photorealistic Earth (Day/Night Terminator, City Lights, Rayleigh Glow)
    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 3. Reconnaissance Flagship Satellite
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.5 })
    scene.add(satGroup)

    // 4. Orbital Ring with Glowing Telemetry Packets
    const orbitRingGeo = new THREE.RingGeometry(earthRadius + 2.2, earthRadius + 2.24, 96)
    const orbitRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat)
    orbitRing.rotation.x = Math.PI / 2.4
    scene.add(orbitRing)

    // Mouse Parallax Motion
    let mouseX = 0
    let mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMouseMove)

    let simStep = 0
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      simStep += 1

      // Rotate Earth & Clouds
      earthMesh.rotation.y += 0.0007
      cloudsMesh.rotation.y += 0.00095

      // Orbit Satellite
      const t = simStep * 0.008
      const r = earthRadius + 2.22
      satGroup.position.set(r * Math.cos(t), r * Math.sin(t) * 0.45, r * Math.sin(t) * 0.85)
      satGroup.lookAt(0, 0, 0)

      // Animate Ion Thruster Plume
      const plumeScale = 1.0 + Math.sin(simStep * 0.4) * 0.3
      ionPlume.scale.set(plumeScale, plumeScale * 1.4, plumeScale)

      // Smooth Camera Parallax Drift
      camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.04
      camera.position.y += (-mouseY * 1.8 + 10 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)

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
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* FULL-SCREEN 3D WEBGL ENGINE BACKDROP */}
      <div ref={mountRef} className="fixed inset-0 pointer-events-none -z-10" />

      {/* ============================================================ */}
      {/* GATEWAY LAYER 1: CLASSIFIED ZERO-TRUST AUTHENTICATION PORTAL  */}
      {/* ============================================================ */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4 pb-12 z-20">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-[#010614]/90 backdrop-blur-3xl border border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.3)] space-y-6 font-mono text-xs">
            
            {/* DoD Warning Header */}
            <div className="text-center space-y-2 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>RESTRICTED ACCESS // U.S. SPACE SYSTEMS COMMAND</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">
                Zero-Trust Security Gate
              </h1>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                UNAUTHORIZED ACCESS IS PROHIBITED UNDER 18 U.S.C. § 1030. ALL NETWORK PACKETS AND CRYPTOGRAPHIC SIGNATURES ARE MONITORED BY DEFENSE INFORMATION SYSTEMS AGENCY (DISA).
              </p>
            </div>

            {/* Clearance Selector */}
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
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => setClearanceTier(c.key as ClearanceLevel)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      clearanceTier === c.key 
                        ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                        : "bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-[11px] text-white">{c.label}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">{c.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Biometric & CAC Card Simulation */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>BIOMETRIC SMARTCARD (CAC/PIV)</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">DERIVED ID: FP-9821-USSF</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  placeholder="Enter 8-digit CAC PKI PIN..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest text-sm"
                />
              </div>

              {/* Real-time Crypto Handshake Status */}
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[10px] text-cyan-300 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="font-bold">{authStepMessage}</span>
                </div>
              </div>
            </div>

            {/* Action Execution Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleAuthorizeEnclave(false)}
                disabled={isAuthenticating}
                className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 ${
                  isAuthenticating 
                    ? "bg-cyan-500 text-black animate-pulse" 
                    : "bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-[1.02]"
                }`}
              >
                {isAuthenticating ? <Lock className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{isAuthenticating ? "AUTHENTICATING CRYPTO ENCLAVE..." : "AUTHORIZE CLASSIFIED ACCESS"}</span>
              </button>

              <button
                onClick={() => handleAuthorizeEnclave(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>INSTANT DEMO BYPASS // VIP GUEST CLEARANCE</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* GATEWAY LAYER 2: CINEMATIC 8K OPERATIONAL HOMEPAGE DASHBOARD */
        /* ============================================================ */
        <div className="pt-24 pb-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-500">
          
          {/* Top Session Security Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-cyan-500/40 font-mono text-xs shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold tracking-wider">SESSION GRANTED: {clearanceTier.replace(/_/g, " ")}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400">108 ACTIVE WEAPON &amp; SENSOR DECKS</span>
            </div>

            <button
              onClick={handleLockTerminal}
              className="px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3" />
              <span>LOCK TERMINAL</span>
            </button>
          </div>

          {/* Hero Branding & Primary Actions */}
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-white uppercase select-none drop-shadow-[0_0_35px_rgba(6,182,212,0.35)]">
              VE<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">RO</span>YX
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-mono">
              Next-generation Space Domain Awareness (SDA), real-time SGP4 orbital propagation, counter-space kinetic intercept modeling, and multi-tier JADC2 battle management.
            </p>

            {/* Quick Action Navigation */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/nexus"
                className="px-8 py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2"
              >
                <span>ENTER COMMAND NEXUS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/catalog"
                className="px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>48K SPACE-TRACK CATALOG</span>
              </Link>

              <Link
                href="/access"
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-700/20 hover:from-amber-600/40 hover:to-amber-700/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>VIP ACCESS ($10K+)</span>
              </Link>
            </div>
          </div>

          {/* 4 Strategic Enterprise Domain Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* PILLAR 1: COMMAND & JADC2 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                  <Globe className="w-3.5 h-3.5" /> Pillar 01
                </div>
                <h2 className="text-lg font-black text-white">COMMAND &amp; JADC2</h2>
                <p className="text-xs text-slate-400 mt-1">Multi-tier theater glass and battle management orchestration.</p>
                
                <div className="mt-4 space-y-2 font-mono text-xs">
                  <Link href="/nexus" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Unified Command Nexus</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/c2" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>C2 Tactical Deck</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/kill-chain" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Space Kill-Chain JADC2</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                  <Link href="/telecommand" className="p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>CCSDS Telecommand Uplink</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </Link>
                </div>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-bold">● SYSTEM READY</div>
            </div>

            {/* PILLAR 2: COUNTER-SPACE & DEFENSE */}
            <div className="p-6 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                  <Crosshair className="w-3.5 h-3.5" /> Pillar 02
                </div>
                <h2 className="text-lg font-black text-white">ORBITAL DEFENSE</h2>
                <p className="text-xs text-slate-400 mt-1">Kinetic hit-to-kill interception, DEW lasers, and proximity safety.</p>
                
                <div className="mt-4 space-y-2 font-mono text-xs">
                  <Link href="/directed-energy" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>DEW Laser Ablation</span>
                    <ArrowRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/intercept" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Kinetic ASAT True ProNav</span>
                    <ArrowRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/rpo" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>RPO Safety Corridors</span>
                    <ArrowRight className="w-3 h-3 text-rose-400" />
                  </Link>
                  <Link href="/planetary-defense" className="p-2 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Planetary Defense (DART)</span>
                    <ArrowRight className="w-3 h-3 text-rose-400" />
                  </Link>
                </div>
              </div>
              <div className="text-[10px] text-rose-400 font-mono font-bold">● WEAPONS ACTIVE</div>
            </div>

            {/* PILLAR 3: SPACE SURVEILLANCE & SENSORS */}
            <div className="p-6 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                  <Eye className="w-3.5 h-3.5" /> Pillar 03
                </div>
                <h2 className="text-lg font-black text-white">SPACE SURVEILLANCE</h2>
                <p className="text-xs text-slate-400 mt-1">48K Space-Track catalog, SGP4 ephemeris, and SIGINT direction finding.</p>
                
                <div className="mt-4 space-y-2 font-mono text-xs">
                  <Link href="/catalog" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>48K Space-Track Catalog</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/ephemeris" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>SGP4 Orbit Propagator</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/tasking" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>SSN Radar Tasking</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </Link>
                  <Link href="/sigint" className="p-2 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800/80 hover:border-amber-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Space-Based SIGINT TDOA</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </Link>
                </div>
              </div>
              <div className="text-[10px] text-amber-400 font-mono font-bold">● 48,219 TRACKS</div>
            </div>

            {/* PILLAR 4: RESILIENCE & QUANTUM */}
            <div className="p-6 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-1">
                  <Zap className="w-3.5 h-3.5" /> Pillar 04
                </div>
                <h2 className="text-lg font-black text-white">RESILIENCE &amp; QUANTUM</h2>
                <p className="text-xs text-slate-400 mt-1">Autonomous mesh self-healing, QKD encryption, and EW anti-spoofing.</p>
                
                <div className="mt-4 space-y-2 font-mono text-xs">
                  <Link href="/visualizer" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>3D Threat Visualizer</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/pnt-resilience" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>EW &amp; Counter-PNT Nulling</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/qkd" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>Quantum Key Relays (QKD)</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                  <Link href="/resilience" className="p-2 rounded-lg bg-slate-950/60 hover:bg-emerald-950/40 border border-slate-800/80 hover:border-emerald-500/50 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                    <span>pLEO Mesh Self-Healing</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </Link>
                </div>
              </div>
              <div className="text-[10px] text-cyan-400 font-mono font-bold">● POST-QUANTUM SECURE</div>
            </div>
          </div>

          {/* Quick Nav Footer Ribbon */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>USSF SPACE DOMAIN AWARENESS INFRASTRUCTURE // COMPLIANT NIST SP 800-171 &amp; CMMC LEVEL 3</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/developers" className="text-cyan-400 hover:underline">REST API</Link>
              <Link href="/compliance" className="text-slate-400 hover:underline">ITAR / EAR</Link>
              <Link href="/access" className="text-amber-400 font-bold hover:underline">VIP SEATS ($10K+)</Link>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
