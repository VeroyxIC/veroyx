"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { 
  Orbit, Gauge, Activity, Zap, Compass, RotateCcw, 
  Play, Square, Layers, ShieldCheck, Flame, Radio, 
  ArrowRight, Sparkles, Navigation, Globe, Eye 
} from "lucide-react"
import { createMilitarySatellite, createCinematicEarth, createDeepSpaceStarfield } from "@/components/three/SpaceSceneEngine"

export default function VisualizerPage() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  // Interactive Orbital Parameters
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)
  const [eccentricity, setEccentricity] = useState<number>(0.002)
  const [raanDeg, setRaanDeg] = useState<number>(45)
  const [timeWarp, setTimeWarp] = useState<number>(1)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [isBurning, setIsBurning] = useState<boolean>(false)
  const [burnDeltaVMs, setBurnDeltaVMs] = useState<number>(120)
  const [simStep, setSimStep] = useState<number>(0)

  // Physics Calculations
  const MU = 3.986004418e14
  const R_EARTH_KM = 6371

  const orbitalMetrics = useMemo(() => {
    const rM = (R_EARTH_KM + altitudeKm) * 1000
    const velocityMs = Math.sqrt(MU / rM)
    const velocityKms = velocityMs / 1000
    const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(rM, 3) / MU)
    const periodMin = periodSec / 60
    const missDistanceM = 1420 - (eccentricity * 1200)

    return {
      velocityKms: Number(velocityKms.toFixed(2)),
      periodMin: Number(periodMin.toFixed(1)),
      missDistanceM: Number(missDistanceM.toFixed(0)),
      orbitalEnergyM2S2: (-MU / (2 * rM)).toExponential(2)
    }
  }, [altitudeKm, eccentricity])

  // Execute Impulsive Burn
  const triggerBurn = () => {
    setIsBurning(true)
    setTimeout(() => {
      setIsBurning(false)
      setAltitudeKm(prev => Math.min(35786, prev + Math.round(burnDeltaVMs * 2.5)))
    }, 2800)
  }

  // Animation Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep(s => s + 1)
      }, 50)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  // 3D Three.js High-Fidelity Scene Setup
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
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.4)
    sunLight.position.set(30, 25, 20)
    scene.add(sunLight)

    // 1. Deep Space Stellar Environment
    const starfield = createDeepSpaceStarfield(1500, 700)
    scene.add(starfield)

    // 2. Cinematic Earth with Rayleigh Atmosphere Glow
    const earthRadius = 5.5
    const { earthGroup, earthMesh } = createCinematicEarth(earthRadius)
    scene.add(earthGroup)

    // 3. High-Fidelity Defense-Grade Satellite
    const { group: satGroup, plume: ionPlume } = createMilitarySatellite({ scale: 0.55 })
    scene.add(satGroup)

    // 4. Dynamic Orbital Path Line
    const orbitPointsCount = 128
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPositions = new Float32Array(orbitPointsCount * 3)
    orbitGeo.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3))

    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65,
      linewidth: 2
    })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    scene.add(orbitLine)

    // Mouse Drag Rotation Controls
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

      // Compute Orbital Path coordinates
      const orbitScaleRadius = earthRadius + (altitudeKm / 6371) * earthRadius
      const incRad = (inclinationDeg * Math.PI) / 180
      const raanRad = (raanDeg * Math.PI) / 180

      const posArr = orbitGeo.attributes.position.array as Float32Array
      for (let i = 0; i < orbitPointsCount; i++) {
        const theta = (i / (orbitPointsCount - 1)) * Math.PI * 2
        const rCurrent = orbitScaleRadius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(theta))

        const x0 = rCurrent * Math.cos(theta)
        const y0 = rCurrent * Math.sin(theta) * Math.sin(incRad)
        const z0 = rCurrent * Math.sin(theta) * Math.cos(incRad)

        posArr[i * 3 + 0] = x0 * Math.cos(raanRad) - z0 * Math.sin(raanRad)
        posArr[i * 3 + 1] = y0
        posArr[i * 3 + 2] = x0 * Math.sin(raanRad) + z0 * Math.cos(raanRad)
      }
      orbitGeo.attributes.position.needsUpdate = true

      // Move Satellite along orbital track
      const t = simStep * 0.01 * timeWarp
      const currentTheta = t % (Math.PI * 2)
      const rSat = orbitScaleRadius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(currentTheta))

      const xSat0 = rSat * Math.cos(currentTheta)
      const ySat0 = rSat * Math.sin(currentTheta) * Math.sin(incRad)
      const zSat0 = rSat * Math.sin(currentTheta) * Math.cos(incRad)

      const finalSatX = xSat0 * Math.cos(raanRad) - zSat0 * Math.sin(raanRad)
      const finalSatY = ySat0
      const finalSatZ = xSat0 * Math.sin(raanRad) + zSat0 * Math.cos(raanRad)

      satGroup.position.set(finalSatX, finalSatY, finalSatZ)
      satGroup.lookAt(0, 0, 0)

      // Thruster Plume Animation
      if (isBurning) {
        ionPlume.visible = true
        const plumeScale = 1.8 + Math.sin(simStep * 0.8) * 0.4
        ionPlume.scale.set(plumeScale, plumeScale * 1.5, plumeScale)
        orbitMat.color.setHex(0xf59e0b)
      } else {
        ionPlume.visible = true
        ionPlume.scale.set(1.0, 1.0, 1.0)
        orbitMat.color.setHex(0x00f0ff)
      }

      earthMesh.rotation.y += 0.0006 * timeWarp

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
  }, [altitudeKm, inclinationDeg, eccentricity, raanDeg, timeWarp, isBurning, simStep])

  return (
    <div className="w-full h-full pt-16 px-6 pb-6 flex bg-[#01030a] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: ORBITAL MECHANICS TELEMETRY */}
      <div className="w-80 h-full flex flex-col pr-6 border-r border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Orbit className="w-4 h-4" /> Flight Dynamics Engine
          </div>
          <h1 className="text-lg font-black text-white tracking-wider">ORBITAL PROPAGATOR</h1>
          <p className="text-[10px] text-slate-500 uppercase">J2/J4 Zonal Geopotential Matrix</p>
        </div>

        <div className="space-y-5">
          {/* Live Flight Telemetry */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Keplerian State Vector</span>
              <span className="text-emerald-400 font-bold">LOCKED</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">ALTITUDE:</span>
              <span className="text-white font-bold text-sm">{altitudeKm.toLocaleString()} KM</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">ORBITAL SPEED:</span>
              <span className="text-cyan-400 font-bold text-sm">{orbitalMetrics.velocityKms} KM/S</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">ORBIT PERIOD:</span>
              <span className="text-emerald-400 font-bold">{orbitalMetrics.periodMin} MIN</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">SPECIFIC ENERGY:</span>
              <span className="text-slate-300 font-bold">{orbitalMetrics.orbitalEnergyM2S2} M²/S²</span>
            </div>
          </div>

          {/* Interactive Trajectory Sliders */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Orbital Plane Adjuster</span>
              <span className="text-cyan-400 font-bold">LIVE REAL-TIME</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">SEMI-MAJOR AXIS (ALT):</span>
                <span className="text-white font-bold">{altitudeKm} km</span>
              </div>
              <input 
                type="range" min="200" max="35786" step="50"
                value={altitudeKm}
                onChange={e => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>LEO (200km)</span>
                <span>MEO (20k)</span>
                <span>GEO (35.7k)</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">INCLINATION (i):</span>
                <span className="text-cyan-300 font-bold">{inclinationDeg}°</span>
              </div>
              <input 
                type="range" min="0" max="98.5" step="0.5"
                value={inclinationDeg}
                onChange={e => setInclinationDeg(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">ECCENTRICITY (e):</span>
                <span className="text-amber-400 font-bold">{eccentricity.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0" max="0.5" step="0.005"
                value={eccentricity}
                onChange={e => setEccentricity(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Standard Regimes</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button 
                onClick={() => { setAltitudeKm(550); setInclinationDeg(51.6); setEccentricity(0.001); }}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 font-bold"
              >
                ISS (LEO)
              </button>
              <button 
                onClick={() => { setAltitudeKm(20180); setInclinationDeg(55.0); setEccentricity(0.01); }}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 font-bold"
              >
                GPS (MEO)
              </button>
              <button 
                onClick={() => { setAltitudeKm(35786); setInclinationDeg(0.0); setEccentricity(0.0001); }}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 font-bold"
              >
                CLARKE (GEO)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 3D THREE.JS PHOTOREALISTIC VIEWPORT */}
      <div className="flex-1 h-full relative flex flex-col">
        {/* Top Tactical Overlay */}
        <div className="absolute top-4 left-6 z-10 font-mono pointer-events-none">
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            3D Ephemeris Tracking Engine // USSF Delta-2 Architecture
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              VXO-ALPHA TACTICAL RECON
            </span>
            <span className="text-cyan-400 text-xs font-bold">
              [MIL-SPEC GOLD MLI FOIL // GAAS TRIPLE JUNCTION]
            </span>
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px]">
            <span className="text-emerald-400">STATUS: ACTIVE FLIGHT CUSTODY</span>
            <span className="text-cyan-400">PROPULSION: XENON HALL-EFFECT</span>
            <span className="text-amber-400">OPTICS: 0.42m RECON TELESCOPE</span>
          </div>
        </div>

        {/* Viewport Control Instructions */}
        <div className="absolute top-4 right-6 z-10 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 backdrop-blur-md pointer-events-none flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>DRAG: ORBIT CAMERA | SCROLL: ZOOM</span>
        </div>

        {/* 3D Canvas Mount */}
        <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Status Ribbon */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBurning ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
            <div>
              <span className="text-slate-500 block text-[9px]">ATTITUDE STATUS</span>
              <span className="text-white font-bold text-xs">
                {isBurning ? "BURNING IMPULSIVE PROGRADE THRUST (+120 M/S)" : "NADIR-POINTED EARTH OBSERVATION LOCK"}
              </span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CONJUNCTION MISS DISTANCE</span>
            <span className="text-emerald-400 font-bold text-sm">±{orbitalMetrics.missDistanceM} METERS (CLEAR)</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">GROUND TRACK COVERAGE</span>
            <span className="text-cyan-400 font-bold text-sm">GLOBAL MULTI-PASS</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">CROSS-LINK OISL</span>
            <span className="text-emerald-400 font-bold text-sm">100 GBPS LOCKED</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: MANEUVER PLANNER & IMPULSIVE BURNS */}
      <div className="w-80 h-full flex flex-col pl-6 border-l border-slate-800/80 overflow-y-auto font-mono text-xs select-none">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2 text-xs">
          <Flame className="w-4 h-4 text-amber-500" /> Maneuver Control
        </h2>

        <div className="space-y-5">
          {/* Delta-V Burn Controller */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Hohmann Orbit Injection</span>
              <span className="text-amber-400 font-bold">READY</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">IMPULSIVE BURN (Δv):</span>
                <span className="text-amber-400 font-bold">+{burnDeltaVMs} m/s</span>
              </div>
              <input 
                type="range" min="10" max="600" step="10"
                value={burnDeltaVMs}
                onChange={e => setBurnDeltaVMs(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button
              onClick={triggerBurn}
              disabled={isBurning}
              className={`w-full py-3 rounded-xl font-bold tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
                isBurning 
                  ? "bg-amber-600 text-white animate-pulse" 
                  : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{isBurning ? "FIRING ION THRUSTER..." : "EXECUTE IMPULSIVE BURN"}</span>
            </button>
          </div>

          {/* Time Warp Simulation Rate */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 flex justify-between">
              <span>Simulation Clock Rate</span>
              <span className="text-cyan-400 font-bold">{timeWarp}x</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 5, 10].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeWarp(w)}
                  className={`py-1.5 rounded text-[10px] font-bold border transition-all ${
                    timeWarp === w 
                      ? "bg-cyan-950 border-cyan-500 text-cyan-300" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  }`}
                >
                  {w}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2"
            >
              {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "PAUSE ORBIT PROPAGATION" : "RESUME PROPAGATION"}</span>
            </button>
          </div>

          {/* Spacecraft Health Diagnostics */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Spacecraft Bus Health</div>
            <div className="flex justify-between"><span className="text-slate-500">Avionics Bus Temp:</span><span className="text-emerald-400 font-bold">+18.5°C</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Solar Array Yield:</span><span className="text-cyan-400 font-bold">4.2 kW (GaAs)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Battery Reserve:</span><span className="text-white font-bold">98.5% (Li-Ion)</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Xenon Fuel Mass:</span><span className="text-amber-400 font-bold">42.8 kg</span></div>
            <div className="flex justify-between font-black text-sm border-t border-slate-700 pt-1.5"><span className="text-white">SUBSYSTEM STATUS:</span><span className="text-emerald-400">ALL GREEN</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
