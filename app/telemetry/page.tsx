"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useMission } from "@/lib/missionStore"
import { 
  Activity, 
  Orbit, 
  Radio, 
  Globe, 
  Clock, 
  Play, 
  Pause, 
  RotateCw, 
  Zap, 
  Cpu, 
  Compass, 
  Maximize2, 
  ArrowRight,
  ShieldCheck,
  Download,
  Flame,
  BatteryCharging
} from "lucide-react"

// World landmasses for 2D equirectangular canvas (Lat/Lon)
const WORLD_CONTINENTS: [number, number][][] = [
  // North America
  [[70, -160], [70, -120], [55, -90], [50, -55], [25, -80], [15, -85], [10, -75], [20, -105], [32, -118], [55, -135], [70, -160]],
  // South America
  [[12, -72], [5, -50], [-10, -35], [-23, -42], [-54, -68], [-44, -75], [-18, -70], [0, -80], [12, -72]],
  // Europe
  [[71, 28], [60, 28], [44, 10], [36, -5], [43, -9], [54, 6], [71, 28]],
  // Africa
  [[36, 10], [30, 32], [12, 51], [-12, 40], [-34, 20], [-18, 12], [5, 2], [14, -17], [36, 10]],
  // Asia
  [[75, 105], [68, 175], [42, 132], [22, 118], [12, 104], [22, 70], [14, 44], [38, 30], [55, 38], [70, 75], [75, 105]],
  // Australia
  [[-12, 132], [-14, 144], [-28, 153], [-37, 150], [-35, 116], [-20, 115], [-12, 132]]
]

// Ground station network coordinates [lat, lon, name]
const GROUND_STATIONS: [number, number, string][] = [
  [78.22, 15.65, "KSAT Svalbard (SG3)"],
  [35.42, -116.89, "DSN Goldstone (CA)"],
  [40.43, -4.25, "DSN Madrid (ES)"],
  [-35.40, 148.98, "DSN Canberra (AU)"],
  [37.94, -75.46, "Wallops Ground Stn"],
  [-72.01, 2.53, "TrollSat (Antarctica)"]
]

export default function TelemetryPage() {
  const { mission, totalWetMassKg, totalPowerW } = useMission()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Real-time propagation clock
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [timeWarp, setTimeWarp] = useState<number>(1) // 1x, 5x, 25x, 100x
  const [elapsedSec, setElapsedSec] = useState<number>(0)
  
  // Real-time orbital metrics
  const telemetry = useMemo(() => {
    const rEarthKm = 6378.137
    const mu = 398600.4418
    const j2 = 0.00108263
    const rOrbKm = rEarthKm + mission.altitudeKm
    
    // Orbital period & velocity
    const vOrbKmS = Math.sqrt(mu / rOrbKm)
    const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)
    const orbitPeriodMin = orbitPeriodSec / 60
    
    // J2 Nodal precession rate (rad/sec)
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const pKm = rOrbKm
    const dRaanDtRadS = -1.5 * ((j2 * Math.sqrt(mu) * Math.pow(rEarthKm, 2)) / Math.pow(pKm, 3.5)) * Math.cos(incRad)
    const dRaanDtDegDay = (dRaanDtRadS * 86400 * 180) / Math.PI

    // Mean motion
    const nRadS = (2 * Math.PI) / orbitPeriodSec

    // Current True Anomaly at elapsed time
    const currentM = (nRadS * elapsedSec) % (2 * Math.PI)
    const trueAnomalyDeg = Math.round((currentM * 180) / Math.PI)

    // Current sub-satellite coordinates
    // Lat: sin(lat) = sin(inc) * sin(u)
    const latRad = Math.asin(Math.sin(incRad) * Math.sin(currentM))
    const latDeg = (latRad * 180) / Math.PI

    // Lon: lon = lon0 + raan + atan2(cos(inc)*sin(u), cos(u)) - omegaEarth*t
    const omegaEarthRadS = 7.2921159e-5
    const uRad = currentM
    const yLon = Math.cos(incRad) * Math.sin(uRad)
    const xLon = Math.cos(uRad)
    const lonInOrbit = Math.atan2(yLon, xLon)
    const lonRad = (lonInOrbit - omegaEarthRadS * elapsedSec + (dRaanDtRadS * elapsedSec)) % (2 * Math.PI)
    let lonDeg = (lonRad * 180) / Math.PI
    if (lonDeg > 180) lonDeg -= 360
    if (lonDeg < -180) lonDeg += 360

    // J2000 Cartesian Position
    const xKm = Math.round(rOrbKm * Math.cos(currentM) * 10) / 10
    const yKm = Math.round(rOrbKm * Math.sin(currentM) * Math.cos(incRad) * 10) / 10
    const zKm = Math.round(rOrbKm * Math.sin(currentM) * Math.sin(incRad) * 10) / 10

    // Eclipse status
    const inEclipse = Math.cos(currentM) < -0.35

    // Synthetic Bus Telemetry
    const busVoltageV = (28.2 + (inEclipse ? -0.8 : 0.6) + Math.sin(elapsedSec * 0.1) * 0.15).toFixed(2)
    const batterySocPct = Math.max(78, Math.round(100 - (inEclipse ? (Math.abs(Math.cos(currentM)) * 18) : 0)))
    const arrayCurrentA = inEclipse ? "0.00" : ((totalPowerW / 28.2) + Math.cos(elapsedSec * 0.05) * 0.4).toFixed(2)
    const rw1Rpm = Math.round(2450 + Math.sin(elapsedSec * 0.2) * 220)
    const txPowerDbm = "+33.0"

    return {
      vOrbKmS: vOrbKmS.toFixed(3),
      orbitPeriodMin: orbitPeriodMin.toFixed(2),
      dRaanDtDegDay: dRaanDtDegDay.toFixed(2),
      trueAnomalyDeg,
      latDeg: latDeg.toFixed(2),
      lonDeg: lonDeg.toFixed(2),
      xKm,
      yKm,
      zKm,
      inEclipse,
      busVoltageV,
      batterySocPct,
      arrayCurrentA,
      rw1Rpm,
      txPowerDbm
    }
  }, [mission, elapsedSec, totalPowerW])

  // Real-time ticking effect
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setElapsedSec(prev => prev + 1 * timeWarp)
    }, 100)
    return () => clearInterval(interval)
  }, [isPlaying, timeWarp])

  // Canvas 2D Ground Track Renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 900
      canvas.height = 440
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Projection helpers (Equirectangular Lat/Lon -> Canvas X/Y)
    const toPx = (lat: number, lon: number) => {
      const x = ((lon + 180) / 360) * canvas.width
      const y = ((90 - lat) / 180) * canvas.height
      return { x, y }
    }

    // 1. Canvas Background
    ctx.fillStyle = "#020617"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Lat/Lon Graticule Lines (every 30 deg)
    ctx.strokeStyle = "rgba(14, 165, 233, 0.12)"
    ctx.lineWidth = 0.8
    for (let lat = -60; lat <= 60; lat += 30) {
      const p1 = toPx(lat, -180)
      const p2 = toPx(lat, 180)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }
    for (let lon = -150; lon <= 150; lon += 30) {
      const p1 = toPx(90, lon)
      const p2 = toPx(-90, lon)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    // Equator Line (Amber dashed)
    const eq1 = toPx(0, -180)
    const eq2 = toPx(0, 180)
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)"
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(eq1.x, eq1.y)
    ctx.lineTo(eq2.x, eq2.y)
    ctx.stroke()
    ctx.setLineDash([])

    // 2. Vector Continents
    WORLD_CONTINENTS.forEach(poly => {
      ctx.beginPath()
      let first = true
      poly.forEach(([lat, lon]) => {
        const pt = toPx(lat, lon)
        if (first) {
          ctx.moveTo(pt.x, pt.y)
          first = false
        } else {
          ctx.lineTo(pt.x, pt.y)
        }
      })
      ctx.closePath()
      ctx.fillStyle = "rgba(16, 185, 129, 0.18)"
      ctx.fill()
      ctx.strokeStyle = "rgba(52, 211, 153, 0.5)"
      ctx.lineWidth = 1.0
      ctx.stroke()
    })

    // 3. Ground Station Antennas & Communication Footprint Cones
    GROUND_STATIONS.forEach(([stLat, stLon, stName]) => {
      const pt = toPx(stLat, stLon)
      // Antenna mask circle (~2000 km coverage at 550 km alt)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 42, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(6, 182, 212, 0.08)"
      ctx.fill()
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)"
      ctx.lineWidth = 1.0
      ctx.stroke()

      // Antenna beacon pip
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = "#38bdf8"
      ctx.fill()

      ctx.fillStyle = "#94a3b8"
      ctx.font = "9px monospace"
      ctx.fillText(stName, pt.x + 6, pt.y - 3)
    })

    // 4. Projected Ground Track (Next 2 Orbits Forward)
    const incRad = (mission.inclinationDeg * Math.PI) / 180
    const omegaEarthRadS = 7.2921159e-5
    const orbitPeriodSec = Number(telemetry.orbitPeriodMin) * 60
    const nRadS = (2 * Math.PI) / orbitPeriodSec

    ctx.strokeStyle = "rgba(6, 182, 212, 0.75)"
    ctx.lineWidth = 1.8
    ctx.beginPath()
    let prevX = -1

    for (let dt = 0; dt <= orbitPeriodSec * 2; dt += 30) {
      const t = elapsedSec + dt
      const u = (nRadS * t) % (2 * Math.PI)
      const latR = Math.asin(Math.sin(incRad) * Math.sin(u))
      const latD = (latR * 180) / Math.PI

      const yL = Math.cos(incRad) * Math.sin(u)
      const xL = Math.cos(u)
      const lonInOrb = Math.atan2(yL, xL)
      let lonD = ((lonInOrb - omegaEarthRadS * t) * 180) / Math.PI
      lonD = ((lonD + 180) % 360 + 360) % 360 - 180

      const pt = toPx(latD, lonD)
      if (prevX !== -1 && Math.abs(pt.x - prevX) > canvas.width * 0.5) {
        // Antimeridian wrap-around split
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y)
      } else {
        if (dt === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      }
      prevX = pt.x
    }
    ctx.stroke()

    // 5. Active Sub-Satellite Position Pip & Nadir Footprint
    const currentPt = toPx(Number(telemetry.latDeg), Number(telemetry.lonDeg))

    // Dynamic ground footprint circle
    ctx.beginPath()
    ctx.arc(currentPt.x, currentPt.y, 35, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)"
    ctx.fill()
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Satellite Core Pip
    ctx.beginPath()
    ctx.arc(currentPt.x, currentPt.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = "#f59e0b"
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Spacecraft Callout Tag
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 10px monospace"
    ctx.fillText(`${mission.missionName}`, currentPt.x + 10, currentPt.y - 10)
    ctx.fillStyle = "#38bdf8"
    ctx.font = "9px monospace"
    ctx.fillText(`${telemetry.latDeg}°N, ${telemetry.lonDeg}°E`, currentPt.x + 10, currentPt.y + 2)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [telemetry, elapsedSec, mission])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Real-Time J2 Orbit Propagation &amp; Ground Track Telemetry Kernel
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono uppercase">
              FLIGHT TELEMETRY
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Step-propagated numerical orbital trajectory bus tracking instantaneous J2000 state vectors, sub-satellite ground track coordinates, eclipse transitions, and electrical bus diagnostics.
            </p>
          </div>

          {/* Time Warp Control Deck */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              {isPlaying ? "PAUSE" : "RESUME"}
            </button>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              {[1, 5, 25, 100].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeWarp(w)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    timeWarp === w
                      ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {w}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setElapsedSec(0)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Reset Simulation Time"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* 2D Ground Track Map Card */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-white font-bold">
              <Globe className="w-4 h-4 text-cyan-400" />
              CYLINDRICAL EQUIRECTANGULAR GROUND TRACK
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span>LAT: <strong className="text-white">{telemetry.latDeg}&deg;</strong></span>
              <span>LON: <strong className="text-white">{telemetry.lonDeg}&deg;</strong></span>
              <span>ALT: <strong className="text-cyan-400">{mission.altitudeKm} km</strong></span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                telemetry.inEclipse ? "bg-amber-950 border border-amber-500/40 text-amber-300" : "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
              }`}>
                {telemetry.inEclipse ? "ECLIPSE PASS" : "SUNLIT PASS"}
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
            <canvas
              ref={canvasRef}
              className="w-full block"
            />
          </div>
        </div>

        {/* Real-Time Flight Dynamics & Electrical Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          
          {/* J2000 Cartesian Vector */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-cyan-400" /> J2000 POSITION [X, Y, Z]</span>
              <span className="text-cyan-400 font-bold">{telemetry.vOrbKmS} km/s</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">X_eci:</span>
                <strong className="text-white">{telemetry.xKm} km</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Y_eci:</span>
                <strong className="text-white">{telemetry.yKm} km</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Z_eci:</span>
                <strong className="text-white">{telemetry.zKm} km</strong>
              </div>
            </div>
          </div>

          {/* J2 Secular Drift & Orbit Angle */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Orbit className="w-3.5 h-3.5 text-purple-400" /> ORBIT PROPAGATION</span>
              <span className="text-purple-400 font-bold">{telemetry.orbitPeriodMin}m Period</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">True Anomaly (&nu;):</span>
                <strong className="text-white">{telemetry.trueAnomalyDeg}&deg;</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nodal Drift (d&Omega;/dt):</span>
                <strong className="text-white">{telemetry.dRaanDtDegDay}&deg; / day</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inclination:</span>
                <strong className="text-white">{mission.inclinationDeg}&deg;</strong>
              </div>
            </div>
          </div>

          {/* Electrical Power Bus State */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> EPS BUS VOLTAGE</span>
              <span className="text-amber-400 font-bold">{telemetry.busVoltageV} V</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Solar Array Current:</span>
                <strong className="text-white">{telemetry.arrayCurrentA} A</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Battery SoC:</span>
                <strong className="text-emerald-400">{telemetry.batterySocPct}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bus Draw:</span>
                <strong className="text-white">{totalPowerW} Watts</strong>
              </div>
            </div>
          </div>

          {/* GNC & Comms Subsystems */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-emerald-400" /> GNC &amp; RF DOWNLINK</span>
              <span className="text-emerald-400 font-bold">CARRIER LOCK</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">RW1 Momentum Wheel:</span>
                <strong className="text-white">{telemetry.rw1Rpm} RPM</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">X-Band RF Power:</span>
                <strong className="text-white">{telemetry.txPowerDbm} dBm</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Spacecraft Wet Mass:</span>
                <strong className="text-white">{totalWetMassKg} kg</strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
