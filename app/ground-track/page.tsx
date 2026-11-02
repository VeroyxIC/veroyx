"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Globe, MapPin, Activity, Compass, Radio, Play, Square, 
  RotateCcw, Orbit, Crosshair, Layers, ShieldCheck, Eye, Clock 
} from "lucide-react"

type OrbitPreset = "SSO_OPTICAL" | "ISS_INCLINED" | "MOLNIYA_HEO" | "POLAR_RADAR"

interface PresetSpec {
  name: string
  altitudeKm: number
  inclinationDeg: number
  eccentricity: number
  regime: string
  colorHex: string
}

const PRESETS: Record<OrbitPreset, PresetSpec> = {
  "SSO_OPTICAL": {
    name: "VXO-1 Recon (Sun-Synchronous)",
    altitudeKm: 550,
    inclinationDeg: 97.6,
    eccentricity: 0.001,
    regime: "LEO SSO (10:30 LTDN)",
    colorHex: "#38bdf8"
  },
  "ISS_INCLINED": {
    name: "Station Ops (Mid-Inclination)",
    altitudeKm: 420,
    inclinationDeg: 51.6,
    eccentricity: 0.0005,
    regime: "LEO Mid-Inclination",
    colorHex: "#10b981"
  },
  "MOLNIYA_HEO": {
    name: "Molniya High-Latitude Comm",
    altitudeKm: 1200, // Perigee representation
    inclinationDeg: 63.4,
    eccentricity: 0.65,
    regime: "HEO Critical Inclination",
    colorHex: "#f59e0b"
  },
  "POLAR_RADAR": {
    name: "Aegis-SAR (Polar Swath)",
    altitudeKm: 680,
    inclinationDeg: 90.0,
    eccentricity: 0.0015,
    regime: "LEO Pure Polar",
    colorHex: "#d946ef"
  }
}

interface GroundStation {
  id: string
  name: string
  lat: number
  lon: number
  maskDeg: number
}

const STATIONS: GroundStation[] = [
  { id: "SGS", name: "Svalbard (KSAT)", lat: 78.2, lon: 15.4, maskDeg: 5 },
  { id: "WPS", name: "Wallops (NASA)", lat: 37.9, lon: -75.5, maskDeg: 5 },
  { id: "KRN", name: "Kiruna (ESA)", lat: 67.9, lon: 20.9, maskDeg: 5 },
  { id: "TRL", name: "Troll (Antarctica)", lat: -72.0, lon: 2.5, maskDeg: 5 },
  { id: "SGP", name: "Singapore Gateway", lat: 1.3, lon: 103.8, maskDeg: 5 }
]

export default function GroundTrackPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [preset, setPreset] = useState<OrbitPreset>("SSO_OPTICAL")
  const [altitudeKm, setAltitudeKm] = useState(550)
  const [inclinationDeg, setInclinationDeg] = useState(97.6)
  const [simTimeSec, setSimTimeSec] = useState(0)
  const [timeScale, setTimeScale] = useState(30) // 30x real-time speed
  const [isPlaying, setIsPlaying] = useState(true)

  const spec = PRESETS[preset]

  // Physical Orbit Calculations
  const EARTH_RADIUS_KM = 6371
  const MU = 398600.4418
  const semiMajorAxisKm = EARTH_RADIUS_KM + altitudeKm
  const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / MU)
  const orbitPeriodMin = orbitPeriodSec / 60
  const meanMotionRadSec = (2 * Math.PI) / orbitPeriodSec

  // Earth Rotation Rate (rad/sec)
  const EARTH_ROTATION_RAD_SEC = (2 * Math.PI) / 86164.0905

  // J2 Perturbation Nodal Regression Rate (deg/day)
  // dOmega/dt = -9.9639 * (R_E / a)^3.5 * cos(i)
  const j2PrecessionDegDay = -9.9639 * Math.pow(EARTH_RADIUS_KM / semiMajorAxisKm, 3.5) * Math.cos((inclinationDeg * Math.PI) / 180)
  const j2PrecessionRadSec = (j2PrecessionDegDay * (Math.PI / 180)) / 86400

  // Current Sub-Satellite Coordinates
  const currentMeanAnomaly = (meanMotionRadSec * simTimeSec) % (2 * Math.PI)
  const incRad = (inclinationDeg * Math.PI) / 180
  
  // Spherical Trigonometry for Sub-Satellite point:
  // sin(lat) = sin(inc) * sin(u)
  const currentLatRad = Math.asin(Math.sin(incRad) * Math.sin(currentMeanAnomaly))
  const currentLatDeg = (currentLatRad * 180) / Math.PI

  // tan(lon_orbit) = cos(inc) * tan(u)
  const lonOrbitRad = Math.atan2(Math.cos(incRad) * Math.sin(currentMeanAnomaly), Math.cos(currentMeanAnomaly))
  const lonRotatedRad = lonOrbitRad - (EARTH_ROTATION_RAD_SEC - j2PrecessionRadSec) * simTimeSec
  let currentLonDeg = (((lonRotatedRad * 180) / Math.PI) % 360)
  if (currentLonDeg > 180) currentLonDeg -= 360
  if (currentLonDeg < -180) currentLonDeg += 360

  // Ground Footprint Radius (horizon visibility circle)
  // rho = arccos(R_E / (R_E + h))
  const footprintRadiusKm = EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / semiMajorAxisKm)
  const footprintRadiusDeg = (footprintRadiusKm / (2 * Math.PI * EARTH_RADIUS_KM)) * 360

  // Simulation Clock Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setSimTimeSec(t => t + timeScale)
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, timeScale])

  // Canvas 2D Mercator Map & Orbit Overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Helper: Map Lat/Lon to Canvas X/Y (Mercator Projection)
    const toCanvasX = (lon: number) => ((lon + 180) / 360) * width
    const toCanvasY = (lat: number) => ((90 - lat) / 180) * height

    // 1. Tactical Dark Grid Background
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, width, height)

    // Lat/Lon Graticules
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 0.8
    ctx.setLineDash([2, 4])

    for (let lon = -150; lon <= 180; lon += 30) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(lon), 0)
      ctx.lineTo(toCanvasX(lon), height)
      ctx.stroke()
    }
    for (let lat = -60; lat <= 80; lat += 30) {
      ctx.beginPath()
      ctx.moveTo(0, toCanvasY(lat))
      ctx.lineTo(width, toCanvasY(lat))
      ctx.stroke()
    }

    // Equator & Prime Meridian Highlight
    ctx.setLineDash([])
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, toCanvasY(0))
    ctx.lineTo(width, toCanvasY(0))
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(toCanvasX(0), 0)
    ctx.lineTo(toCanvasX(0), height)
    ctx.stroke()

    // 2. Continents Vector Outlines (Institutional Lightweight Cartography)
    ctx.strokeStyle = "#475569"
    ctx.fillStyle = "#090d16"
    ctx.lineWidth = 1.0

    const continentPolygons: [number, number][][] = [
      // North America
      [[-165, 65], [-140, 70], [-100, 72], [-65, 45], [-75, 25], [-105, 20], [-120, 35], [-165, 60], [-165, 65]],
      // South America
      [[-78, 10], [-50, -5], [-35, -5], [-55, -22], [-68, -55], [-75, -45], [-80, -5], [-78, 10]],
      // Eurasia & Africa
      [[-10, 36], [0, 52], [30, 70], [60, 72], [140, 72], [170, 65], [140, 35], [105, 10], [80, 15], [50, 25], [40, 10], [50, -10], [30, -34], [18, -34], [10, 5], [-15, 12], [-10, 36]],
      // Australia
      [[115, -22], [130, -12], [150, -22], [150, -38], [135, -35], [115, -34], [115, -22]],
      // Antarctica
      [[-180, -78], [180, -78], [180, -88], [-180, -88], [-180, -78]]
    ]

    continentPolygons.forEach(poly => {
      ctx.beginPath()
      poly.forEach(([lon, lat], i) => {
        const x = toCanvasX(lon)
        const y = toCanvasY(lat)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    })

    // 3. Ground Station Elevation Masks (Visibility Circles)
    STATIONS.forEach(gs => {
      const gX = toCanvasX(gs.lon)
      const gY = toCanvasY(gs.lat)
      const rPx = (footprintRadiusDeg / 360) * width

      ctx.strokeStyle = "#38bdf8"
      ctx.fillStyle = "rgba(56, 189, 248, 0.04)"
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(gX, gY, Math.min(rPx, 140), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])

      // Station Marker
      ctx.fillStyle = "#38bdf8"
      ctx.beginPath()
      ctx.arc(gX, gY, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#94a3b8"
      ctx.font = "9px monospace"
      ctx.fillText(gs.id, gX + 6, gY - 4)
    })

    // 4. Ground Track Orbit Curves (Previous orbit + Current + Next 2 orbits)
    const drawOrbitTrace = (startT: number, endT: number, color: string, dash: number[] = []) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      ctx.setLineDash(dash)

      let prevX: number | null = null
      let prevY: number | null = null

      ctx.beginPath()
      for (let t = startT; t <= endT; t += 30) {
        const m = (meanMotionRadSec * t) % (2 * Math.PI)
        const latR = Math.asin(Math.sin(incRad) * Math.sin(m))
        const latD = (latR * 180) / Math.PI

        const lonOR = Math.atan2(Math.cos(incRad) * Math.sin(m), Math.cos(m))
        const lonRR = lonOR - (EARTH_ROTATION_RAD_SEC - j2PrecessionRadSec) * t
        let lonD = (((lonRR * 180) / Math.PI) % 360)
        if (lonD > 180) lonD -= 360
        if (lonD < -180) lonD += 360

        const x = toCanvasX(lonD)
        const y = toCanvasY(latD)

        // Split line on antimeridian wrap (180 to -180)
        if (prevX !== null && Math.abs(x - prevX) > width * 0.5) {
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, y)
        } else if (prevX === null) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        prevX = x
        prevY = y
      }
      ctx.stroke()
    }

    // Past 1 orbit (Dim trace)
    drawOrbitTrace(simTimeSec - orbitPeriodSec, simTimeSec, "rgba(56, 189, 248, 0.25)", [2, 3])
    // Current & Next 2 Orbits (Bold bright trace)
    drawOrbitTrace(simTimeSec, simTimeSec + orbitPeriodSec * 2, spec.colorHex, [])

    // 5. Sub-Satellite Point Indicator & Nadir Sensor Swath Footprint
    const satX = toCanvasX(currentLonDeg)
    const satY = toCanvasY(currentLatDeg)
    const satRPx = (footprintRadiusDeg / 360) * width

    // Sensor Ground Footprint Circle
    ctx.strokeStyle = spec.colorHex
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(satX, satY, Math.min(satRPx, 120), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Spacecraft Nadir Crosshair
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(satX - 8, satY)
    ctx.lineTo(satX + 8, satY)
    ctx.moveTo(satX, satY - 8)
    ctx.lineTo(satX, satY + 8)
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(satX, satY, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Spacecraft Tag
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 10px monospace"
    ctx.fillText("VXO-1", satX + 12, satY - 6)

  }, [currentLatDeg, currentLonDeg, footprintRadiusDeg, simTimeSec, spec, altitudeKm, inclinationDeg, orbitPeriodSec, meanMotionRadSec, incRad, j2PrecessionRadSec])

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-[#020617] font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: ORBIT PRESETS & STATE VECTOR */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto font-mono text-xs">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Globe className="w-5 h-5 text-cyan-400" /> Ground Track
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">
            2D Mercator Ephemeris &amp; J2 Nodal Precession
          </p>
        </div>

        <div className="space-y-6">
          {/* Preset Selector */}
          <div className="space-y-3">
            <label className="text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" /> Spacecraft Target Preset
            </label>
            <div className="space-y-2">
              {(["SSO_OPTICAL", "ISS_INCLINED", "MOLNIYA_HEO", "POLAR_RADAR"] as OrbitPreset[]).map(p => {
                const item = PRESETS[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setPreset(p)
                      setAltitudeKm(item.altitudeKm)
                      setInclinationDeg(item.inclinationDeg)
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      preset === p 
                        ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.regime}</div>
                    </div>
                    <div className="font-mono text-right text-[10px]">
                      <span className="text-slate-500 block">ALTITUDE</span>
                      <span className="text-cyan-400 font-bold">{item.altitudeKm} km</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Orbital Parameter Tuning */}
          <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Keplerian Orbital Elements
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ALTITUDE (SEMI-MAJOR AXIS):</span>
                <span className="text-cyan-400 font-bold">{altitudeKm} km</span>
              </div>
              <input 
                type="range" min="300" max="2000" step="25"
                value={altitudeKm}
                onChange={e => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">INCLINATION:</span>
                <span className="text-emerald-400 font-bold">{inclinationDeg.toFixed(1)}°</span>
              </div>
              <input 
                type="range" min="0" max="120" step="0.5"
                value={inclinationDeg}
                onChange={e => setInclinationDeg(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">SIMULATION ACCELERATION:</span>
                <span className="text-amber-400 font-bold">{timeScale}x REAL-TIME</span>
              </div>
              <input 
                type="range" min="1" max="120" step="5"
                value={timeScale}
                onChange={e => setTimeScale(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Timeline Playback Controls */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Simulation Clock</span>
              <span className="text-cyan-400 font-bold font-mono">
                T+{(simTimeSec / 60).toFixed(0)}m {(simTimeSec % 60).toFixed(0)}s
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlaying 
                    ? "bg-slate-800 hover:bg-slate-700 text-white" 
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                {isPlaying ? "HOLD ORBIT" : "PROPAGATE TRACK"}
              </button>

              <button
                onClick={() => setSimTimeSec(0)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Restart Ephemeris"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: 2D MERCATOR CANVAS DISPLAY */}
      <div className="flex-1 h-full relative flex flex-col">
        <div className="absolute top-6 left-6 z-10 font-mono">
          <div className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Sub-Satellite Fix (Nadir)</div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-white">
              {Math.abs(currentLatDeg).toFixed(2)}°{currentLatDeg >= 0 ? "N" : "S"},{" "}
              {Math.abs(currentLonDeg).toFixed(2)}°{currentLonDeg >= 0 ? "E" : "W"}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="text-cyan-400">PERIOD: {orbitPeriodMin.toFixed(1)} min</span>
            <span className="text-emerald-400">GROUND SPEED: {(Math.sqrt(MU / semiMajorAxisKm) * (EARTH_RADIUS_KM / semiMajorAxisKm)).toFixed(2)} km/s</span>
            <span className="text-amber-400">NODAL SHIFT: {j2PrecessionDegDay.toFixed(2)}°/day</span>
          </div>
        </div>

        <div className="flex-1 w-full p-4 flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full rounded-2xl border border-slate-800 shadow-2xl" />
        </div>

        {/* Ground Station Overlay Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl font-mono text-xs shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-500 block text-[9px]">ACTIVE FOOTPRINT DIAMETER</span>
              <span className="text-white font-bold text-sm">{(footprintRadiusKm * 2).toFixed(0)} km</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">EARTH REV RATE</span>
            <span className="text-emerald-400 font-bold text-sm">{(1440 / orbitPeriodMin).toFixed(1)} ORBITS/DAY</span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">J2 SUN-SYNC COMPLIANCE</span>
            <span className={`text-sm font-bold ${Math.abs(j2PrecessionDegDay - 0.9856) < 0.1 ? "text-emerald-400" : "text-slate-400"}`}>
              {Math.abs(j2PrecessionDegDay - 0.9856) < 0.1 ? "EXACT SUN-SYNC (0.986°/d)" : "NON-SYNCHRONOUS"}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <span className="text-slate-500 block text-[9px]">PRIMARY TRACKING NODE</span>
            <span className="text-cyan-400 font-bold text-sm">SGS SVALBARD (78.2°N)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SATELLITE PASS EPHEMERIS */}
      <div className="w-1/4 h-full pl-6 border-l border-slate-800 overflow-y-auto font-mono text-xs">
        <h2 className="text-slate-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Ephemeris Vectors
        </h2>

        <div className="space-y-6">
          {/* Orbit State Summary */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2 text-[11px]">
            <div className="text-slate-400 font-bold uppercase border-b border-slate-800 pb-2 mb-2">Orbital State Vector</div>
            <div className="flex justify-between"><span className="text-slate-500">Semi-Major Axis (a):</span><span className="text-white font-bold">{semiMajorAxisKm.toLocaleString()} km</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Eccentricity (e):</span><span className="text-cyan-400 font-bold">{spec.eccentricity.toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Inclination (i):</span><span className="text-white font-bold">{inclinationDeg.toFixed(2)}°</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mean Motion (n):</span><span className="text-emerald-400 font-bold">{(1440 / orbitPeriodMin).toFixed(2)} rev/day</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Linear Orbital Speed:</span><span className="text-white">{Math.sqrt(MU / semiMajorAxisKm).toFixed(3)} km/s</span></div>
          </div>

          {/* Ground Station Visibility Network */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              Global Station Network
            </div>
            {STATIONS.map(st => (
              <div key={st.id} className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-white font-bold">{st.name.split(" ")[0]}</span>
                </div>
                <span className="text-slate-500">{st.lat > 0 ? `${st.lat}°N` : `${Math.abs(st.lat)}°S`}</span>
              </div>
            ))}
          </div>

          {/* Nodal Regression Physics Note */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800 pb-2">
              J2 Precession Mechanics
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Earth oblateness causes orbital plane drift. At {inclinationDeg.toFixed(1)}° inclination, regression is {j2PrecessionDegDay.toFixed(2)}°/day, matching the Sun vector rotation of 0.9856°/day for Sun-synchronous coverage.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
