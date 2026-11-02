"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, ShieldCheck, ShieldAlert, Zap, Radio, 
  Activity, Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, Crosshair, Target, Cpu, Signal, Lock, Flame, 
  Wind, Eye, Network, CheckCircle2, ArrowRight, Sparkles, Terminal, ChevronRight 
} from "lucide-react"

type TheaterDomain = "ALL_DOMAINS" | "ORBITAL_DEFENSE" | "SPACE_SURVEILLANCE" | "COMM_RESILIENCE" | "PLANETARY_THREATS"

interface StrategicAlert {
  id: string
  timestamp: string
  level: "CRITICAL" | "HIGH" | "ADVISORY"
  domain: string
  sourceModule: string
  route: string
  message: string
}

interface TierAsset {
  id: string
  name: string
  tier: "LEO" | "MEO" | "GEO" | "CISLUNAR"
  type: string
  altitudeKm: number
  inclinationDeg: number
  status: "NOMINAL" | "ENGAGED" | "CONGESTED" | "OFFLINE"
  healthPct: number
  colorHex: string
}

const STRATEGIC_ALERTS: StrategicAlert[] = [
  { id: "ALT-801", timestamp: "11:42:05", level: "CRITICAL", domain: "DEFENSE", sourceModule: "/intercept", route: "/intercept", message: "Direct-Ascent Kinetic ASAT launch detected from Kapustin Yar (T-140s to LEO interception)." },
  { id: "ALT-802", timestamp: "11:43:18", level: "CRITICAL", domain: "EW/PNT", sourceModule: "/pnt-resilience", route: "/pnt-resilience", message: "Krasukha-4 high-power broadband jammer saturating GPS L1 across Eastern European corridor (+52 dB J/S)." },
  { id: "ALT-803", timestamp: "11:44:02", level: "HIGH", domain: "RPO", sourceModule: "/rpo", route: "/rpo", message: "Hostile co-orbital inspector COSMOS-2558 breached 200m Keep-Out Sphere on Aegis-SAR platform." },
  { id: "ALT-804", timestamp: "11:44:50", level: "HIGH", domain: "HYPERSONIC", sourceModule: "/hypersonic", route: "/hypersonic", message: "SDA PWSA Tracking Layer maintains stereo OPIR track on Mach 18.2 glide vehicle executing cross-range weave." },
  { id: "ALT-805", timestamp: "11:45:12", level: "ADVISORY", domain: "QUANTUM", sourceModule: "/qkd", route: "/qkd", message: "Micius entanglement relay QBER nominal at 2.4% (|S| = 2.68) across Delingha-Nanshan baseline." },
  { id: "ALT-806", timestamp: "11:45:30", level: "ADVISORY", domain: "PLANETARY", sourceModule: "/planetary-defense", route: "/planetary-defense", message: "B-plane deflection prediction for 99942 Apophis confirms 4.2 Earth radii gravitational bypass." }
]

const TIER_ASSETS: TierAsset[] = [
  { id: "VXO-01", name: "Tactical Recon-1", tier: "LEO", type: "Optical Surveillance", altitudeKm: 510, inclinationDeg: 97.4, status: "NOMINAL", healthPct: 98, colorHex: "#38bdf8" },
  { id: "SAR-02", name: "Aegis-SAR Radar", tier: "LEO", type: "High-Res Radar", altitudeKm: 620, inclinationDeg: 98.1, status: "ENGAGED", healthPct: 74, colorHex: "#f59e0b" },
  { id: "GPS-33", name: "Navstar GPS-III", tier: "MEO", type: "PNT Constellation", altitudeKm: 20180, inclinationDeg: 55.0, status: "NOMINAL", healthPct: 99, colorHex: "#10b981" },
  { id: "MIL-04", name: "Milstar Feeder-4", tier: "GEO", type: "Hardened Comms", altitudeKm: 35786, inclinationDeg: 0.1, status: "NOMINAL", healthPct: 100, colorHex: "#d946ef" },
  { id: "SDA-T1", name: "PWSA Transport-8", tier: "LEO", type: "OISL Mesh Router", altitudeKm: 1000, inclinationDeg: 81.0, status: "NOMINAL", healthPct: 94, colorHex: "#00f0ff" },
  { id: "LUN-01", name: "Gateway Relay-1", tier: "CISLUNAR", type: "Deep-Space Node", altitudeKm: 384400, inclinationDeg: 28.5, status: "NOMINAL", healthPct: 96, colorHex: "#fbbf24" }
]

const QUICK_MODULES = [
  { name: "C2 Tactical Deck", route: "/c2", tag: "THEATER GLASS" },
  { name: "Kinetic ASAT & DEW", route: "/intercept", tag: "COUNTER-SPACE" },
  { name: "SSN Sensor Tasking", route: "/tasking", tag: "RADAR HANDOVER" },
  { name: "Mesh Self-Healing", route: "/resilience", tag: "DIJKSTRA pLEO" },
  { name: "Hypersonic OPIR", route: "/hypersonic", tag: "GLIDE TRACKING" },
  { name: "Pursuit-Evasion Game", route: "/pursuit-evasion", tag: "DIFFERENTIAL COMBAT" },
  { name: "Space-Based Solar", route: "/sbsp", tag: "GEO WPT BEAM" },
  { name: "Automated Scheduler", route: "/scheduler", tag: "HUNGARIAN ASSIGN" },
  { name: "Adaptive Optics LGS", route: "/adaptive-optics", tag: "STREHL CORRECTION" },
  { name: "EW & Counter-PNT", route: "/pnt-resilience", tag: "CRPA NULLING" },
  { name: "RPO Safety Corridors", route: "/rpo", tag: "HCW REL-NAV" },
  { name: "HEMP & Radiation", route: "/hemp-sim", tag: "STARFISH BELTS" },
  { name: "Space-Based SIGINT", route: "/sigint", tag: "TDOA / FDOA" },
  { name: "Satellite QKD Relays", route: "/qkd", tag: "BELL ENTANGLEMENT" },
  { name: "Planetary Defense", route: "/planetary-defense", tag: "DART DEFLECTION" }
]

export default function NexusPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [activeDomain, setActiveDomain] = useState<TheaterDomain>("ALL_DOMAINS")
  const [selectedAssetId, setSelectedAssetId] = useState<string>("VXO-01")
  const [defconLevel, setDefconLevel] = useState<number>(2)
  const [timeWarp, setTimeWarp] = useState<number>(1)
  const [simStep, setSimStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const activeAsset = TIER_ASSETS.find(a => a.id === selectedAssetId) || TIER_ASSETS[0]

  // Filtered Assets based on domain
  const filteredAssets = useMemo(() => {
    if (activeDomain === "ORBITAL_DEFENSE") {
      return TIER_ASSETS.filter(a => a.id === "SAR-02" || a.id === "VXO-01")
    }
    if (activeDomain === "SPACE_SURVEILLANCE") {
      return TIER_ASSETS.filter(a => a.tier === "LEO" || a.tier === "MEO")
    }
    if (activeDomain === "COMM_RESILIENCE") {
      return TIER_ASSETS.filter(a => a.tier === "GEO" || a.id === "SDA-T1" || a.tier === "CISLUNAR")
    }
    if (activeDomain === "PLANETARY_THREATS") {
      return TIER_ASSETS.filter(a => a.tier === "CISLUNAR")
    }
    return TIER_ASSETS
  }, [activeDomain])

  // Aggregate Theater Health Metrics
  const totalFleetHealth = useMemo(() => {
    const sum = TIER_ASSETS.reduce((acc, a) => acc + a.healthPct, 0)
    return (sum / TIER_ASSETS.length).toFixed(1)
  }, [])

  const criticalAlertCount = STRATEGIC_ALERTS.filter(a => a.level === "CRITICAL").length
  const highAlertCount = STRATEGIC_ALERTS.filter(a => a.level === "HIGH").length

  // Clock Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js Multi-Tier Strategic Theater Visualization
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01040f")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 24, 38)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    // 1. Earth Body (Radius 5.5 units)
    const earthR = 5.5
    const earthGeo = new THREE.SphereGeometry(earthR, 48, 48)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.85,
      metalness: 0.1
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 })
    const earthWire = new THREE.Mesh(new THREE.SphereGeometry(earthR * 1.005, 36, 18), wireMat)
    earth.add(earthWire)

    // 2. Multi-Tier Orbital Shells (LEO, MEO, GEO, Cislunar Gateway)
    const tierShells = [
      { name: "LEO", radius: earthR + 1.8, color: 0x38bdf8, opacity: 0.25 },
      { name: "MEO", radius: earthR + 5.5, color: 0x10b981, opacity: 0.2 },
      { name: "GEO", radius: earthR + 10.5, color: 0xd946ef, opacity: 0.25 },
      { name: "CISLUNAR", radius: earthR + 16.5, color: 0xfbbf24, opacity: 0.15 }
    ]

    tierShells.forEach(shell => {
      const ringGeo = new THREE.RingGeometry(shell.radius - 0.05, shell.radius + 0.05, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: shell.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: shell.opacity
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      scene.add(ring)
    })

    // 3. Moon / Cislunar Anchor Body
    const moonR = 1.4
    const moonDist = earthR + 16.5
    const moonGeo = new THREE.SphereGeometry(moonR, 24, 24)
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
    const moon = new THREE.Mesh(moonGeo, moonMat)
    moon.position.set(moonDist * 0.8, 2.0, -moonDist * 0.6)
    scene.add(moon)

    // 4. Asset Spacecraft Meshes in Respective Tiers
    const satGroup = new THREE.Group()
    scene.add(satGroup)

    const satEntries: { id: string; mesh: THREE.Mesh; orbitR: number; incRad: number; speed: number; phase: number }[] = []

    TIER_ASSETS.forEach((asset, idx) => {
      let r = earthR + 1.8
      if (asset.tier === "MEO") r = earthR + 5.5
      if (asset.tier === "GEO") r = earthR + 10.5
      if (asset.tier === "CISLUNAR") r = earthR + 15.2

      const sGeo = new THREE.BoxGeometry(0.4, 0.4, 0.6)
      const sMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(asset.colorHex),
        emissive: new THREE.Color(asset.colorHex),
        emissiveIntensity: 0.6
      })
      const sMesh = new THREE.Mesh(sGeo, sMat)
      satGroup.add(sMesh)

      // Sensor Field-of-View Cone
      const coneGeo = new THREE.ConeGeometry(0.8, 2.8, 16, 1, true)
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(asset.colorHex),
        wireframe: true,
        transparent: true,
        opacity: 0.2
      })
      const cone = new THREE.Mesh(coneGeo, coneMat)
      cone.rotation.x = Math.PI
      cone.position.set(0, 0, -1.4)
      sMesh.add(cone)

      satEntries.push({
        id: asset.id,
        mesh: sMesh,
        orbitR: r,
        incRad: (asset.inclinationDeg * Math.PI) / 180,
        speed: (0.003 / Math.sqrt(r / earthR)) * 1.5,
        phase: idx * 1.15
      })
    })

    // 5. Crosslink Optical Mesh Beams (Inter-Satellite OISL Lines)
    const linkLines: THREE.Line[] = []
    const linkPairs = [
      ["VXO-01", "SAR-02"],
      ["VXO-01", "SDA-T1"],
      ["GPS-33", "MIL-04"],
      ["MIL-04", "LUN-01"]
    ]

    linkPairs.forEach(() => {
      const bGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      const bMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 })
      const bLine = new THREE.Line(bGeo, bMat)
      scene.add(bLine)
      linkLines.push(bLine)
    })

    // 6. Threat Intercept Vector (Red Laser Beam from Kapustin Yar)
    const threatGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, earthR * 0.8, earthR * 0.6),
      new THREE.Vector3(0, earthR + 1.8, 0)
    ])
    const threatMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
    const threatLine = new THREE.Line(threatGeo, threatMat)
    scene.add(threatLine)

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      const t = simStep * timeWarp

      // Update Satellites
      const currentPosMap = new Map<string, THREE.Vector3>()

      satEntries.forEach(entry => {
        const u = t * entry.speed + entry.phase
        const x = entry.orbitR * Math.cos(u)
        const y = entry.orbitR * Math.sin(u) * Math.sin(entry.incRad)
        const z = entry.orbitR * Math.sin(u) * Math.cos(entry.incRad)

        entry.mesh.position.set(x, y, z)
        entry.mesh.lookAt(0, 0, 0)
        currentPosMap.set(entry.id, new THREE.Vector3(x, y, z))
      })

      // Update OISL crosslinks
      linkPairs.forEach((pair, idx) => {
        const p1 = currentPosMap.get(pair[0])
        const p2 = currentPosMap.get(pair[1])
        if (p1 && p2 && linkLines[idx]) {
          const posArr = new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z])
          linkLines[idx].geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
          linkLines[idx].geometry.attributes.position.needsUpdate = true
        }
      })

      earth.rotation.y += 0.0006 * timeWarp

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
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [timeWarp, simStep])

  return (
    <div className="w-full h-full pt-20 px-8 pb-8 flex bg-[#01040f] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: THEATER DOMAIN SELECTOR & ASSET ROSTER */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
              <Sparkles className="w-5 h-5 text-cyan-400" /> Space Nexus C2
            </h1>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
              Grand Unified Space Domain Awareness Nexus
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500 text-[10px]">DEFCON:</span>
            <span className={`font-black text-sm ${defconLevel <= 2 ? "text-rose-500 animate-pulse" : "text-amber-400"}`}>
              {defconLevel}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Domain Filter Switcher */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 text-[10px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Strategic Operational Domain
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["ALL_DOMAINS", "ORBITAL_DEFENSE", "SPACE_SURVEILLANCE", "COMM_RESILIENCE", "PLANETARY_THREATS"] as TheaterDomain[]).map(dom => (
                <button
                  key={dom}
                  onClick={() => setActiveDomain(dom)}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    activeDomain === dom
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {dom.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Active Multi-Tier Assets */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-2"><Orbit className="w-3.5 h-3.5 text-cyan-400" /> Active Tier Assets</span>
              <span className="text-emerald-400 font-bold">{filteredAssets.length} ONLINE</span>
            </label>
            <div className="space-y-2">
              {filteredAssets.map(asset => {
                const isSelected = asset.id === selectedAssetId
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected 
                        ? "bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white flex items-center gap-2">
                        {asset.name}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                          {asset.tier}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {asset.type} | Alt: {asset.altitudeKm.toLocaleString()} km
                      </div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className={`font-bold block ${asset.status === "ENGAGED" ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                        {asset.status}
                      </span>
                      <span className="text-slate-500">{asset.healthPct}% HEALTH</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time & Simulation Warp Controls */}
          <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2 flex justify-between">
              <span>Simulation Clock Warp</span>
              <span className="text-cyan-400 font-bold">{timeWarp}x REAL-TIME</span>
            </div>

            <input 
              type="range" min="1" max="10" step="1"
              value={timeWarp}
              onChange={e => setTimeWarp(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {isPlaying ? "FREEZE TIME" : "RUN SIM"}
              </button>

              <button
                onClick={() => setSimStep(0)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset Clock"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Domain Navigation Grid */}
          <div className="space-y-2">
            <label className="text-slate-500 font-bold uppercase tracking-widest text-[10px] block">
              15 Specialized Operational Decks
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {QUICK_MODULES.map(mod => (
                <Link
                  key={mod.route}
                  href={mod.route}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex flex-col justify-between"
                >
                  <span className="font-bold text-[10px] flex items-center justify-between">
                    {mod.name}
                    <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono mt-1">{mod.tag}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS MULTI-TIER THEATER & HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
            Space Domain Awareness [Unified Multi-Tier Command Nexus]
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-white">
              {activeAsset.name}
            </span>
            <span className="text-cyan-400 text-sm font-bold">
              [{activeAsset.tier} TIER // {activeAsset.altitudeKm.toLocaleString()} KM]
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-emerald-400">FLEET HEALTH: {totalFleetHealth}%</span>
            <span className="text-rose-400">CRITICAL ALERTS: {criticalAlertCount} ACTIVE</span>
            <span className="text-amber-400">WARNINGS: {highAlertCount} ELEVATED</span>
            <span className="text-cyan-400">CROSS-TIER LINKS: 4 MESH BRIDGES</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-move" />

        {/* Tactical HUD Footer */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SDA PRODUCTION CAPACITY</span>
              <span className="text-white font-bold text-sm">100 PRODUCTION ROUTES COMPILED</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GLOBAL RADAR TRACK CUSTODY</span>
            <span className="text-emerald-400 font-bold text-sm">48,219 ORBITAL OBJECTS</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">AUTONOMOUS DEFENSE READINESS</span>
            <span className="text-cyan-400 font-bold text-sm">MIL-STD-188 HARDENED</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ENCRYPTION INTEGRITY</span>
            <span className="text-amber-400 font-bold text-sm">NIST ML-KEM + QKD OTP</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: STRATEGIC ALERT FEED & SYSTEM ARCHITECTURE */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Strategic Threat Bus
        </h2>

        <div className="space-y-6">
          {/* Real-Time Alert Event Stream */}
          <div className="space-y-2.5">
            {STRATEGIC_ALERTS.map(alert => (
              <Link
                key={alert.id}
                href={alert.route}
                className={`block p-3.5 rounded-xl border transition-all ${
                  alert.level === "CRITICAL"
                    ? "bg-rose-950/30 border-rose-500/50 hover:border-rose-400"
                    : alert.level === "HIGH"
                    ? "bg-amber-950/30 border-amber-500/50 hover:border-amber-400"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    alert.level === "CRITICAL" ? "bg-rose-900 text-rose-200" : alert.level === "HIGH" ? "bg-amber-900 text-amber-200" : "bg-cyan-900 text-cyan-200"
                  }`}>
                    {alert.level}
                  </span>
                  <span className="text-[10px] text-slate-500">{alert.timestamp} UTC</span>
                </div>
                <div className="text-white font-bold text-[10px] mt-1">{alert.domain} // {alert.sourceModule}</div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{alert.message}</p>
              </Link>
            ))}
          </div>

          {/* Architecture Status Breakdown */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Multi-Tier Domain Status</div>
            <div className="flex justify-between"><span className="text-slate-500">LEO Mesh Routing:</span><span className="text-emerald-400 font-bold">OPTIMAL (14.8 ms)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">MEO PNT Assuredness:</span><span className="text-emerald-400 font-bold">CRPA NULLING LOCKED</span></div>
            <div className="flex justify-between"><span className="text-slate-500">GEO Solar Power WPT:</span><span className="text-cyan-400 font-bold">2.4 GW DISPATCH</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cislunar Quantum Relay:</span><span className="text-cyan-400 font-bold">ENTANGLED (S=2.68)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Planetary Defense B-Plane:</span><span className="text-emerald-400 font-bold">BYPASS ASSURED</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">DEFENSE POSTURE:</span><span className="text-rose-400">DEFCON 2 ACTIVE</span></div>
          </div>

          {/* Operational Principle */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              JADC2 Space Layer Standard
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              The Grand Unified Nexus fuses data from across all 15 specialized space domain awareness and tactical defense decks, providing joint commanders instantaneous situational dominance from low Earth orbit to Cislunar space.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
