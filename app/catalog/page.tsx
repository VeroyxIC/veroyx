"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Globe, Orbit, Search, Filter, Database, Radio, 
  Activity, Layers, Gauge, Compass, Play, Square, RotateCcw, 
  AlertTriangle, ShieldCheck, ShieldAlert, Cpu, ArrowRight, 
  Download, RefreshCw, BarChart3, Satellite, Box, Check, Sparkles 
} from "lucide-react"
import { createCinematicEarth, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"

interface CatalogObject {
  noradId: number
  name: string
  intlDesig: string
  country: "USA" | "PRC" | "RUS" | "ESA" | "COMMERCIAL" | "OTHER"
  type: "PAYLOAD" | "ROCKET_BODY" | "DEBRIS" | "UCT"
  regime: "LEO" | "MEO" | "GEO" | "HEO"
  perigeeKm: number
  apogeeKm: number
  inclinationDeg: number
  periodMin: number
  rcsM2: number
  launchYear: number
  decayRisk: "STABLE" | "DECAY_ALERT" | "HIGH_DRAG"
}

const BASE_CATALOG: CatalogObject[] = [
  { noradId: 25544, name: "ISS (ZARYA)", intlDesig: "1998-067A", country: "USA", type: "PAYLOAD", regime: "LEO", perigeeKm: 418, apogeeKm: 422, inclinationDeg: 51.64, periodMin: 92.9, rcsM2: 410.0, launchYear: 1998, decayRisk: "STABLE" },
  { noradId: 48274, name: "TIANGONG SPACE STATION", intlDesig: "2021-035A", country: "PRC", type: "PAYLOAD", regime: "LEO", perigeeKm: 382, apogeeKm: 389, inclinationDeg: 41.47, periodMin: 92.2, rcsM2: 85.0, launchYear: 2021, decayRisk: "STABLE" },
  { noradId: 58210, name: "USA-326 (OPTICAL RECON)", intlDesig: "2022-045A", country: "USA", type: "PAYLOAD", regime: "LEO", perigeeKm: 512, apogeeKm: 514, inclinationDeg: 97.4, periodMin: 94.8, rcsM2: 4.5, launchYear: 2022, decayRisk: "STABLE" },
  { noradId: 53324, name: "COSMOS-2558 (INSPECTOR)", intlDesig: "2022-089A", country: "RUS", type: "PAYLOAD", regime: "LEO", perigeeKm: 510, apogeeKm: 528, inclinationDeg: 97.4, periodMin: 95.0, rcsM2: 2.1, launchYear: 2022, decayRisk: "STABLE" },
  { noradId: 44713, name: "STARLINK-1007", intlDesig: "2019-074A", country: "COMMERCIAL", type: "PAYLOAD", regime: "LEO", perigeeKm: 549, apogeeKm: 551, inclinationDeg: 53.05, periodMin: 95.6, rcsM2: 1.8, launchYear: 2019, decayRisk: "STABLE" },
  { noradId: 47960, name: "ONEWEB-0182", intlDesig: "2021-025A", country: "COMMERCIAL", type: "PAYLOAD", regime: "LEO", perigeeKm: 1198, apogeeKm: 1202, inclinationDeg: 87.9, periodMin: 109.4, rcsM2: 2.4, launchYear: 2021, decayRisk: "STABLE" },
  { noradId: 28114, name: "MILSTAR-4 (DFS-4)", intlDesig: "2001-009A", country: "USA", type: "PAYLOAD", regime: "GEO", perigeeKm: 35782, apogeeKm: 35790, inclinationDeg: 0.08, periodMin: 1436.1, rcsM2: 12.0, launchYear: 2001, decayRisk: "STABLE" },
  { noradId: 43226, name: "BEIDOU-3 M1", intlDesig: "2017-069A", country: "PRC", type: "PAYLOAD", regime: "MEO", perigeeKm: 21510, apogeeKm: 21545, inclinationDeg: 55.2, periodMin: 773.2, rcsM2: 3.8, launchYear: 2017, decayRisk: "STABLE" },
  { noradId: 31221, name: "FENGYUN-1C DEBRIS", intlDesig: "1999-025DF", country: "PRC", type: "DEBRIS", regime: "LEO", perigeeKm: 812, apogeeKm: 870, inclinationDeg: 98.8, periodMin: 101.6, rcsM2: 0.04, launchYear: 1999, decayRisk: "STABLE" },
  { noradId: 22841, name: "SL-16 R/B (BOOSTER)", intlDesig: "1993-061B", country: "RUS", type: "ROCKET_BODY", regime: "LEO", perigeeKm: 640, apogeeKm: 660, inclinationDeg: 71.0, periodMin: 97.8, rcsM2: 14.5, launchYear: 1993, decayRisk: "HIGH_DRAG" },
  { noradId: 99182, name: "UCT-99182 (UNRESOLVED)", intlDesig: "UNKNOWN", country: "OTHER", type: "UCT", regime: "LEO", perigeeKm: 480, apogeeKm: 590, inclinationDeg: 82.4, periodMin: 95.3, rcsM2: 0.15, launchYear: 2025, decayRisk: "STABLE" }
]

export default function CatalogPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegime, setSelectedRegime] = useState<string>("ALL")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [selectedObject, setSelectedObject] = useState<CatalogObject>(BASE_CATALOG[0])
  const [isLiveSyncing, setIsLiveSyncing] = useState(true)
  const [simStep, setSimStep] = useState(0)
  const [exportedStatus, setExportedStatus] = useState(false)

  // Filtered Objects
  const filteredList = useMemo(() => {
    return BASE_CATALOG.filter(obj => {
      const matchQuery = 
        obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.noradId.toString().includes(searchQuery) ||
        obj.intlDesig.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchRegime = selectedRegime === "ALL" || obj.regime === selectedRegime
      const matchType = selectedType === "ALL" || obj.type === selectedType

      return matchQuery && matchRegime && matchType
    })
  }, [searchQuery, selectedRegime, selectedType])

  // Simulation Clock
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isLiveSyncing) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isLiveSyncing])

  // Export TLE/OEM Handler
  const handleExportOem = () => {
    setExportedStatus(true)
    setTimeout(() => setExportedStatus(false), 2500)
  }

  // 3D Three.js High-Density Global Space-Track Catalog Viewport
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 3000)
    camera.position.set(0, 18, 32)
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

    // Starfield Background
    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    // Cinematic Earth
    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // High-Density Orbital Swarm (Simulating 2,800 active cataloged objects on GPU)
    const particleCount = 2800
    const pointGeo = new THREE.BufferGeometry()
    const pointPositions = new Float32Array(particleCount * 3)
    const pointColors = new Float32Array(particleCount * 3)
    const pointOrbits: { r: number; inc: number; raan: number; speed: number; phase: number }[] = []

    for (let i = 0; i < particleCount; i++) {
      let r = earthRadius + 0.35 + Math.random() * 1.5 // LEO by default (70%)
      const p = Math.random()
      let cColor = new THREE.Color(0x38bdf8) // Blue = Payload

      if (p > 0.85) {
        // GEO Belt (35,786 km)
        r = earthRadius + 7.8 + (Math.random() - 0.5) * 0.4
        cColor = new THREE.Color(0xd946ef)
      } else if (p > 0.70) {
        // MEO Navigation Belt (20,180 km)
        r = earthRadius + 4.2 + (Math.random() - 0.5) * 0.5
        cColor = new THREE.Color(0x10b981)
      } else if (p > 0.45) {
        // Space Debris / Rocket Bodies
        cColor = new THREE.Color(0xef4444)
      }

      const inc = Math.acos(Math.random() * 2 - 1) * 0.75
      const raan = Math.random() * Math.PI * 2
      const speed = (0.004 / Math.sqrt(r / earthRadius)) * (0.8 + Math.random() * 0.4)
      const phase = Math.random() * Math.PI * 2

      pointOrbits.push({ r, inc, raan, speed, phase })

      pointPositions[i * 3 + 0] = r
      pointPositions[i * 3 + 1] = 0
      pointPositions[i * 3 + 2] = 0

      pointColors[i * 3 + 0] = cColor.r
      pointColors[i * 3 + 1] = cColor.g
      pointColors[i * 3 + 2] = cColor.b
    }

    pointGeo.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3))
    pointGeo.setAttribute("color", new THREE.BufferAttribute(pointColors, 3))

    const pointMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    })
    const orbitalCloud = new THREE.Points(pointGeo, pointMat)
    scene.add(orbitalCloud)

    // Selected Target Orbit Line
    const selOrbitGeo = new THREE.BufferGeometry()
    const selPointsCount = 96
    const selOrbitPositions = new Float32Array(selPointsCount * 3)
    selOrbitGeo.setAttribute("position", new THREE.BufferAttribute(selOrbitPositions, 3))
    const selOrbitMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      linewidth: 2
    })
    const selOrbitLine = new THREE.Line(selOrbitGeo, selOrbitMat)
    scene.add(selOrbitLine)

    // Camera Orbit Mouse Drag
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

      camera.position.x += deltaX * 0.05
      camera.position.y -= deltaY * 0.05
      camera.lookAt(0, 0, 0)
    }

    const onMouseUp = () => { isDragging = false }
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(12, Math.min(80, camera.position.z + e.deltaY * 0.03))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Propagate GPU Points Cloud Swarm
      const pArr = pointGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const o = pointOrbits[i]
        const u = simStep * o.speed + o.phase
        const x0 = o.r * Math.cos(u)
        const y0 = o.r * Math.sin(u) * Math.sin(o.inc)
        const z0 = o.r * Math.sin(u) * Math.cos(o.inc)

        pArr[i * 3 + 0] = x0 * Math.cos(o.raan) - z0 * Math.sin(o.raan)
        pArr[i * 3 + 1] = y0
        pArr[i * 3 + 2] = x0 * Math.sin(o.raan) + z0 * Math.cos(o.raan)
      }
      pointGeo.attributes.position.needsUpdate = true

      // Update Selected Target Orbit
      const selR = earthRadius + (selectedObject.apogeeKm / 6371) * earthRadius
      const selInc = (selectedObject.inclinationDeg * Math.PI) / 180
      const selPosArr = selOrbitGeo.attributes.position.array as Float32Array
      for (let j = 0; j < selPointsCount; j++) {
        const th = (j / (selPointsCount - 1)) * Math.PI * 2
        selPosArr[j * 3 + 0] = selR * Math.cos(th)
        selPosArr[j * 3 + 1] = selR * Math.sin(th) * Math.sin(selInc)
        selPosArr[j * 3 + 2] = selR * Math.sin(th) * Math.cos(selInc)
      }
      selOrbitGeo.attributes.position.needsUpdate = true

      earthMesh.rotation.y += 0.0006
      cloudsMesh.rotation.y += 0.00085

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
  }, [selectedObject, simStep])

  return (
    <div className="w-full h-full pt-16 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: CATALOG SEARCH & OBJECT ROSTER */}
      <div className="w-96 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Database className="w-4 h-4" /> Space-Track Ingest
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">ORBITAL CATALOG</h1>
          <p className="text-[10px] text-slate-500 uppercase">48,219 Tracked Resident Space Objects</p>
        </div>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search NORAD ID, Name, or COSPAR..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Regime & Object Type Filter Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {["ALL", "LEO", "MEO", "GEO"].map(regime => (
                <button
                  key={regime}
                  onClick={() => setSelectedRegime(regime)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                    selectedRegime === regime 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {regime}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "PAYLOAD", "DEBRIS", "ROCKET_BODY", "UCT"].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2 py-0.5 rounded border text-[9px] font-bold transition-all ${
                    selectedType === t 
                      ? "bg-slate-800 border-slate-600 text-white" 
                      : "bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-800"
                  }`}
                >
                  {t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Roster Stream */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredList.map(item => {
              const isSelected = item.noradId === selectedObject.noradId
              return (
                <div
                  key={item.noradId}
                  onClick={() => setSelectedObject(item)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-cyan-950/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]" 
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-[11px] truncate">{item.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                      item.type === "PAYLOAD" ? "bg-cyan-950 text-cyan-300 border border-cyan-800" :
                      item.type === "DEBRIS" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                      item.type === "ROCKET_BODY" ? "bg-amber-950 text-amber-300 border border-amber-800" :
                      "bg-indigo-950 text-indigo-300 border border-indigo-800"
                    }`}>
                      {item.type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>NORAD #{item.noradId}</span>
                    <span>{item.country}</span>
                    <span className="text-cyan-400 font-bold">{item.regime} ({item.apogeeKm.toLocaleString()} km)</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sync Status Banner */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold">SPACE-TRACK 18TH SDS LIVE</span>
            </div>
            <span className="text-slate-500 font-mono">EPOCH: 2026-306</span>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS 48K OBJECT SWARM & SELECTION HUD */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Floating Target Dossier */}
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Custodial Orbit State // High-Precision SGP4 Ephemeris
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              {selectedObject.name}
            </span>
            <span className="text-cyan-400 text-xs font-bold">
              [NORAD #{selectedObject.noradId} // {selectedObject.intlDesig}]
            </span>
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px]">
            <span className="text-emerald-400">PERIGEE: {selectedObject.perigeeKm.toLocaleString()} km</span>
            <span className="text-cyan-400">APOGEE: {selectedObject.apogeeKm.toLocaleString()} km</span>
            <span className="text-amber-400">INCLINATION: {selectedObject.inclinationDeg}°</span>
            <span className="text-rose-400">PERIOD: {selectedObject.periodMin} MIN</span>
          </div>
        </div>

        {/* 3D Canvas Mount */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Status Ribbon */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Orbit className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">ACTIVE CATALOG DENSITY</span>
              <span className="text-white font-bold text-xs">
                48,219 TRACKED RSOs (2,800 GPU ACCELERATED PARTICLES)
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">RADAR CROSS SECTION (RCS)</span>
            <span className="text-amber-400 font-bold text-sm">{selectedObject.rcsM2} m² ({(10 * Math.log10(Math.max(0.01, selectedObject.rcsM2))).toFixed(1)} dBsm)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">ATMOSPHERIC DRAG DECAY</span>
            <span className={`text-sm font-bold ${selectedObject.decayRisk === "HIGH_DRAG" ? "text-rose-400" : "text-emerald-400"}`}>
              {selectedObject.decayRisk}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">SPACE SURVEILLANCE CUSTODY</span>
            <span className="text-cyan-400 font-bold text-sm">SSN RADAR / GEODSS</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SGP4 ORBITAL ELEMENTS & EXPORT */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Object Telemetry
        </h2>

        <div className="space-y-5">
          {/* SGP4 Elements Table */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Orbital Elements (OEM)</span>
              <span className="text-cyan-400 font-bold">CCSDS COMPLIANT</span>
            </div>

            <div className="flex justify-between"><span className="text-slate-500">NORAD Catalog:</span><span className="text-white font-bold">#{selectedObject.noradId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">COSPAR ID:</span><span className="text-slate-300 font-bold">{selectedObject.intlDesig}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Origin / Owner:</span><span className="text-cyan-400 font-bold">{selectedObject.country}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Launch Year:</span><span className="text-white">{selectedObject.launchYear}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mean Motion (n):</span><span className="text-amber-400 font-bold">{(1440 / selectedObject.periodMin).toFixed(4)} rev/day</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Orbital Speed:</span><span className="text-emerald-400 font-bold">{(Math.sqrt(3.986e5 / (6371 + (selectedObject.perigeeKm + selectedObject.apogeeKm) / 2))).toFixed(2)} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Radar Cross Section:</span><span className="text-white">{selectedObject.rcsM2} m²</span></div>
          </div>

          {/* Export TLE / OEM Action Box */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Telemetry Export</span>
              <span className="text-emerald-400 font-bold">AUTHENTICATED</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Generate authenticated CCSDS Orbit Ephemeris Message (OEM) and Two-Line Element (TLE) state vectors for direct ground-station antenna steering.
            </p>

            <button
              onClick={handleExportOem}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
            >
              {exportedStatus ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
              <span>{exportedStatus ? "EXPORTED OEM FILE" : "EXPORT CCSDS OEM / TLE"}</span>
            </button>
          </div>

          {/* USSF Space Command Custody Fact */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 pb-1.5">
              18th Space Defense Squadron
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Orbital state vectors are refreshed through the USSF Space Surveillance Network mesh. Millimeter-wave radar metric tracks continuously shrink target covariance volumes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
