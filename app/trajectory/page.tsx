"use client"

import { useState, useId, useMemo } from "react"
import Link from "next/link"
import { Compass, Gauge, Rocket, ArrowRight, Info, AlertTriangle, ShieldCheck } from "lucide-react"

interface SpaceportPreset {
  name: string
  lat: number
  country: string
  defaultAzimuth: number
}

const SPACEPORT_PRESETS: Record<string, SpaceportPreset> = {
  ccsfs: { name: "Cape Canaveral SLC-40 (Florida)", lat: 28.5, country: "USA", defaultAzimuth: 90 },
  vsfb: { name: "Vandenberg SLC-4E (California)", lat: 34.6, country: "USA", defaultAzimuth: 180 },
  mahia: { name: "Rocket Lab LC-1 (New Zealand)", lat: -39.3, country: "NZ", defaultAzimuth: 165 },
  mars: { name: "Wallops MARS Pad 0A (Virginia)", lat: 37.8, country: "USA", defaultAzimuth: 120 },
  saxavord: { name: "SaxaVord Spaceport (Shetland)", lat: 60.8, country: "UK", defaultAzimuth: 0 },
}

export default function TrajectorySimulatorPage() {
  const [selectedPort, setSelectedPort] = useState<string>("ccsfs")
  const [targetAltKm, setTargetAltKm] = useState<number>(500) // LEO 500km
  const [targetIncDeg, setTargetIncDeg] = useState<number>(53) // Starlink / ISS shell
  const [basePayloadKg, setBasePayloadKg] = useState<number>(12000) // Standard Medium Lifter

  const port = SPACEPORT_PRESETS[selectedPort]

  // Form input unique IDs for accessibility
  const portSelectId = useId()
  const altInputId = useId()
  const incInputId = useId()
  const payloadInputId = useId()

  // Physics Calculations
  const metrics = useMemo(() => {
    const latRad = (Math.abs(port.lat) * Math.PI) / 180
    const incRad = (targetIncDeg * Math.PI) / 180
    const earthRadiusKm = 6378.1
    const vEquatorMs = 465.1 // Earth rotation speed at equator in m/s

    // Theoretical maximum rotation boost at this latitude
    const latBoostMax = vEquatorMs * Math.cos(latRad)

    // Direct launch condition: Can we reach inclination without plane change burn?
    // Direct launch condition: inclination >= latitude
    const directInsertion = targetIncDeg >= Math.abs(port.lat)

    // Calculated launch azimuth for direct insertion
    let azimuthDeg = 90
    if (directInsertion) {
      const cosAz = Math.cos(incRad) / Math.cos(latRad)
      const clampedCos = Math.max(-1, Math.min(1, cosAz))
      azimuthDeg = (Math.asin(clampedCos) * 180) / Math.PI
    }

    // Actual rotational boost assisting the rocket
    const actualBoostMs = directInsertion
      ? latBoostMax * Math.sin((azimuthDeg * Math.PI) / 180)
      : latBoostMax * 0.4

    // Plane change penalty if target inclination < latitude
    const orbitalSpeedLeo = 7670 // m/s around 500km
    let planeChangePenaltyMs = 0
    if (!directInsertion) {
      const deltaIncRad = ((Math.abs(port.lat) - targetIncDeg) * Math.PI) / 180
      planeChangePenaltyMs = 2 * orbitalSpeedLeo * Math.sin(deltaIncRad / 2)
    }

    // Altitude energy delta-v cost
    const altRatio = targetAltKm / 500
    const altPenaltyPct = Math.max(0, (altRatio - 1) * 0.12)

    // Final Delivered Payload Estimation
    const planePenaltyPct = (planeChangePenaltyMs / 1000) * 0.15
    const netEfficiency = Math.max(0.1, 1 - (planePenaltyPct + altPenaltyPct) + (actualBoostMs / 5000))
    const netDeliveredPayloadKg = Math.round(basePayloadKg * netEfficiency)

    return {
      latBoostMax: Math.round(latBoostMax),
      actualBoostMs: Math.round(actualBoostMs),
      directInsertion,
      azimuthDeg: Math.round(azimuthDeg),
      planeChangePenaltyMs: Math.round(planeChangePenaltyMs),
      netDeliveredPayloadKg,
      lossKg: basePayloadKg - netDeliveredPayloadKg,
    }
  }, [port, targetAltKm, targetIncDeg, basePayloadKg])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Compass className="w-3.5 h-3.5 animate-spin" />
              Orbital Mechanics & Azimuth Optimization
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              TRAJECTORY &amp; DELTA-V SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model launch site latitude penalties, Earth rotational kinetic assist, dogleg maneuvers, and payload mass delivered to destination orbits.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/spaceports"
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-1.5"
            >
              SPACEPORTS DIRECTORY <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Main Simulator Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Controls Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6 font-mono text-xs">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Mission Orbital Parameters
            </div>

            {/* Spaceport Selector */}
            <div className="space-y-1.5">
              <label htmlFor={portSelectId} className="text-slate-400 block">ORIGIN LAUNCH COMPLEX</label>
              <select
                id={portSelectId}
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                {Object.entries(SPACEPORT_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.name} ({p.lat}&deg;)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Inclination Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor={incInputId} className="text-slate-400">TARGET INCLINATION</label>
                <span className="text-cyan-400 font-bold">{targetIncDeg}&deg;</span>
              </div>
              <input
                id={incInputId}
                type="range"
                min={0}
                max={110}
                value={targetIncDeg}
                onChange={(e) => setTargetIncDeg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0&deg; (Equatorial)</span>
                <span>53&deg; (LEO Shell)</span>
                <span>98&deg; (SSO)</span>
              </div>
            </div>

            {/* Target Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor={altInputId} className="text-slate-400">TARGET APOGEE ALTITUDE</label>
                <span className="text-purple-400 font-bold">{targetAltKm} KM</span>
              </div>
              <input
                id={altInputId}
                type="range"
                min={200}
                max={35786}
                step={100}
                value={targetAltKm}
                onChange={(e) => setTargetAltKm(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>200 km (LEO)</span>
                <span>2,000 km</span>
                <span>35,786 km (GEO)</span>
              </div>
            </div>

            {/* Base Rocket Payload Capacity */}
            <div className="space-y-1.5">
              <label htmlFor={payloadInputId} className="text-slate-400 block">BASE VEHICLE RATING (LEO BASELINE)</label>
              <div className="flex items-center gap-2">
                <input
                  id={payloadInputId}
                  type="number"
                  value={basePayloadKg}
                  onChange={(e) => setBasePayloadKg(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-500">KG</span>
              </div>
            </div>

            {/* Flight Rules Callout */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px]">
              <div className="text-slate-400 font-bold flex items-center gap-1.5">
                {metrics.directInsertion ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                {metrics.directInsertion ? "DIRECT ASCENT FEASIBLE" : "DOGLEG / PLANE CHANGE PENALTY"}
              </div>
              <p className="text-slate-500 leading-relaxed font-sans">
                {metrics.directInsertion
                  ? `Inclination (${targetIncDeg}°) >= Latitude (${Math.abs(port.lat)}°). Rocket can launch directly into the target plane.`
                  : `Target inclination (${targetIncDeg}°) is lower than launch latitude (${Math.abs(port.lat)}°). Requires costly orbital dogleg.`}
              </p>
            </div>
          </div>

          {/* Telemetry Readouts & Flight Vector Card */}
          <div className="lg:col-span-2 space-y-6">

            {/* Big Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">EARTH ROTATION ASSIST</div>
                <div className="text-2xl font-black text-cyan-400">+{metrics.actualBoostMs} m/s</div>
                <div className="text-[10px] text-slate-500">Kinetic Velocity Boost</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">PLANE CHANGE DELTA-V</div>
                <div className={`text-2xl font-black ${metrics.planeChangePenaltyMs > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {metrics.planeChangePenaltyMs} m/s
                </div>
                <div className="text-[10px] text-slate-500">Non-coplanar Penalty</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">NET DELIVERED PAYLOAD</div>
                <div className="text-2xl font-black text-white">
                  {metrics.netDeliveredPayloadKg.toLocaleString()} <span className="text-xs text-slate-500">KG</span>
                </div>
                <div className="text-[10px] text-red-400/80">-{metrics.lossKg.toLocaleString()} kg total penalty</div>
              </div>
            </div>

            {/* Flight Vector HUD Visualizer */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    CALCULATED FLIGHT AZIMUTH CORRIDOR
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                  HEADING: {metrics.azimuthDeg}&deg; TRUE
                </span>
              </div>

              {/* Simplified Flight Ground-Track Schematic */}
              <div className="relative h-64 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30" />

                {/* Horizon Line */}
                <div className="absolute w-full h-[1px] bg-slate-800" />
                <div className="absolute h-full w-[1px] bg-slate-800" />

                {/* Origin Spaceport Blip */}
                <div className="absolute flex flex-col items-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse" />
                  <span className="text-[9px] text-cyan-300 mt-1 font-bold">{port.name.split(" ")[0]} ({port.lat}&deg;)</span>
                </div>

                {/* Trajectory Vector Line */}
                <div
                  className="absolute w-44 h-0.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-transparent origin-left transition-transform duration-500"
                  style={{
                    transform: `rotate(${-(90 - metrics.azimuthDeg)}deg)`,
                  }}
                />

                {/* Insertion Target Orbit Ring */}
                <div className="absolute right-12 top-10 w-20 h-20 rounded-full border border-dashed border-purple-500/40 flex items-center justify-center">
                  <span className="text-[9px] text-purple-300 font-bold">{targetAltKm}km</span>
                </div>

                <div className="absolute bottom-3 left-4 text-[10px] text-slate-500">
                  COORDINATE GRID: WGS-84 OBLATE SPHEROID
                </div>
              </div>

              {/* Analytical Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <span className="text-slate-500 text-[10px] block">MAX THEORETICAL BOOST</span>
                  <span className="text-slate-200 font-bold">+{metrics.latBoostMax} m/s</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Rotational speed at {port.lat}&deg; lat</p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <span className="text-slate-500 text-[10px] block">PAYLOAD RETENTION RATIO</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round((metrics.netDeliveredPayloadKg / basePayloadKg) * 100)}%
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Net orbital efficiency</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
