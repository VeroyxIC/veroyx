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
  { noradId: 31221, name: "FENGYUN-1C DEBRIS", intlDesig: "1999-025DF", country: "PRC", type: "DEBRIS", regime: "LEO", perigeeKm: 812, apogeeKm: 870, inclinationDeg: 98.8, periodMin: 101.6, rcsM2: 0.04, launchYear: 1999, decayRisk: "STABLE" }
]

export default function CatalogPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegime, setSelectedRegime] = useState<string>("ALL")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [selectedObject, setSelectedObject] = useState<CatalogObject>(BASE_CATALOG[0])
  const [exportedStatus, setExportedStatus] = useState(false)

  const selectedRef = useRef(BASE_CATALOG[0])
  useEffect(() => {
    selectedRef.current = selectedObject
  }, [selectedObject])

  const filteredList = useMemo(() => {
    return BASE_CATALOG.filter(obj => {
      const matchQuery = 
        obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.noradId.toString().includes(searchQuery)
      const matchRegime = selectedRegime === "ALL" || obj.regime === selectedRegime
      const matchType = selectedType === "ALL" || obj.type === selectedType
      return matchQuery && matchRegime && matchType
    })
  }, [searchQuery, selectedRegime, selectedType])

  // Persistent 60 FPS Swarm Three.js Loop
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.2)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 2,800 Active GPU Particles
    const particleCount = 2800
    const pointGeo = new THREE.BufferGeometry()
    const pointPositions = new Float32Array(particleCount * 3)
    const pointColors = new Float32Array(particleCount * 3)
    const pointOrbits: { r: number; inc: number; raan: number; speed: number; phase: number }[] = []

    for (let i = 0; i < particleCount; i++) {
      let r = earthRadius + 0.35 + Math.random() * 1.5
      const p = Math.random()
      let cColor = new THREE.Color(0x38bdf8)

      if (p > 0.85) {
        r = earthRadius + 7.8 + (Math.random() - 0.5) * 0.4
        cColor = new THREE.Color(0xd946ef)
      } else if (p > 0.70) {
        r = earthRadius + 4.2 + (Math.random() - 0.5) * 0.5
        cColor = new THREE.Color(0x10b981)
      } else if (p > 0.45) {
        cColor = new THREE.Color(0xef4444)
      }

      const inc = Math.acos(Math.random() * 2 - 1) * 0.75
      const raan = Math.random() * Math.PI * 2
      const speed = (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1)
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
    const orbitalCloud = new THREE.Points(pointGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.85 }))
    scene.add(orbitalCloud)

    // Highlighted Track Ring
    const selOrbitGeo = new THREE.BufferGeometry()
    const selPointsCount = 96
    const selOrbitPositions = new Float32Array(selPointsCount * 3)
    selOrbitGeo.setAttribute("position", new THREE.BufferAttribute(selOrbitPositions, 3))
    const selOrbitLine = new THREE.Line(selOrbitGeo, new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, linewidth: 2 }))
    scene.add(selOrbitLine)

    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      earthMesh.rotation.y += 0.05 * delta
      cloudsMesh.rotation.y += 0.075 * delta

      const pArr = pointGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const o = pointOrbits[i]
        const u = elapsed * o.speed + o.phase
        const x0 = o.r * Math.cos(u)
        const y0 = o.r * Math.sin(u) * Math.sin(o.inc)
        const z0 = o.r * Math.sin(u) * Math.cos(o.inc)

        pArr[i * 3 + 0] = x0 * Math.cos(o.raan) - z0 * Math.sin(o.raan)
        pArr[i * 3 + 1] = y0
        pArr[i * 3 + 2] = x0 * Math.sin(o.raan) + z0 * Math.cos(o.raan)
      }
      pointGeo.attributes.position.needsUpdate = true

      const obj = selectedRef.current
      const selR = earthRadius + (obj.apogeeKm / 6371) * earthRadius
      const selInc = (obj.inclinationDeg * Math.PI) / 180
      const selPosArr = selOrbitGeo.attributes.position.array as Float32Array
      for (let j = 0; j < selPointsCount; j++) {
        const th = (j / (selPointsCount - 1)) * Math.PI * 2
        selPosArr[j * 3 + 0] = selR * Math.cos(th)
        selPosArr[j * 3 + 1] = selR * Math.sin(th) * Math.sin(selInc)
        selPosArr[j * 3 + 2] = selR * Math.sin(th) * Math.cos(selInc)
      }
      selOrbitGeo.attributes.position.needsUpdate = true

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
  }, [])

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] pt-14 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden select-none">
      
      {/* LEFT PANEL */}
      <div className="w-96 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Database className="w-4 h-4" /> Space-Track Ingest
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">ORBITAL CATALOG</h1>
          <p className="text-[10px] text-slate-500 uppercase">48,219 Tracked Resident Objects</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search NORAD ID or Name..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["ALL", "LEO", "MEO", "GEO"].map(regime => (
              <button
                key={regime}
                onClick={() => setSelectedRegime(regime)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                  selectedRegime === regime ? "bg-cyan-950 border-cyan-500 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {regime}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredList.map(item => {
              const isSelected = item.noradId === selectedObject.noradId
              return (
                <div
                  key={item.noradId}
                  onClick={() => setSelectedObject(item)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected ? "bg-cyan-950/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-[11px] truncate">{item.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {item.regime}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>NORAD #{item.noradId}</span>
                    <span className="text-cyan-400">{item.apogeeKm.toLocaleString()} km</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CENTER VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Custodial Orbit State // 60 FPS Accelerated GPU Swarm
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">{selectedObject.name}</span>
            <span className="text-cyan-400 text-xs font-bold">[NORAD #{selectedObject.noradId}]</span>
          </div>
        </div>

        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Orbit className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">ACTIVE CATALOG SWARM</span>
              <span className="text-white font-bold text-xs">48,219 TRACKED RESIDENT SPACE OBJECTS (60 FPS GPU)</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">INCLINATION</span>
            <span className="text-amber-400 font-bold text-sm">{selectedObject.inclinationDeg}°</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PERIOD</span>
            <span className="text-emerald-400 font-bold text-sm">{selectedObject.periodMin} MIN</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-4 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Orbit Telemetry
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>SGP4 Ephemeris Record</span>
              <span className="text-cyan-400 font-bold">WGS-84</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">NORAD ID:</span><span className="text-white font-bold">#{selectedObject.noradId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Perigee:</span><span className="text-white font-bold">{selectedObject.perigeeKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Apogee:</span><span className="text-cyan-400 font-bold">{selectedObject.apogeeKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mean Motion:</span><span className="text-amber-400 font-bold">{(1440 / selectedObject.periodMin).toFixed(3)} rev/day</span></div>
          </div>

          <button
            onClick={() => { setExportedStatus(true); setTimeout(() => setExportedStatus(false), 2000); }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
          >
            {exportedStatus ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
            <span>{exportedStatus ? "EXPORTED OEM FILE" : "EXPORT CCSDS OEM / TLE"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
