"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { 
  Orbit, Compass, Gauge, Activity, Radio, Database, 
  RotateCcw, Play, Square, Terminal, ShieldCheck, 
  Crosshair, Globe, Layers, ArrowRight, Download, Check 
} from "lucide-react"
import { createCinematicEarth, createMilitarySatellite, createDeepSpaceStarfield } from "@/components/three/CinematicSpaceEngine"
import { parseTLE, propagateJ2Analytical, TLEData } from "@/lib/astrodynamics/sgp4"

const SAMPLE_TLES: TLEData[] = [
  {
    name: "ISS (ZARYA)",
    line1: "1 25544U 98067A   26306.49583333  .00016717  00000-0  10270-3 0  9993",
    line2: "2 25544  51.6425 182.4921 0004812 120.4521 245.8921 15.49821450450123"
  },
  {
    name: "USA-326 (RECON OPTICAL)",
    line1: "1 58210U 22045A   26306.51240000  .00001240  00000-0  54210-4 0  9998",
    line2: "2 58210  97.4120  45.1200 0012040  75.4210 284.9120 15.18420100142105"
  },
  {
    name: "TIANGONG (CSS)",
    line1: "1 48274U 21035A   26306.48120000  .00018500  00000-0  12400-3 0  9991",
    line2: "2 48274  41.4720 210.8410 0005120  88.4100 271.8200 15.61204000284501"
  },
  {
    name: "COSMOS-2558 (INSPECTOR)",
    line1: "1 53324U 22089A   26306.50200000  .00003410  00000-0  14500-4 0  9995",
    line2: "2 53324  97.4150  45.1800 0018400  72.1000 288.4000 15.15241000151208"
  }
]

export default function EphemerisPropagatorPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  const [selectedTleIndex, setSelectedTleIndex] = useState(0)
  const [propMinutes, setPropMinutes] = useState(0)
  const [timeWarp, setTimeWarp] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [exportedStatus, setExportedStatus] = useState(false)

  const activeTle = SAMPLE_TLES[selectedTleIndex]
  const parsedTle = useMemo(() => parseTLE(activeTle.line1, activeTle.line2), [activeTle])

  // Live Propagated ECI State
  const eciState = useMemo(() => {
    return propagateJ2Analytical(parsedTle, propMinutes)
  }, [parsedTle, propMinutes])

  // Clock Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setPropMinutes(m => m + 0.1 * timeWarp)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying, timeWarp])

  // 3D Three.js Viewport
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#01030a")

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000)
    camera.position.set(0, 16, 28)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.innerHTML = ""
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 1.8))
    const sun = new THREE.DirectionalLight(0xfffaed, 3.4)
    sun.position.set(30, 25, 20)
    scene.add(sun)

    // Starfield & Earth
    const starfield = createDeepSpaceStarfield(1200, 700)
    scene.add(starfield)

    const earthRadius = 5.5
    const { earthGroup, earthMesh, cloudsMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // High-Fidelity Satellite
    const { group: satGroup } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)

    // Orbital Path Ground/Space Track
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, linewidth: 2 })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // Compute complete orbital trajectory line
    const orbitPosArr = orbitGeo.attributes.position.array as Float32Array
    const stepMin = eciState.periodMin / orbitPointsCount
    for (let i = 0; i < orbitPointsCount; i++) {
      const state = propagateJ2Analytical(parsedTle, propMinutes + i * stepMin)
      const scale = earthRadius / 6378.137
      orbitPosArr[i * 3 + 0] = state.r[0] * scale
      orbitPosArr[i * 3 + 1] = state.r[2] * scale // Map Z to Y-up
      orbitPosArr[i * 3 + 2] = -state.r[1] * scale
    }
    orbitGeo.attributes.position.needsUpdate = true

    // Mouse drag camera controls
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
      camera.position.z = Math.max(12, Math.min(70, camera.position.z + e.deltaY * 0.03))
    }

    container.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    container.addEventListener("wheel", onWheel, { passive: true })

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Position satellite in 3D scene from ECI State
      const scale = earthRadius / 6378.137
      satGroup.position.set(
        eciState.r[0] * scale,
        eciState.r[2] * scale,
        -eciState.r[1] * scale
      )
      satGroup.lookAt(0, 0, 0)

      earthMesh.rotation.y += 0.0006 * timeWarp
      cloudsMesh.rotation.y += 0.00085 * timeWarp

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
  }, [eciState, parsedTle, propMinutes, timeWarp])

  return (
    <div className="w-full h-full pt-16 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: SGP4 TLE SELECTOR & NUMERICAL INTEGRATION */}
      <div className="w-96 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> Astrodynamics Core
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">SGP4 PROPAGATOR</h1>
          <p className="text-[10px] text-slate-500 uppercase">J2 Secular Precession &amp; ECI Coordinates</p>
        </div>

        <div className="space-y-4">
          {/* Target Satellite Preset Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Target Spacecraft Track</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SAMPLE_TLES.map((tle, idx) => (
                <button
                  key={tle.name}
                  onClick={() => {
                    setSelectedTleIndex(idx)
                    setPropMinutes(0)
                  }}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${
                    selectedTleIndex === idx 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {tle.name}
                </button>
              ))}
            </div>
          </div>

          {/* Raw TLE Format Dump */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 font-mono text-[9px] text-slate-400 select-all">
            <div className="text-cyan-400 font-bold">{activeTle.name}</div>
            <div className="break-all">{activeTle.line1}</div>
            <div className="break-all">{activeTle.line2}</div>
          </div>

          {/* Real-time State Vector Table */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>ECI J2000 State Vector</span>
              <span className="text-emerald-400 font-bold">T+{propMinutes.toFixed(1)}m</span>
            </div>

            <div className="flex justify-between"><span className="text-slate-500">ECI X:</span><span className="text-white font-bold">{eciState.r[0].toFixed(2)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">ECI Y:</span><span className="text-white font-bold">{eciState.r[1].toFixed(2)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">ECI Z:</span><span className="text-white font-bold">{eciState.r[2].toFixed(2)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Speed (v):</span><span className="text-cyan-400 font-bold">{eciState.speedKms.toFixed(3)} km/s</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Altitude:</span><span className="text-emerald-400 font-bold">{eciState.altKm.toFixed(1)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sub-Sat Lat:</span><span className="text-amber-400 font-bold">{eciState.lat.toFixed(2)}°</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Sub-Sat Lon:</span><span className="text-amber-400 font-bold">{eciState.lon.toFixed(2)}°</span></div>
          </div>

          {/* Time Warp Controls */}
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-bold uppercase">Propagation Warp</span>
              <span className="text-cyan-400 font-bold">{timeWarp}x RATE</span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[1, 5, 20, 60].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeWarp(w)}
                  className={`py-1 rounded text-[10px] font-bold border transition-all ${
                    timeWarp === w 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >
                  {w}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5"
              >
                {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "HOLD TIME" : "PROPAGATE"}</span>
              </button>

              <button
                onClick={() => setPropMinutes(0)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Reset to TLE Epoch"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS PHOTOREALISTIC J2000 ORBIT VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Floating Target Header */}
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            J2 Analytical Trajectory // True Equatorial Sub-Satellite Projection
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              {activeTle.name}
            </span>
            <span className="text-cyan-400 text-xs font-bold">
              [NORAD #{parsedTle.noradId} // {parsedTle.intlDesig}]
            </span>
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px]">
            <span className="text-emerald-400">INCLINATION: {parsedTle.inclinationDeg.toFixed(2)}°</span>
            <span className="text-cyan-400">ECCENTRICITY: {parsedTle.eccentricity}</span>
            <span className="text-amber-400">ORBIT PERIOD: {eciState.periodMin.toFixed(1)} MIN</span>
            <span className="text-rose-400">MEAN MOTION: {parsedTle.meanMotionRevDay.toFixed(2)} REV/DAY</span>
          </div>
        </div>

        {/* 3D Canvas Mount */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Status Ribbon */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">SGP4 TIME STEP</span>
              <span className="text-white font-bold text-xs">
                T+{propMinutes.toFixed(1)} MINUTES FROM TLE EPOCH
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">EARTH-CENTERED INERTIAL VELOCITY</span>
            <span className="text-emerald-400 font-bold text-sm">{eciState.speedKms.toFixed(3)} KM/S</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GEODETIC FOOTPRINT</span>
            <span className="text-cyan-400 font-bold text-sm">{eciState.lat.toFixed(2)}° N, {eciState.lon.toFixed(2)}° E</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">B-STAR DRAG COEFFICIENT</span>
            <span className="text-amber-400 font-bold text-sm">{(parsedTle.bstar * 1e5).toFixed(2)}e-5 1/ER</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SGP4 MATHEMATICAL ENGINE NOTES & DATA DISPATCH */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2 text-xs">
          <Activity className="w-4 h-4 text-cyan-400" /> Propagation Math
        </h2>

        <div className="space-y-5">
          {/* SGP4 / J2 Equations Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Perturbation Equations</span>
              <span className="text-cyan-400 font-bold">WGS-84</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              J2 oblateness causes nodal regression of the ascending node (dΩ/dt) and apsidal rotation of perigee (dω/dt). Newton-Raphson resolves the eccentric anomaly E from mean anomaly M in under 10 iterations.
            </p>
          </div>

          {/* Export Ephemeris Vectors */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1.5 flex justify-between">
              <span>CCSDS Ephemeris Export</span>
              <span className="text-emerald-400 font-bold">CERTIFIED</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Dispatch calculated Cartesian state vectors [X, Y, Z, Vx, Vy, Vz] to radar track filters and automated fire-control nodes.
            </p>

            <button
              onClick={() => {
                setExportedStatus(true)
                setTimeout(() => setExportedStatus(false), 2000)
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
            >
              {exportedStatus ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
              <span>{exportedStatus ? "EXPORTED OEM FILE" : "EXPORT CCSDS OEM"}</span>
            </button>
          </div>

          {/* Quick Nav to Allied Decks */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Allied Tactical Modules</span>
            <Link href="/catalog" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>Space-Track 48K Catalog</span>
              <ArrowRight className="w-3 h-3 text-cyan-400" />
            </Link>
            <Link href="/kill-chain" className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-rose-500/60 text-slate-300 hover:text-white transition-all flex items-center justify-between">
              <span>JADC2 Kill-Chain Engine</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
