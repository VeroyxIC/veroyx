"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Sparkles, Globe, Orbit, Crosshair, ShieldCheck, Zap, 
  Eye, Radio, Activity, Layers, ArrowRight, Terminal, 
  Lock, Key, Database, Cpu, Compass, Flame, CheckCircle2, 
  ShieldAlert, Scan, Fingerprint, Unlock, ChevronDown, Check 
} from "lucide-react"

export default function MasterHomePage() {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const pillarsRef = useRef<HTMLDivElement | null>(null)

  const [handshakeState, setHandshakeState] = useState<"IDLE" | "SCANNING" | "VERIFIED">("IDLE")
  const [handshakeText, setHandshakeText] = useState("INITIATE ZERO-TRUST HANDSHAKE")

  // Handle Handshake Activation & Smooth Scroll to Modules
  const handleHandshake = () => {
    if (handshakeState === "SCANNING") return
    setHandshakeState("SCANNING")
    setHandshakeText("VERIFYING CURVE25519 TOKEN...")

    setTimeout(() => {
      setHandshakeText("NIST FIPS 140-3 HSM VALIDATED...")
    }, 400)

    setTimeout(() => {
      setHandshakeState("VERIFIED")
      setHandshakeText("ENCLAVE UNLOCKED // ACCESS GRANTED")
      pillarsRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 900)
  }

  // 3D Three.js Interactive Geodesic Sphere Engine
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 22)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0284c7, 1.2))
    const pLight = new THREE.PointLight(0x00f0ff, 3.5, 50)
    pLight.position.set(0, 0, 15)
    scene.add(pLight)

    // 1. Core Geodesic Wireframe Sphere (Original Hero Mesh)
    const sphereRadius = 7.2
    const sphereGeo = new THREE.IcosahedronGeometry(sphereRadius, 4)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    })
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
    scene.add(sphereMesh)

    // 2. Concentric Telemetry Latitude & Equatorial Rings
    const ringsGroup = new THREE.Group()
    scene.add(ringsGroup)

    const ringOffsets = [
      { r: sphereRadius * 1.005, inc: 0, opacity: 0.5, color: 0x38bdf8 },
      { r: sphereRadius * 1.015, inc: Math.PI / 4, opacity: 0.35, color: 0x00f0ff },
      { r: sphereRadius * 1.025, inc: -Math.PI / 3.5, opacity: 0.3, color: 0x0284c7 }
    ]

    ringOffsets.forEach(ring => {
      const rGeo = new THREE.RingGeometry(ring.r - 0.04, ring.r + 0.04, 96)
      const rMat = new THREE.MeshBasicMaterial({
        color: ring.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ring.opacity
      })
      const rMesh = new THREE.Mesh(rGeo, rMat)
      rMesh.rotation.x = Math.PI / 2 + ring.inc
      ringsGroup.add(rMesh)
    })

    // 3. Sweeping Radar Scan Line
    const radarGeo = new THREE.BufferGeometry()
    const radarPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(sphereRadius * 1.05, 0, 0)]
    radarGeo.setFromPoints(radarPoints)
    const radarMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2, transparent: true, opacity: 0.85 })
    const radarSweep = new THREE.Line(radarGeo, radarMat)
    scene.add(radarSweep)

    // 4. Over 600 Pulsing Orbital Telemetry Satellite Nodes
    const swarmCount = 650
    const pointGeo = new THREE.BufferGeometry()
    const pointPositions = new Float32Array(swarmCount * 3)
    const pointColors = new Float32Array(swarmCount * 3)
    const orbitalTracks: { r: number; inc: number; raan: number; speed: number; phase: number }[] = []

    for (let i = 0; i < swarmCount; i++) {
      const r = sphereRadius * (0.95 + Math.random() * 0.22)
      const inc = Math.acos(Math.random() * 2 - 1)
      const raan = Math.random() * Math.PI * 2
      const speed = (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1)
      const phase = Math.random() * Math.PI * 2

      orbitalTracks.push({ r, inc, raan, speed, phase })

      pointPositions[i * 3 + 0] = r
      pointPositions[i * 3 + 1] = 0
      pointPositions[i * 3 + 2] = 0

      // Color Palette: Cyan, Emerald, Amber, White
      const p = Math.random()
      const c = p > 0.75 ? new THREE.Color(0x00f0ff) : p > 0.5 ? new THREE.Color(0x38bdf8) : p > 0.3 ? new THREE.Color(0x10b981) : new THREE.Color(0xfbbf24)
      pointColors[i * 3 + 0] = c.r
      pointColors[i * 3 + 1] = c.g
      pointColors[i * 3 + 2] = c.b
    }

    pointGeo.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3))
    pointGeo.setAttribute("color", new THREE.BufferAttribute(pointColors, 3))

    const pointMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    })
    const satelliteSwarm = new THREE.Points(pointGeo, pointMat)
    scene.add(satelliteSwarm)

    // 5. Interactive Mouse Drag & Parallax Dynamics
    let isDragging = false
    let prevMouseX = 0
    let prevMouseY = 0
    let rotVelX = 0.0012
    let rotVelY = 0.0008

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        // Parallax drift
        const ndcX = (e.clientX / window.innerWidth - 0.5) * 2
        const ndcY = (e.clientY / window.innerHeight - 0.5) * 2
        camera.position.x = ndcX * 1.5
        camera.position.y = -ndcY * 1.2
        camera.lookAt(0, 0, 0)
        return
      }

      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY

      rotVelY = deltaX * 0.005
      rotVelX = deltaY * 0.005
    }

    const onMouseUp = () => { isDragging = false }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    let simStep = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      simStep += 1

      // Apply drag rotation with inertia damping
      sphereMesh.rotation.y += rotVelY
      sphereMesh.rotation.x += rotVelX
      ringsGroup.rotation.y += rotVelY * 0.8
      ringsGroup.rotation.z += 0.001

      if (!isDragging) {
        rotVelX *= 0.96
        rotVelY = rotVelY * 0.96 + 0.0012 * 0.04
      }

      // Rotate Sweeping Radar Beam
      radarSweep.rotation.z += 0.025

      // Propagate 600+ Satellite Nodes
      const pArr = pointGeo.attributes.position.array as Float32Array
      for (let i = 0; i < swarmCount; i++) {
        const t = orbitalTracks[i]
        const u = simStep * t.speed + t.phase
        const x0 = t.r * Math.cos(u)
        const y0 = t.r * Math.sin(u) * Math.sin(t.inc)
        const z0 = t.r * Math.sin(u) * Math.cos(t.inc)

        pArr[i * 3 + 0] = x0 * Math.cos(t.raan) - z0 * Math.sin(t.raan)
        pArr[i * 3 + 1] = y0
        pArr[i * 3 + 2] = x0 * Math.sin(t.raan) + z0 * Math.cos(t.raan)
      }
      pointGeo.attributes.position.needsUpdate = true

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
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* ============================================================ */}
      {/* HERO SECTION: RESTORED ORIGINAL ANIMATION SPHERE & ICONIC 'V' */}
      {/* ============================================================ */}
      <section className="relative w-full min-h-[92vh] flex flex-col items-center justify-center pt-20 px-4 sm:px-6 select-none">
        
        {/* 3D Three.js Geodesic Particle Sphere Mount */}
        <div 
          ref={mountRef} 
          className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing z-0" 
          title="Click and drag to spin the 3D Space Domain Sphere"
        />

        {/* Tactical HUD Telemetry Cards Around the Sphere */}
        <div className="absolute top-24 left-6 hidden xl:block z-10 font-mono text-[11px] space-y-1 pointer-events-none bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">GLOBAL SPACE SURVEILLANCE</div>
          <div className="text-cyan-400 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            48,219 RSOs TRACKED [SSN LIVE]
          </div>
          <div className="text-slate-400 text-[10px]">Covariance Contraction: 99.4%</div>
        </div>

        <div className="absolute top-24 right-6 hidden xl:block z-10 font-mono text-[11px] space-y-1 text-right pointer-events-none bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">pLEO OPTICAL MESH ROUTING</div>
          <div className="text-emerald-400 font-bold flex items-center justify-end gap-2">
            14.2 ms LATENCY [DIJKSTRA]
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-slate-400 text-[10px]">100 Gbps Lasercom Active</div>
        </div>

        <div className="absolute bottom-16 left-6 hidden xl:block z-10 font-mono text-[11px] space-y-1 pointer-events-none bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">SPACE DEFENSE POSTURE</div>
          <div className="text-rose-400 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            DEFCON 2 // ESCALATION ENGAGED
          </div>
          <div className="text-slate-400 text-[10px]">Kinetic &amp; DEW Intercept Primed</div>
        </div>

        <div className="absolute bottom-16 right-6 hidden xl:block z-10 font-mono text-[11px] space-y-1 text-right pointer-events-none bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <div className="text-slate-500 text-[9px] uppercase tracking-wider">POST-QUANTUM CRYPTOGRAPHY</div>
          <div className="text-cyan-300 font-bold flex items-center justify-end gap-2">
            NIST ML-KEM-1024 + QKD OTP
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-slate-400 text-[10px]">Bell Parameter |S| = 2.68</div>
        </div>

        {/* HERO CENTERPIECE: ORIGINAL LOGO, TYPOGRAPHY & CHIPS */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto pointer-events-auto">
          
          {/* THE ORIGINAL GLOWING 'V' EMBLEM */}
          <div className="relative group cursor-pointer transition-transform duration-300 hover:scale-105">
            <div className="absolute -inset-3 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl blur-xl opacity-60 group-hover:opacity-90 transition duration-500" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-900 via-[#010816] to-[#01040f] border border-cyan-400/60 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.6)]">
              <svg 
                viewBox="0 0 64 64" 
                className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.9)]" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M14 16L32 50L50 16H40L32 35L24 16H14Z" fill="currentColor" fillOpacity="0.9" />
                <path d="M22 16L32 36L42 16H47L32 46L17 16H22Z" fill="#38bdf8" />
                <circle cx="32" cy="50" r="3" fill="#00f0ff" />
              </svg>
            </div>
          </div>

          {/* VEROYX TITLE */}
          <div className="space-y-2">
            <h1 className="text-6xl sm:text-8xl font-black tracking-[0.22em] text-white uppercase drop-shadow-[0_0_40px_rgba(6,182,212,0.4)]">
              VEROYX
            </h1>
            <p className="text-xs sm:text-sm font-mono text-cyan-400 tracking-widest uppercase">
              Space Domain Awareness &amp; Allied JADC2 Battle Management
            </p>
          </div>

          {/* THE 3 ORIGINAL TACTICAL STATUS CHIPS */}
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

          {/* THE ORIGINAL ZERO-TRUST HANDSHAKE BUTTON */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleHandshake}
              className={`px-8 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2.5 ${
                handshakeState === "SCANNING"
                  ? "bg-cyan-500 text-black animate-pulse"
                  : handshakeState === "VERIFIED"
                  ? "bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                  : "bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white hover:scale-105"
              }`}
            >
              {handshakeState === "SCANNING" ? (
                <Lock className="w-4 h-4 animate-spin" />
              ) : handshakeState === "VERIFIED" ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <Terminal className="w-4 h-4 text-cyan-400" />
              )}
              <span>{handshakeText}</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>

            <Link
              href="/nexus"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 hover:scale-105"
            >
              <Globe className="w-4 h-4" />
              <span>COMMAND NEXUS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-500 font-mono text-[10px] animate-pulse pointer-events-none">
          <span>SCROLL TO ENTER DECK RECONNAISSANCE</span>
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: THE 4 STRATEGIC OPERATIONAL PILLARS (NO DEAD ENDS) */}
      {/* ============================================================ */}
      <section ref={pillarsRef} className="max-w-7xl mx-auto px-4 sm:px-8 py-20 space-y-16">
        
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUTHENTICATED MULTI-DOMAIN ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            Strategic Command Decks
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-mono leading-relaxed">
            Direct access to specialized flight dynamics, counter-space kinetic intervention, space surveillance networks, and post-quantum encrypted relays.
          </p>
        </div>

        {/* 4 REFINED PILLARS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
          
          {/* PILLAR 1: FLIGHT DYNAMICS & PHYSICS */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 backdrop-blur-xl transition-all flex flex-col justify-between space-y-5 shadow-xl group">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                <Orbit className="w-4 h-4" /> Pillar 01
              </div>
              <h3 className="text-lg font-black text-white uppercase group-hover:text-cyan-300 transition-colors">
                Flight Dynamics &amp; Physics
              </h3>
              <p className="text-xs text-slate-400 mt-1">High-precision SGP4 numerical integration, J2/J4 zonal harmonics, and impulsive maneuvers.</p>

              <div className="mt-4 space-y-2 text-xs">
                <Link href="/ephemeris" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/50 border border-slate-800/80 hover:border-cyan-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>SGP4 Orbit Propagator</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/visualizer" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/50 border border-slate-800/80 hover:border-cyan-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>3D Threat Visualizer</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/delta-v" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/50 border border-slate-800/80 hover:border-cyan-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Delta-V Maneuver Burns</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/conjunction" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/50 border border-slate-800/80 hover:border-cyan-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Conjunction Assessment (Pc)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PROPAGATION LOCKED</span>
            </div>
          </div>

          {/* PILLAR 2: SPACE DOMAIN AWARENESS (SDA) */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 backdrop-blur-xl transition-all flex flex-col justify-between space-y-5 shadow-xl group">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                <Eye className="w-4 h-4" /> Pillar 02
              </div>
              <h3 className="text-lg font-black text-white uppercase group-hover:text-amber-300 transition-colors">
                Space Surveillance (SDA)
              </h3>
              <p className="text-xs text-slate-400 mt-1">48K Space-Track catalog, SSN phased-array metric tasking, and SIGINT geolocation.</p>

              <div className="mt-4 space-y-2 text-xs">
                <Link href="/catalog" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/50 border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>48K Space-Track Catalog</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/tasking" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/50 border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>SSN Radar Metric Tasking</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/scheduler" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/50 border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Hungarian Sensor Scheduler</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
                <Link href="/sigint" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/50 border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Space-Based SIGINT TDOA</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>48,219 RSOs TRACKED</span>
            </div>
          </div>

          {/* PILLAR 3: ORBITAL DEFENSE & COUNTER-SPACE */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 backdrop-blur-xl transition-all flex flex-col justify-between space-y-5 shadow-xl group">
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                <Crosshair className="w-4 h-4" /> Pillar 03
              </div>
              <h3 className="text-lg font-black text-white uppercase group-hover:text-rose-300 transition-colors">
                Orbital Defense &amp; DEW
              </h3>
              <p className="text-xs text-slate-400 mt-1">Autonomous JADC2 kill-chain, megawatt laser thermal ablation, and kinetic hit-to-kill.</p>

              <div className="mt-4 space-y-2 text-xs">
                <Link href="/kill-chain" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 border border-slate-800/80 hover:border-rose-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Space Kill-Chain JADC2</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/directed-energy" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 border border-slate-800/80 hover:border-rose-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>DEW Laser Ablation Suite</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/intercept" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 border border-slate-800/80 hover:border-rose-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Kinetic ASAT True ProNav</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
                <Link href="/rpo" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 border border-slate-800/80 hover:border-rose-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>RPO Safety Corridors</span>
                  <ArrowRight className="w-3 h-3 text-rose-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>WEAPONS PRIMED (DEFCON 2)</span>
            </div>
          </div>

          {/* PILLAR 4: ENTERPRISE COMMAND & RESILIENCE */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 backdrop-blur-xl transition-all flex flex-col justify-between space-y-5 shadow-xl group">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                <Globe className="w-4 h-4" /> Pillar 04
              </div>
              <h3 className="text-lg font-black text-white uppercase group-hover:text-emerald-300 transition-colors">
                Command &amp; Resilience
              </h3>
              <p className="text-xs text-slate-400 mt-1">Unified Multi-Tier Command Nexus, CCSDS telecommand uplink, and QKD key relays.</p>

              <div className="mt-4 space-y-2 text-xs">
                <Link href="/nexus" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/50 border border-slate-800/80 hover:border-emerald-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>Unified Command Nexus</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/c2" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/50 border border-slate-800/80 hover:border-emerald-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>C2 Tactical Battle Glass</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/telecommand" className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/50 border border-slate-800/80 hover:border-emerald-500/60 flex items-center justify-between text-slate-300 hover:text-white transition-all">
                  <span>CCSDS 232.0-B Telecommand</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </Link>
                <Link href="/access" className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950 to-indigo-950 hover:from-cyan-900 hover:to-indigo-900 border border-cyan-500/60 flex items-center justify-between text-cyan-200 hover:text-white transition-all font-bold">
                  <span>VIP Access ($10K-$250K)</span>
                  <Key className="w-3 h-3 text-amber-400" />
                </Link>
              </div>
            </div>
            <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>POST-QUANTUM SECURED</span>
            </div>
          </div>

        </div>

        {/* BOTTOM QUICK OPERATIONAL ACCESS DIRECTORY */}
        <div className="p-8 rounded-3xl bg-slate-950/70 border border-slate-800/80 font-mono text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-white font-bold uppercase tracking-wider block">109 Production Orbital Engineering Routes</span>
              <span className="text-[10px] text-slate-500">Fully compiled Next.js App Router endpoints with zero dead ends</span>
            </div>
            <Link href="/access" className="px-4 py-2 rounded-xl bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold hover:bg-cyan-900 transition-all flex items-center gap-2 self-start">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>INSTITUTIONAL LICENSING</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] text-slate-400">
            <Link href="/hypersonic" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">Hypersonic OPIR &rarr;</Link>
            <Link href="/pnt-resilience" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">EW &amp; Anti-Spoof &rarr;</Link>
            <Link href="/qkd" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">Quantum Keys &rarr;</Link>
            <Link href="/planetary-defense" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">DART Deflection &rarr;</Link>
            <Link href="/hemp-sim" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">HEMP Starfish &rarr;</Link>
            <Link href="/developers" className="p-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors">REST API Docs &rarr;</Link>
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-800/80 py-6 px-6 font-mono text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>VEROYX OPERATIONAL KERNEL v9.8.1 // USSF SPACE OPERATIONS COMMAND COMPLIANT</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/compliance" className="hover:text-slate-300 transition-colors">ITAR 22 C.F.R.</Link>
          <Link href="/compliance" className="hover:text-slate-300 transition-colors">NIST SP 800-171</Link>
          <Link href="/access" className="text-amber-400 font-bold hover:underline">ENTERPRISE ACQUISITION</Link>
        </div>
      </footer>
    </div>
  )
}
