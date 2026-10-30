"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Radio, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  Crosshair, 
  ArrowRight,
  Activity,
  Maximize2,
  Scan,
  CloudSun
} from "lucide-react"

interface SarPreset {
  name: string
  operator: string
  band: "X-Band" | "C-Band" | "L-Band"
  centerFreqGhz: number
  antennaLengthM: number
  antennaWidthM: number
  bandwidthMhz: number
  altitudeKm: number
  incidenceAngleDeg: number
  mode: "Spotlight" | "Stripmap" | "ScanSAR"
  description: string
}

const SAR_PRESETS: Record<string, SarPreset> = {
  umbra_x: {
    name: "Umbra High-Resolution SAR",
    operator: "Umbra Space",
    band: "X-Band",
    centerFreqGhz: 9.6,
    antennaLengthM: 1.2,
    antennaWidthM: 0.8,
    bandwidthMhz: 1200,
    altitudeKm: 520,
    incidenceAngleDeg: 35,
    mode: "Spotlight",
    description: "Ultra-wideband 1200 MHz chirp delivering sub-0.25m tactical spotlight resolution.",
  },
  capella_x: {
    name: "Capella Space Whitney",
    operator: "Capella Space",
    band: "X-Band",
    centerFreqGhz: 9.65,
    antennaLengthM: 3.5,
    antennaWidthM: 0.8,
    bandwidthMhz: 500,
    altitudeKm: 500,
    incidenceAngleDeg: 30,
    mode: "Spotlight",
    description: "Commercial deployed mesh reflector optimized for all-weather infrastructure tracking.",
  },
  iceye_x: {
    name: "ICEYE Commercial SmallSat",
    operator: "ICEYE",
    band: "X-Band",
    centerFreqGhz: 9.65,
    antennaLengthM: 3.2,
    antennaWidthM: 0.4,
    bandwidthMhz: 300,
    altitudeKm: 570,
    incidenceAngleDeg: 28,
    mode: "Stripmap",
    description: "Compact phased array constellation providing continuous wide-swath persistent monitoring.",
  },
  sentinel1_c: {
    name: "Sentinel-1 TOPSAR",
    operator: "ESA / Copernicus",
    band: "C-Band",
    centerFreqGhz: 5.405,
    antennaLengthM: 12.3,
    antennaWidthM: 0.82,
    bandwidthMhz: 100,
    altitudeKm: 693,
    incidenceAngleDeg: 38,
    mode: "ScanSAR",
    description: "Large 12m planar phased array providing 250km interferometric wide swaths.",
  },
  nisar_l: {
    name: "NASA-ISRO NISAR",
    operator: "NASA / ISRO",
    band: "L-Band",
    centerFreqGhz: 1.25,
    antennaLengthM: 12.0,
    antennaWidthM: 12.0,
    bandwidthMhz: 77,
    altitudeKm: 747,
    incidenceAngleDeg: 37,
    mode: "Stripmap",
    description: "12m deployable mesh reflector for dense forest canopy penetration and ground displacement.",
  },
}

export default function SARSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("umbra_x")
  const [antennaLengthM, setAntennaLengthM] = useState<number>(1.2)
  const [bandwidthMhz, setBandwidthMhz] = useState<number>(1200)
  const [altitudeKm, setAltitudeKm] = useState<number>(520)
  const [incidenceDeg, setIncidenceDeg] = useState<number>(35)
  const [mode, setMode] = useState<"Spotlight" | "Stripmap" | "ScanSAR">("Spotlight")
  const [bandName, setBandName] = useState<string>("X-Band")

  const preset = SAR_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = SAR_PRESETS[key]
    setSelectedPresetKey(key)
    setAntennaLengthM(p.antennaLengthM)
    setBandwidthMhz(p.bandwidthMhz)
    setAltitudeKm(p.altitudeKm)
    setIncidenceDeg(p.incidenceAngleDeg)
    setMode(p.mode)
    setBandName(p.band)
  }

  // SAR Radar Physics Calculations
  const metrics = useMemo(() => {
    const c = 299792458
    const freqGhz = bandName === "X-Band" ? 9.6 : bandName === "C-Band" ? 5.4 : 1.25
    const wavelengthM = c / (freqGhz * 1e9)
    const incRad = (incidenceDeg * Math.PI) / 180

    // 1. Slant Range (R0 = altitude / cos(theta))
    const slantRangeKm = altitudeKm / Math.cos(incRad)
    const slantRangeM = slantRangeKm * 1000

    // 2. Slant Range Resolution: delta_r_slant = c / (2 * Bandwidth)
    const bandwidthHz = bandwidthMhz * 1e6
    const slantRangeResM = c / (2 * bandwidthHz)

    // 3. Ground Range Resolution: delta_r_ground = delta_r_slant / sin(theta)
    const groundRangeResM = slantRangeResM / Math.sin(incRad)

    // 4. Azimuth Resolution
    // Stripmap: delta_a = L_a / 2
    // Spotlight: can focus down to ~0.25 to 0.4 of stripmap limit using beam steering
    // ScanSAR: degraded by burst duration factor ~3x
    let azimuthResM = antennaLengthM / 2
    if (mode === "Spotlight") {
      azimuthResM = Math.max(0.15, (antennaLengthM / 2) * 0.35)
    } else if (mode === "ScanSAR") {
      azimuthResM = (antennaLengthM / 2) * 3.5
    }

    // 5. Synthetic Aperture Length: L_syn = lambda * R0 / L_a
    const synthApertureLengthM = (wavelengthM * slantRangeM) / antennaLengthM

    // 6. Spacecraft Orbital Velocity (approx 7.6 km/s in LEO)
    const orbitalVelMs = 7600
    const dwellTimeSec = synthApertureLengthM / orbitalVelMs

    // 7. Swath Width Estimation
    let swathWidthKm = 0
    if (mode === "Spotlight") {
      swathWidthKm = 5.0
    } else if (mode === "Stripmap") {
      swathWidthKm = Math.round(((wavelengthM * slantRangeM) / 0.8) / 1000)
    } else {
      swathWidthKm = Math.round((slantRangeKm * Math.tan(incRad) * 0.6) + 120)
    }

    // 8. Penetration & Environmental Robustness
    let penetrationLevel = "SURFACE SCATTERING"
    let penetrationDesc = "Captures metallic textures, vehicle surfaces, building facades, and rough ocean chop."
    if (bandName === "C-Band") {
      penetrationLevel = "LEAF-CANOPY TOPOLOGY"
      penetrationDesc = "Scatters from tree canopy leaves, sea ice roughness, and agricultural crop growth."
    } else if (bandName === "L-Band") {
      penetrationLevel = "SUBSURFACE & FOLIAGE PENETRATING"
      penetrationDesc = "Penetrates dry sand, snowpack, and thick forest branches down to tree trunks and soil strata."
    }

    return {
      slantRangeKm: slantRangeKm.toFixed(1),
      slantRangeResM: slantRangeResM.toFixed(2),
      groundRangeResM: groundRangeResM.toFixed(2),
      azimuthResM: azimuthResM.toFixed(2),
      synthApertureLengthKm: (synthApertureLengthM / 1000).toFixed(2),
      dwellTimeSec: dwellTimeSec.toFixed(2),
      swathWidthKm,
      wavelengthCm: (wavelengthM * 100).toFixed(1),
      penetrationLevel,
      penetrationDesc,
    }
  }, [antennaLengthM, bandwidthMhz, altitudeKm, incidenceDeg, mode, bandName])

  const exportSarCSV = () => {
    const csv = `Parameter,Value,Unit
Preset Baseline,${preset.name},
Radar Band,${bandName},
Antenna Physical Length,${antennaLengthM},m
Chirp Bandwidth,${bandwidthMhz},MHz
Orbital Altitude,${altitudeKm},km
Incidence Angle,${incidenceDeg},deg
Imaging Mode,${mode},
Wavelength,${metrics.wavelengthCm},cm
Slant Range Distance,${metrics.slantRangeKm},km
Slant Range Resolution,${metrics.slantRangeResM},m
Ground Range Resolution,${metrics.groundRangeResM},m
Azimuth Resolution,${metrics.azimuthResM},m
Synthetic Aperture Length,${metrics.synthApertureLengthKm},km
Target Dwell Time,${metrics.dwellTimeSec},s
Swath Width,${metrics.swathWidthKm},km
Penetration Regime,${metrics.penetrationLevel},`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-sar-resolution-model.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Scan className="w-3.5 h-3.5 animate-pulse" />
              Active Microwave Radar & Synthetic Aperture Geometry
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SYNTHETIC APERTURE RADAR (SAR) SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model all-weather 24/7 radar ground sample resolution, chirp pulse bandwidth scaling, incidence angles, synthetic aperture length, and canopy penetration regimes.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportSarCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT SAR SPECS
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(SAR_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedPresetKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name} ({v.band})
            </button>
          ))}
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Controls Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Radar Instrument Configuration
            </div>

            {/* Operating Band */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">RADAR FREQUENCY BAND</label>
              <div className="grid grid-cols-3 gap-2">
                {["X-Band", "C-Band", "L-Band"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBandName(b)}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      bandName === b
                        ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Imaging Mode */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">COLLECTION MODE</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Spotlight", "Stripmap", "ScanSAR"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      mode === m
                        ? "bg-purple-950 border-purple-500/50 text-purple-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Chirp Bandwidth Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">CHIRP PULSE BANDWIDTH (B)</label>
                <span className="text-cyan-400 font-bold">{bandwidthMhz} MHz</span>
              </div>
              <input
                type="range"
                min={50}
                max={1200}
                step={25}
                value={bandwidthMhz}
                onChange={(e) => setBandwidthMhz(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 MHz (Coarse)</span>
                <span>600 MHz</span>
                <span>1200 MHz (Tactical)</span>
              </div>
            </div>

            {/* Antenna Length Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ANTENNA AZIMUTH LENGTH (La)</label>
                <span className="text-purple-400 font-bold">{antennaLengthM} METERS</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={15.0}
                step={0.1}
                value={antennaLengthM}
                onChange={(e) => setAntennaLengthM(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.8m (Smallsat)</span>
                <span>3.5m</span>
                <span>15.0m (Heavy Phased Array)</span>
              </div>
            </div>

            {/* Radar Incidence Angle Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">LOOK INCIDENCE ANGLE</label>
                <span className="text-emerald-400 font-bold">{incidenceDeg}&deg;</span>
              </div>
              <input
                type="range"
                min={18}
                max={55}
                step={1}
                value={incidenceDeg}
                onChange={(e) => setIncidenceDeg(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>18&deg; (Near-Nadir)</span>
                <span>35&deg; (Nominal)</span>
                <span>55&deg; (Far Range Grazing)</span>
              </div>
            </div>

            {/* Altitude Input */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">ORBITAL ALTITUDE</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={altitudeKm}
                  onChange={(e) => setAltitudeKm(Math.max(300, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">km</span>
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-cyan-400" /> GROUND RANGE RES
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.groundRangeResM} m</div>
                <div className="text-[10px] text-slate-500">Slant Res: {metrics.slantRangeResM} m</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-purple-400" /> AZIMUTH RESOLUTION
                </div>
                <div className="text-3xl font-black text-purple-400">{metrics.azimuthResM} m</div>
                <div className="text-[10px] text-slate-500">Mode: {mode} Synthesis</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-emerald-400" /> SWATH FOOTPRINT
                </div>
                <div className="text-3xl font-black text-white">{metrics.swathWidthKm} km</div>
                <div className="text-[10px] text-emerald-400">All-Weather Ground Track</div>
              </div>
            </div>

            {/* Environmental Penetration & Material Physics Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-cyan-400" />
                  Electromagnetic Penetration &amp; Phenomenology
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  λ = {metrics.wavelengthCm} CM
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-cyan-400 font-bold uppercase">{metrics.penetrationLevel}</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">{metrics.penetrationDesc}</p>
              </div>

              {/* Synthetic Geometry Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Slant Range Distance (R0)</span>
                  <span className="text-white font-bold">{metrics.slantRangeKm} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Synthesized Synthetic Aperture Length (Lsyn)</span>
                  <span className="text-purple-400 font-bold">{metrics.synthApertureLengthKm} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Coherent Target Dwell Time</span>
                  <span className="text-emerald-400 font-bold">{metrics.dwellTimeSec} seconds</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Day/Night &amp; Cloud Cover Attenuation</span>
                  <span className="text-cyan-400 font-bold">0.0 dB (Total Atmospheric Penetration)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
