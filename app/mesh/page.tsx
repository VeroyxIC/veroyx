"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Network, 
  Zap, 
  Gauge, 
  Download, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Globe,
  Radio,
  Clock,
  Sparkles
} from "lucide-react"

interface MeshPreset {
  name: string
  operator: string
  regime: string
  altitudeKm: number
  planesCount: number
  satsPerPlane: number
  laserPowerW: number
  wavelengthNm: number
  dataRateGbps: number
  apertureDiameterCm: number
  description: string
}

const MESH_PRESETS: Record<string, MeshPreset> = {
  sda_transport: {
    name: "SDA Tranche 2 Transport Layer (PWSA)",
    operator: "Space Development Agency (USSF)",
    regime: "Polar LEO",
    altitudeKm: 1000,
    planesCount: 6,
    satsPerPlane: 20,
    laserPowerW: 3.0,
    wavelengthNm: 1550,
    dataRateGbps: 10,
    apertureDiameterCm: 10,
    description: "Military mesh backbone providing continuous optical crosslinks for warfighter sensor-to-shooter data links.",
  },
  starlink_oisl: {
    name: "Starlink V2 Space Laser Backbone",
    operator: "SpaceX",
    regime: "Mid-Inclination LEO",
    altitudeKm: 550,
    planesCount: 72,
    satsPerPlane: 22,
    laserPowerW: 5.0,
    wavelengthNm: 1550,
    dataRateGbps: 100,
    apertureDiameterCm: 12,
    description: "Dense multi-hop inter-satellite laser mesh enabling ground-station-free transoceanic IP routing.",
  },
  kuiper_mesh: {
    name: "Amazon Kuiper Optical Mesh",
    operator: "Amazon Project Kuiper",
    regime: "LEO Shell",
    altitudeKm: 630,
    planesCount: 34,
    satsPerPlane: 30,
    laserPowerW: 4.0,
    wavelengthNm: 1550,
    dataRateGbps: 40,
    apertureDiameterCm: 10,
    description: "Enterprise and telecommunications trunking architecture with quad optical communication terminals per spacecraft.",
  },
}

interface CityPair {
  name: string
  distanceKm: number
}

const CITY_ROUTES: Record<string, CityPair> = {
  lon_tyo: { name: "London ⇄ Tokyo", distanceKm: 9560 },
  nyc_sgp: { name: "New York ⇄ Singapore", distanceKm: 15340 },
  fra_syd: { name: "Frankfurt ⇄ Sydney", distanceKm: 16490 },
  nyc_lon: { name: "New York ⇄ London", distanceKm: 5570 },
}

export default function ConstellationMeshPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("sda_transport")
  const [selectedRouteKey, setSelectedRouteKey] = useState<string>("lon_tyo")
  const [altitudeKm, setAltitudeKm] = useState<number>(1000)
  const [laserPowerW, setLaserPowerW] = useState<number>(3.0)
  const [apertureCm, setApertureCm] = useState<number>(10)
  const [dataRateGbps, setDataRateGbps] = useState<number>(10)

  const preset = MESH_PRESETS[selectedPresetKey]
  const route = CITY_ROUTES[selectedRouteKey]

  const applyPreset = (key: string) => {
    const p = MESH_PRESETS[key]
    setSelectedPresetKey(key)
    setAltitudeKm(p.altitudeKm)
    setLaserPowerW(p.laserPowerW)
    setApertureCm(p.apertureDiameterCm)
    setDataRateGbps(p.dataRateGbps)
  }

  // Optical ISL Physics & Network Latency Calculations
  const metrics = useMemo(() => {
    const cVacuum = 299792 // km/s
    const vFiber = cVacuum / 1.468 // ~204,218 km/s in silica glass
    const earthRadiusKm = 6378.1
    const rOrbit = earthRadiusKm + altitudeKm

    // Maximum geometric inter-satellite link distance without clipping Earth atmosphere (100km horizon)
    const minHorizon = earthRadiusKm + 100
    const maxLineOfSightKm = Math.round(2 * Math.sqrt(Math.pow(rOrbit, 2) - Math.pow(minHorizon, 2)))

    // Average intra-plane hop distance (~1,500 - 3,500 km)
    const intraPlaneDistKm = Math.min(maxLineOfSightKm * 0.7, Math.round(rOrbit * 0.45))

    // Multi-Hop Path Calculation
    const routeSurfaceDistKm = route.distanceKm
    const uplinkDownlinkDistKm = altitudeKm * 2.3 // 2 ground hops (uplink + downlink at slant)
    const totalSpacePathKm = Math.round(routeSurfaceDistKm * 1.08 + uplinkDownlinkDistKm)
    const hopsCount = Math.max(2, Math.round(routeSurfaceDistKm / intraPlaneDistKm))

    // Latency Comparisons
    // Terrestrial fiber: path typically 1.25x great-circle distance due to terrestrial routing
    const fiberPathKm = routeSurfaceDistKm * 1.25
    const fiberRttMs = Math.round(((2 * fiberPathKm) / vFiber) * 1000)

    // Space laser mesh RTT: speed of light in vacuum + processing per hop (approx 0.15ms per laser switch)
    const spacePropagationMs = (2 * totalSpacePathKm) / cVacuum * 1000
    const switchingOverheadMs = hopsCount * 0.3
    const spaceMeshRttMs = Math.round(spacePropagationMs + switchingOverheadMs)

    const latencyAdvantageMs = fiberRttMs - spaceMeshRttMs
    const latencySavingsPct = Math.round((latencyAdvantageMs / fiberRttMs) * 100)

    // Optical Link Budget
    const wavelengthM = 1550 * 1e-9
    const apertureM = apertureCm / 100
    const divergenceRad = (1.22 * wavelengthM) / apertureM // Diffraction-limited beam divergence
    const beamFootprintDiaM = Math.round(divergenceRad * (intraPlaneDistKm * 1000))
    const linkMarginDb = (12.4 + (laserPowerW >= 3 ? 2.5 : 0) + (apertureCm >= 12 ? 2.0 : 0)).toFixed(1)

    return {
      maxLineOfSightKm,
      intraPlaneDistKm,
      totalSpacePathKm,
      hopsCount,
      fiberRttMs,
      spaceMeshRttMs,
      latencyAdvantageMs,
      latencySavingsPct,
      divergenceMicroRad: (divergenceRad * 1e6).toFixed(1),
      beamFootprintDiaM,
      linkMarginDb,
    }
  }, [altitudeKm, laserPowerW, apertureCm, dataRateGbps, route])

  const exportMeshCSV = () => {
    const csv = `OPTICAL ISL MESH ROUTING & LATENCY REPORT
Preset Architecture,${preset.name}
Operator,${preset.operator}
Orbital Altitude,${altitudeKm} km
Route,${route.name}
Great Circle Distance,${route.distanceKm} km
Total Space Network Path,${metrics.totalSpacePathKm} km
Laser Mesh Multi-Hop Count,${metrics.hopsCount} hops
Space Laser RTT,${metrics.spaceMeshRttMs} ms
Terrestrial Fiber RTT,${metrics.fiberRttMs} ms
Latency Reduction,${metrics.latencyAdvantageMs} ms (${metrics.latencySavingsPct}% faster)
Laser Wavelength,1550 nm
Transmitter Power,${laserPowerW} W
Optical Terminal Aperture,${apertureCm} cm
Throughput,${dataRateGbps} Gbps
Optical Link Margin,${metrics.linkMarginDb} dB`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-isl-mesh-${selectedRouteKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Optical Inter-Satellite Link (OISL) Routing &amp; Latency Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              CONSTELLATION ISL MESH SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model multi-hop laser crosslink routing, line-of-sight atmospheric horizon clearance, optical terminal aperture gain, and sub-millisecond latency advantages over terrestrial subsea fiber.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportMeshCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT MESH SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(MESH_PRESETS).map(([k, v]) => (
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
              <Network className="w-4 h-4 text-cyan-400" />
              OISL Crosslink Parameters
            </div>

            {/* City Routing Pair */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">TRANSIT CORRIDOR PAIR</label>
              <select
                value={selectedRouteKey}
                onChange={(e) => setSelectedRouteKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                {Object.entries(CITY_ROUTES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name} ({v.distanceKm.toLocaleString()} km)
                  </option>
                ))}
              </select>
            </div>

            {/* Orbital Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">SHELL ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={350}
                max={1200}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>350 km (VLEO)</span>
                <span>550 km (Starlink)</span>
                <span>1200 km (High LEO)</span>
              </div>
            </div>

            {/* Laser Transmitter Power */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">OPTICAL LASER POWER</label>
                <span className="text-purple-400 font-bold">{laserPowerW} WATTS</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={10.0}
                step={0.5}
                value={laserPowerW}
                onChange={(e) => setLaserPowerW(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0 W</span>
                <span>5.0 W (Standard)</span>
                <span>10.0 W (High-Throughput)</span>
              </div>
            </div>

            {/* Terminal Aperture Diameter */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">TELESCOPE APERTURE</label>
                <span className="text-emerald-400 font-bold">{apertureCm} CM</span>
              </div>
              <input
                type="range"
                min={6}
                max={20}
                value={apertureCm}
                onChange={(e) => setApertureCm(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>6 cm (Mini-Terminal)</span>
                <span>12 cm</span>
                <span>20 cm (Heavy Relay)</span>
              </div>
            </div>

            {/* Throughput */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">CROSS-LINK BANDWIDTH</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dataRateGbps}
                  onChange={(e) => setDataRateGbps(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">Gbps</span>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">OPTICAL LINK SPEC:</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" /> SPACE LASER RTT
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.spaceMeshRttMs} ms</div>
                <div className="text-[10px] text-slate-500">{metrics.hopsCount} In-Orbit Laser Hops</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-400" /> TERRESTRIAL FIBER RTT
                </div>
                <div className="text-3xl font-black text-slate-300">{metrics.fiberRttMs} ms</div>
                <div className="text-[10px] text-slate-500">Subsea Cable Matrix</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> LATENCY ADVANTAGE
                </div>
                <div className="text-3xl font-black text-emerald-400">-{metrics.latencyAdvantageMs} ms</div>
                <div className="text-[10px] text-emerald-400">{metrics.latencySavingsPct}% Faster than Fiber</div>
              </div>
            </div>

            {/* Routing Comparison Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Routing Architecture: {route.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  SPEED OF LIGHT IN VACUUM ADVANTAGE
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">HIGH-FREQUENCY TRADING &amp; DEFENSE ADVANTAGE</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Light propagates at <strong className="text-white">~300,000 km/s</strong> through space vacuum versus only <strong className="text-white">~204,000 km/s</strong> in terrestrial silica fiber optics (refractive index $n \approx 1.47$). Over the {route.distanceKm.toLocaleString()} km corridor between {route.name}, the {metrics.hopsCount}-hop optical satellite mesh saves <strong className="text-emerald-400">{metrics.latencyAdvantageMs} ms</strong> round-trip, delivering a deterministic edge for high-frequency trading (HFT) and real-time military sensor-to-shooter loops.
                </p>
              </div>

              {/* Optical Physics Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Atmospheric Horizon Limit (Min 100km Tangent)</span>
                  <span className="text-white font-bold">{metrics.maxLineOfSightKm.toLocaleString()} km LOS</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Nominal Intra-Plane Hop Distance</span>
                  <span className="text-cyan-400 font-bold">{metrics.intraPlaneDistKm.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Diffraction-Limited Beam Divergence</span>
                  <span className="text-purple-400 font-bold">{metrics.divergenceMicroRad} μrad</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Laser Spot Footprint at Target Aperture</span>
                  <span className="text-slate-200 font-bold">{metrics.beamFootprintDiaM} meters</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optical Link Margin ({dataRateGbps} Gbps)</span>
                  <span className="text-emerald-400 font-bold">+{metrics.linkMarginDb} dB (CLOSED)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
