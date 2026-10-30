"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Eye, 
  Globe, 
  Gauge, 
  Download, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Compass,
  Crosshair,
  Camera,
  Radar
} from "lucide-react"

interface SwathPreset {
  name: string
  operator: string
  sensorType: "Electro-Optical (EO)" | "Synthetic Aperture Radar (SAR)" | "Hyperspectral / Wide-Field"
  altitudeKm: number
  sensorFovDeg: number
  maxRollAngleDeg: number
  constellationSats: number
  description: string
}

const SWATH_PRESETS: Record<string, SwathPreset> = {
  high_res_optical: {
    name: "Sub-30cm High-Resolution Optical Recon",
    operator: "Defense ISR / Commercial Flagship",
    sensorType: "Electro-Optical (EO)",
    altitudeKm: 480,
    sensorFovDeg: 1.8,
    maxRollAngleDeg: 35,
    constellationSats: 4,
    description: "Narrow-swath high-precision telescope using agile body roll for flexible regional target collection.",
  },
  planet_smallsat_mesh: {
    name: "Proliferated Rapid-Revisit SmallSat Mesh",
    operator: "Commercial Global Daily Monitor",
    sensorType: "Electro-Optical (EO)",
    altitudeKm: 500,
    sensorFovDeg: 3.5,
    maxRollAngleDeg: 15,
    constellationSats: 120,
    description: "Constellation-level scan corridor optimized for continuous daily whole-Earth surface imaging.",
  },
  orbital_sar_stripmap: {
    name: "Day/Night Tactical SAR Stripmap Radar",
    operator: "Sovereign Defense Radar",
    sensorType: "Synthetic Aperture Radar (SAR)",
    altitudeKm: 550,
    sensorFovDeg: 4.2,
    maxRollAngleDeg: 40,
    constellationSats: 8,
    description: "Side-looking active phased array radar with wide access corridor across all cloud conditions.",
  },
  wide_hyperspectral: {
    name: "Environmental Wide-Field Hyperspectral",
    operator: "Civil Earth Observation",
    sensorType: "Hyperspectral / Wide-Field",
    altitudeKm: 705,
    sensorFovDeg: 14.5,
    maxRollAngleDeg: 20,
    constellationSats: 2,
    description: "Broad continuous pushbroom swath designed for ocean color, vegetation, and greenhouse gas monitoring.",
  },
}

export default function SwathCoveragePage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("high_res_optical")
  const [altitudeKm, setAltitudeKm] = useState<number>(480)
  const [sensorFovDeg, setSensorFovDeg] = useState<number>(1.8)
  const [maxRollAngleDeg, setMaxRollAngleDeg] = useState<number>(35)
  const [constellationSats, setConstellationSats] = useState<number>(4)

  const preset = SWATH_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = SWATH_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setSensorFovDeg(p.sensorFovDeg)
    setMaxRollAngleDeg(p.maxRollAngleDeg)
    setConstellationSats(p.constellationSats)
  }

  // Spherical Earth Swath Geometry Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const rOrbKm = rEarthKm + altitudeKm
    const mu = 398600.4418 // km3/s2

    // 1. Orbital velocity & Ground Track Velocity
    const vOrb = Math.sqrt(mu / rOrbKm) // km/s
    const vGround = vOrb * (rEarthKm / rOrbKm) // km/s
    const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)
    const orbitsPerDay = (86400 / periodSec).toFixed(1)

    // 2. Instantaneous Nadir Swath Width (W_nadir)
    const thetaHalfRad = (sensorFovDeg / 2) * (Math.PI / 180)
    const sinEarthCentral = (rOrbKm / rEarthKm) * Math.sin(thetaHalfRad)
    const earthCentralAngleRad = Math.asin(Math.min(0.9999, sinEarthCentral)) - thetaHalfRad
    const nadirSwathKm = Math.round(2 * rEarthKm * earthCentralAngleRad * 10) / 10

    // 3. Extended Access Corridor (Off-Nadir Roll Steering)
    const totalAccessHalfRad = (sensorFovDeg / 2 + maxRollAngleDeg) * (Math.PI / 180)
    const sinAccessCentral = (rOrbKm / rEarthKm) * Math.sin(totalAccessHalfRad)
    const accessCentralAngleRad = Math.asin(Math.min(0.9999, sinAccessCentral)) - totalAccessHalfRad
    const accessCorridorWidthKm = Math.round(2 * rEarthKm * accessCentralAngleRad)

    // 4. Area Coverage Rate (Single Satellite)
    const areaRateKm2Sec = Math.round(nadirSwathKm * vGround)
    const dailyCollectionPotentialSqKm = Math.round(areaRateKm2Sec * 86400 * 0.15) // 15% duty cycle

    // 5. Constellation Average Global Revisit Time (Hours)
    const earthCircumferenceKm = 40075
    const accessCorridorSats = accessCorridorWidthKm * constellationSats
    const revisitHours = Math.max(
      0.5,
      Math.round(((earthCircumferenceKm / Math.max(1, accessCorridorSats)) * (24 / Number(orbitsPerDay))) * 10) / 10
    )

    return {
      vGroundKmS: vGround.toFixed(2),
      orbitsPerDay,
      nadirSwathKm,
      accessCorridorWidthKm,
      areaRateKm2Sec: areaRateKm2Sec.toLocaleString(),
      dailyCollectionPotentialSqKm: dailyCollectionPotentialSqKm.toLocaleString(),
      revisitHours,
    }
  }, [altitudeKm, sensorFovDeg, maxRollAngleDeg, constellationSats])

  const exportSwathCSV = () => {
    const csv = `SPACECRAFT SENSOR SWATH & FOV COVERAGE DOSSIER
Sensor Archetype,${preset.name}
Operator / Class,${preset.operator}
Sensor Class,${preset.sensorType}
Orbital Altitude,${altitudeKm} km
Sensor Optical Field of View (FOV),${sensorFovDeg} deg
Max Off-Nadir Roll Agility,+/-${maxRollAngleDeg} deg
Constellation Shell Size,${constellationSats} satellites
Nadir Ground Swath Width,${metrics.nadirSwathKm} km
Total Off-Nadir Access Corridor,${metrics.accessCorridorWidthKm} km
Nadir Ground Speed,${metrics.vGroundKmS} km/s
Instantaneous Area Coverage Rate,${metrics.areaRateKm2Sec} km2/s
Estimated Daily Collection Footprint,${metrics.dailyCollectionPotentialSqKm} km2/day
Average Constellation Revisit Interval,${metrics.revisitHours} hours`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-sensor-swath-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Eye className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Spherical Earth Sensor Geometry &amp; Revisit Footprint Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SENSOR SWATH &amp; COVERAGE SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model instantaneous nadir swath widths, off-nadir body roll access corridors, orbital ground-track collection rates (km²/s), and multi-satellite constellation revisit intervals.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportSwathCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT SWATH SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(SWATH_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedPresetKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Sensor Optics &amp; Geometry
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ORBITAL ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={300}
                max={900}
                step={20}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO)</span>
                <span>500 km (SSO Recon)</span>
                <span>900 km</span>
              </div>
            </div>

            {/* Instrument FOV */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">OPTICAL FIELD OF VIEW (FOV)</label>
                <span className="text-purple-400 font-bold">{sensorFovDeg}&deg; TOTAL</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={25.0}
                step={0.1}
                value={sensorFovDeg}
                onChange={(e) => setSensorFovDeg(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0&deg; (Narrow High-Res)</span>
                <span>5.0&deg;</span>
                <span>25.0&deg; (Wide-Field)</span>
              </div>
            </div>

            {/* Off-Nadir Roll Steering Angle */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">OFF-NADIR ROLL AGILITY</label>
                <span className="text-emerald-400 font-bold">&plusmn;{maxRollAngleDeg}&deg; ROLL</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={maxRollAngleDeg}
                onChange={(e) => setMaxRollAngleDeg(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0&deg; (Nadir Only)</span>
                <span>30&deg; (Tactical Retask)</span>
                <span>50&deg; (Extreme Slew)</span>
              </div>
            </div>

            {/* Constellation Planes */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">CONSTELLATION SHELL SIZE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={constellationSats}
                  onChange={(e) => setConstellationSats(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">SATELLITES</span>
              </div>
            </div>

            {/* Sensor Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">SENSOR TYPE: {preset.sensorType}</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Camera className="w-3 h-3 text-cyan-400" /> NADIR SWATH WIDTH
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.nadirSwathKm} km</div>
                <div className="text-[10px] text-slate-500">Single Orbit Pass Width</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-purple-400" /> TOTAL ACCESS CORRIDOR
                </div>
                <div className="text-3xl font-black text-white">{metrics.accessCorridorWidthKm} km</div>
                <div className="text-[10px] text-purple-400">&plusmn;{maxRollAngleDeg}&deg; Roll Steering Reach</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-400" /> AVERAGE REVISIT
                </div>
                <div className="text-3xl font-black text-emerald-400">{metrics.revisitHours} hrs</div>
                <div className="text-[10px] text-slate-500">{constellationSats} Satellites in Shell</div>
              </div>
            </div>

            {/* Coverage Capacity & Geometry Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Collection Footprint &amp; Dynamic Coverage Metrics
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-950 text-cyan-300 uppercase">
                  WGS-84 SPHERICAL GEOMETRY
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">COLLECTION THROUGHPUT PERFORMANCE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Moving at a ground track velocity of <strong className="text-white">{metrics.vGroundKmS} km/s</strong> at {altitudeKm} km altitude, the sensor sweeps <strong className="text-cyan-400">{metrics.areaRateKm2Sec} km²/s</strong> across the Earth&apos;s surface. With an operational collection duty cycle of 15%, a single satellite generates a daily imaging throughput potential of <strong className="text-emerald-400">{metrics.dailyCollectionPotentialSqKm} km²/day</strong>.
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Ground Track Nadir Speed (v_ground)</span>
                  <span className="text-white font-bold">{metrics.vGroundKmS} km/s</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Orbits Completed Per Day</span>
                  <span className="text-cyan-400 font-bold">{metrics.orbitsPerDay} revs/day</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Instantaneous Nadir Ground Swath</span>
                  <span className="text-purple-400 font-bold">{metrics.nadirSwathKm} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Off-Nadir Access Swath Corridor</span>
                  <span className="text-emerald-400 font-bold">{metrics.accessCorridorWidthKm} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Constellation Average Revisit Cycle</span>
                  <span className="text-slate-200 font-bold">~{metrics.revisitHours} Hours</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
