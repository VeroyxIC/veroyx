"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Radio, 
  Globe, 
  Activity, 
  Compass, 
  Flame, 
  Clock, 
  Target, 
  Maximize2, 
  ShieldCheck, 
  RotateCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Calendar
} from "lucide-react"

interface Spaceport {
  id: string
  code: string
  name: string
  location: string
  lat: number
  lon: number
  activeCount: number
  activeRocket: string
  nextMission: string
  targetOrbit: string
  inclinationDeg: number
  countdownSec: number
  boosterSerial: string
  recovery: string
  status: "GO FOR LAUNCH" | "STANDBY" | "HOLD"
}

const SPACEPORTS: Record<string, Spaceport> = {
  ccsfs: {
    id: "ccsfs",
    code: "CCSFS / KSC",
    name: "Cape Canaveral Space Force Station (SLC-40 / LC-39A)",
    location: "Florida, USA",
    lat: 28.57,
    lon: -80.65,
    activeCount: 3,
    activeRocket: "Falcon 9 Block 5",
    nextMission: "Starlink Group 10-14",
    targetOrbit: "LEO (53.2° Inclination)",
    inclinationDeg: 53.2,
    countdownSec: 17120, // ~4h 45m
    boosterSerial: "B1078.14 (14th Flight)",
    recovery: "ASDS Drone Ship 'ASOG'",
    status: "GO FOR LAUNCH"
  },
  vsfb: {
    id: "vsfb",
    code: "VSFB SLC-4E",
    name: "Vandenberg Space Force Base",
    location: "California, USA",
    lat: 34.63,
    lon: -120.61,
    activeCount: 2,
    activeRocket: "Falcon 9 Block 5",
    nextMission: "SDA Tranche 1 Tracking Relay",
    targetOrbit: "Polar SSO (97.4° Inclination)",
    inclinationDeg: 97.4,
    countdownSec: 86400 * 2.5,
    boosterSerial: "B1082.6 (6th Flight)",
    recovery: "RTLS Landing Zone 4",
    status: "GO FOR LAUNCH"
  },
  nzlc1: {
    id: "nzlc1",
    code: "NZ-LC1",
    name: "Rocket Lab Launch Complex 1",
    location: "Mahia Peninsula, New Zealand",
    lat: -39.26,
    lon: 177.86,
    activeCount: 1,
    activeRocket: "Electron / Curie Kick Stage",
    nextMission: "Kinéis IoT Constellation Batch-3",
    targetOrbit: "LEO (640 km / 98.2° SSO)",
    inclinationDeg: 98.2,
    countdownSec: 86400 * 4.2,
    boosterSerial: "Curie Kick-Stage 41",
    recovery: "Ocean Depleted",
    status: "STANDBY"
  },
  wff: {
    id: "wff",
    code: "WFF MARS Pad 0A",
    name: "Wallops Flight Facility MARS",
    location: "Virginia, USA",
    lat: 37.84,
    lon: -75.48,
    activeCount: 1,
    activeRocket: "Antares 330 / Cygnus",
    nextMission: "NG-22 Space Station Cargo",
    targetOrbit: "ISS Co-Orbit (51.64°)",
    inclinationDeg: 51.64,
    countdownSec: 86400 * 11,
    boosterSerial: "Firefly Miranda Core",
    recovery: "Expendable",
    status: "STANDBY"
  }
}

// Tactical continental coordinates [lat, lon]
const CONTINENTS: [number, number][][] = [
  // North America
  [[72, -165], [70, -135], [58, -95], [52, -55], [30, -82], [15, -85], [10, -75], [20, -105], [32, -118], [55, -135], [72, -165]],
  // South America
  [[12, -72], [5, -50], [-10, -35], [-23, -42], [-54, -68], [-44, -75], [-18, -72], [0, -80], [12, -72]],
  // Eurasia
  [[38, -9], [44, 12], [58, 25], [71, 28], [74, 105], [68, 170], [42, 132], [22, 118], [12, 104], [22, 70], [14, 44], [32, 34], [38, -9]],
  // Africa
  [[36, 10], [30, 32], [12, 51], [-12, 40], [-26, 33], [-34, 20], [-34, 18], [-18, 12], [-5, 12], [4, 7], [5, -2], [14, -17], [28, -13], [36, -6], [36, 10]],
  // Australia
  [[-12, 132], [-14, 144], [-28, 153], [-37, 150], [-39, 144], [-35, 116], [-22, 114], [-14, 129], [-12, 132]]
]

export default function LaunchesPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>("ccsfs")
  const [camYaw, setCamYaw] = useState<number>(0.8)
  const [camPitch, setCamPitch] = useState<number>(0.4)
  const isDraggingRef = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const radarSweepAngleRef = useRef<number>(0)
  const currentPort = SPACEPORTS[selectedKey]

  // Focus camera when spaceport clicked
  const handleSelectPort = (key: string) => {
    setSelectedKey(key)
    const p = SPACEPORTS[key]
    // Rotate globe to face chosen launch site
    setCamYaw(- (p.lon * Math.PI) / 180 + Math.PI / 2)
    setCamPitch((p.lat * Math.PI) / 180 * 0.7)
  }

  // 3D Canvas Radar Animation
  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 700
      canvas.height = 420
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    const render = () => {
      radarSweepAngleRef.current += 0.025

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const rGlobe = Math.min(canvas.width, canvas.height) * 0.38

      // 3D Projection
      const project = (x: number, y: number, z: number) => {
        // Yaw
        const x1 = x * Math.cos(camYaw) - z * Math.sin(camYaw)
        const z1 = x * Math.sin(camYaw) + z * Math.cos(camYaw)
        // Pitch
        const y2 = y * Math.cos(camPitch) - z1 * Math.sin(camPitch)
        const z2 = y * Math.sin(camPitch) + z1 * Math.cos(camPitch)

        const fov = 750
        const pz = fov / (fov + z2 * rGlobe)
        return {
          px: cx + x1 * rGlobe * pz,
          py: cy + y2 * rGlobe * pz,
          depth: z2,
          scale: pz
        }
      }

      // Background grid glow
      ctx.fillStyle = "#020617"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Outer Range Calibration Rings
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, rGlobe * 1.25, 0, Math.PI * 2)
      ctx.arc(cx, cy, rGlobe * 1.1, 0, Math.PI * 2)
      ctx.stroke()

      // Rotating Radar Sweep Beam
      const sw = radarSweepAngleRef.current
      const sweepGrad = ctx.createConicGradient(sw, cx, cy)
      sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0.18)")
      sweepGrad.addColorStop(0.12, "rgba(6, 182, 212, 0.0)")
      sweepGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)")
      ctx.fillStyle = sweepGrad
      ctx.beginPath()
      ctx.arc(cx, cy, rGlobe * 1.25, 0, Math.PI * 2)
      ctx.fill()

      // Globe Base Fill & Tactical Blue Graticule Sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rGlobe, 0, Math.PI * 2)
      ctx.clip()

      ctx.fillStyle = "#030c1d"
      ctx.fillRect(cx - rGlobe, cy - rGlobe, rGlobe * 2, rGlobe * 2)

      // Tactical Latitude & Longitude Graticule Lines
      ctx.strokeStyle = "rgba(14, 165, 233, 0.18)"
      ctx.lineWidth = 0.8
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        const latR = (lat * Math.PI) / 180
        const rLat = Math.cos(latR)
        const yLat = Math.sin(latR)
        for (let lon = 0; lon <= 360; lon += 6) {
          const lonR = (lon * Math.PI) / 180
          const pt = project(Math.cos(lonR) * rLat, yLat, Math.sin(lonR) * rLat)
          if (pt.depth > -0.15) {
            if (lon === 0) ctx.moveTo(pt.px, pt.py)
            else ctx.lineTo(pt.px, pt.py)
          }
        }
        ctx.stroke()
      }

      // Tactical Green Continents
      CONTINENTS.forEach(poly => {
        ctx.beginPath()
        let first = true
        poly.forEach(([lat, lon]) => {
          const latR = (lat * Math.PI) / 180
          const lonR = (lon * Math.PI) / 180
          const ex = Math.cos(latR) * Math.cos(lonR)
          const ey = Math.sin(latR)
          const ez = Math.cos(latR) * Math.sin(lonR)
          const pt = project(ex, ey, ez)

          if (pt.depth > -0.15) {
            if (first) {
              ctx.moveTo(pt.px, pt.py)
              first = false
            } else {
              ctx.lineTo(pt.px, pt.py)
            }
          }
        })
        ctx.closePath()
        ctx.fillStyle = "rgba(16, 185, 129, 0.22)"
        ctx.fill()
        ctx.strokeStyle = "rgba(52, 211, 153, 0.55)"
        ctx.lineWidth = 1.0
        ctx.stroke()
      })

      ctx.restore()

      // Glowing Atmosphere Boundary Rim
      ctx.beginPath()
      ctx.arc(cx, cy, rGlobe, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)"
      ctx.lineWidth = 1.8
      ctx.stroke()

      // Render Active Spaceport Beacons on 3D Surface
      Object.entries(SPACEPORTS).forEach(([k, sp]) => {
        const latR = (sp.lat * Math.PI) / 180
        const lonR = (sp.lon * Math.PI) / 180
        const px = Math.cos(latR) * Math.cos(lonR)
        const py = Math.sin(latR)
        const pz = Math.cos(latR) * Math.sin(lonR)
        const pt = project(px, py, pz)

        if (pt.depth > -0.05) {
          const isSelected = selectedKey === k

          // Pulsing Ping Ring
          ctx.beginPath()
          ctx.arc(pt.px, pt.py, isSelected ? 8 + Math.sin(radarSweepAngleRef.current * 2) * 3 : 5, 0, Math.PI * 2)
          ctx.strokeStyle = isSelected ? "#06b6d4" : "rgba(14, 165, 233, 0.6)"
          ctx.lineWidth = isSelected ? 2 : 1.2
          ctx.stroke()

          // Center solid pip
          ctx.beginPath()
          ctx.arc(pt.px, pt.py, isSelected ? 3.5 : 2.5, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? "#38bdf8" : "#0284c7"
          ctx.fill()

          // Launch Complex Label Callout
          if (isSelected) {
            ctx.fillStyle = "#38bdf8"
            ctx.font = "bold 10px monospace"
            ctx.fillText(`TARGET: ${sp.code}`, pt.px + 12, pt.py - 6)
            ctx.fillStyle = "#94a3b8"
            ctx.font = "9px monospace"
            ctx.fillText(`${sp.lat.toFixed(1)}°N, ${sp.lon.toFixed(1)}°W`, pt.px + 12, pt.py + 6)
          }
        }
      })

      // Render Active Spaceport Ascent Trajectory Arc into Orbit
      const p = currentPort
      const latR = (p.lat * Math.PI) / 180
      const lonR = (p.lon * Math.PI) / 180
      const startPt = project(Math.cos(latR) * Math.cos(lonR), Math.sin(latR), Math.cos(latR) * Math.sin(lonR))

      if (startPt.depth > -0.2) {
        ctx.beginPath()
        ctx.strokeStyle = "#f97316"
        ctx.lineWidth = 2.2
        ctx.setLineDash([4, 4])
        ctx.moveTo(startPt.px, startPt.py)

        // Compute curved ascent arc towards orbit inclination heading
        const incRad = (p.inclinationDeg * Math.PI) / 180
        for (let t = 0.05; t <= 0.8; t += 0.05) {
          const rAlt = 1.0 + t * 0.38
          const theta = lonR + t * 0.6
          const ax = Math.cos(latR * (1 - t * 0.3)) * Math.cos(theta) * rAlt
          const ay = Math.sin(incRad) * Math.sin(t * 1.5) * rAlt
          const az = Math.sin(latR * (1 - t * 0.3)) * Math.sin(theta) * rAlt
          const arcPt = project(ax, ay, az)
          ctx.lineTo(arcPt.px, arcPt.py)

          // Staging event pip at 40% arc (MECO)
          if (Math.abs(t - 0.4) < 0.03) {
            ctx.fillStyle = "#f59e0b"
            ctx.fillRect(arcPt.px - 3, arcPt.py - 3, 6, 6)
          }
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Rocket booster ascent marker
        const leadAlt = 1.0 + 0.5 * 0.38
        const leadX = Math.cos(latR * 0.8) * Math.cos(lonR + 0.3) * leadAlt
        const leadY = Math.sin(incRad) * Math.sin(0.75) * leadAlt
        const leadZ = Math.sin(latR * 0.8) * Math.sin(lonR + 0.3) * leadAlt
        const rocketPt = project(leadX, leadY, leadZ)

        ctx.fillStyle = "#f97316"
        ctx.font = "bold 9px monospace"
        ctx.fillText(`🚀 ${p.activeRocket} [ASCENT CORRIDOR]`, rocketPt.px + 10, rocketPt.py - 4)
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [selectedKey, camYaw, camPitch, currentPort])

  // Mouse camera drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setCamYaw(prev => prev + dx * 0.007)
    setCamPitch(prev => Math.max(-1.2, Math.min(1.2, prev + dy * 0.007)))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  // Format countdown
  const formatCountdown = (sec: number) => {
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    return `T-${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              LIVE TELEMETRY FEED &middot; REAL-TIME ORBITAL MANIFEST
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              ORBITAL LAUNCH RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Global tactical spaceport grid tracking active launch azimuth corridors, booster stage-separation vectors, and orbital injection parameters for USSF, NASA, and commercial manifests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              5 ACTIVE TRACKS
            </span>
          </div>
        </div>

        {/* Tactical Radar Command Center Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 3D Radar Screen (2 Cols) */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span className="text-white font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                GLOBAL SPACEPORT TRANSPONDER GRID
              </span>
              <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> DRAG GLOBE TO ROTATE RADAR SPHERE
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full cursor-grab active:cursor-grabbing block"
              />

              {/* Top-Right Camera Reset Pill */}
              <button
                onClick={() => handleSelectPort(selectedKey)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white font-mono text-[10px] flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-cyan-400" /> RE-CENTER SITE
              </button>
            </div>
          </div>

          {/* Spaceport Selector List (1 Col) */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider px-1">
              MONITORED SPACEPORTS
            </div>

            {Object.entries(SPACEPORTS).map(([k, sp]) => (
              <button
                key={k}
                onClick={() => handleSelectPort(k)}
                className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedKey === k
                    ? "bg-cyan-950/70 border-cyan-500 text-white shadow-lg shadow-cyan-950/30"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">{sp.code}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    sp.status === "GO FOR LAUNCH"
                      ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
                      : "bg-slate-900 border border-slate-700 text-slate-400"
                  }`}>
                    {sp.activeCount} ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-sans">{sp.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {sp.lat.toFixed(2)}° N, {Math.abs(sp.lon).toFixed(2)}° W
                </div>
              </button>
            ))}
          </div>

        </div>

        {/* Selected Mission Primary Launch Dossier Card */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] uppercase">
                  {currentPort.status}
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  {currentPort.activeRocket}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">{currentPort.nextMission}</h2>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[10px] text-slate-500 uppercase flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> COUNTDOWN WINDOW
              </div>
              <div className="text-xl font-black text-cyan-400">
                {formatCountdown(currentPort.countdownSec)}
              </div>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">TARGET ORBIT</div>
              <div className="text-sm font-bold text-white">{currentPort.targetOrbit}</div>
              <div className="text-[10px] text-slate-400">Azimuth: {currentPort.inclinationDeg}° Inc</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">LAUNCH COMPLEX</div>
              <div className="text-sm font-bold text-white">{currentPort.code}</div>
              <div className="text-[10px] text-slate-400">{currentPort.location}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">FIRST STAGE BOOSTER</div>
              <div className="text-sm font-bold text-amber-400">{currentPort.boosterSerial}</div>
              <div className="text-[10px] text-slate-400">Autonomous Re-flight</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">RECOVERY ASSET</div>
              <div className="text-sm font-bold text-emerald-400">{currentPort.recovery}</div>
              <div className="text-[10px] text-slate-400">Downrange Target Zone</div>
            </div>
          </div>

          {/* Direct Link to Ascent Staging and Vehicle Sizing */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 text-slate-400">
            <span className="text-[11px] font-sans">
              To size payload fairing stay-out envelopes and analyze launch vibration limit loads for this booster:
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/launch-vehicle"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-1.5"
              >
                <span>/launch-vehicle (Staging)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/visualizer"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-white font-bold transition-all flex items-center gap-1.5"
              >
                <span>/visualizer (3D Track)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
