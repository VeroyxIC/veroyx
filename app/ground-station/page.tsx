"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Radio, 
  Globe, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  Clock, 
  Satellite, 
  Signal, 
  Database,
  Sliders
} from "lucide-react"

interface GroundStationPreset {
  name: string
  network: string
  latitudeDeg: number
  longitudeDeg: number
  minElevationDeg: number
  frequencyBand: "S-Band (2.2 GHz)" | "X-Band (8.4 GHz)" | "Ka-Band (26 GHz)"
  antennaDiameterM: number
  description: string
}

const GROUND_STATIONS: Record<string, GroundStationPreset> = {
  svalbard_polar: {
    name: "Svalbard Satellite Station (SG3)",
    network: "KSAT Polar Ground Network",
    latitudeDeg: 78.23,
    longitudeDeg: 15.40,
    minElevationDeg: 5.0,
    frequencyBand: "X-Band (8.4 GHz)",
    antennaDiameterM: 11.3,
    description: "High-latitude Arctic station offering up to 14 contact passes per day for polar and sun-synchronous orbits.",
  },
  madrid_dsn: {
    name: "Madrid Deep Space Communications (MDSCC)",
    network: "NASA Deep Space Network (DSN)",
    latitudeDeg: 40.43,
    longitudeDeg: -4.25,
    minElevationDeg: 10.0,
    frequencyBand: "X-Band (8.4 GHz)",
    antennaDiameterM: 34.0,
    description: "Deep space ground terminal with high G/T cryogenic feedhorn for cislunar and high-orbit spacecraft tracking.",
  },
  punta_arenas_southern: {
    name: "Punta Arenas Tracking Station",
    network: "Commercial LEO Ground Services",
    latitudeDeg: -53.16,
    longitudeDeg: -70.91,
    minElevationDeg: 7.0,
    frequencyBand: "S-Band (2.2 GHz)",
    antennaDiameterM: 7.3,
    description: "Sub-Antarctic ground station providing descending node dumps for commercial Earth observation missions.",
  },
}

export default function GroundStationPage() {
  const [selectedGsKey, setSelectedGsKey] = useState<string>("svalbard_polar")
  const [orbitAltitudeKm, setOrbitAltitudeKm] = useState<number>(550)
  const [orbitInclinationDeg, setInclinationDeg] = useState<number>(97.6)
  const [downlinkRateMbps, setDownlinkRateMbps] = useState<number>(350)
  const [dailyPayloadGenGb, setDailyPayloadGenGb] = useState<number>(240)
  const [groundStationCount, setGroundStationCount] = useState<number>(2)

  const gs = GROUND_STATIONS[selectedGsKey]

  const applyPreset = (key: string) => {
    setSelectedGsKey(key)
  }

  // Geometric Pass Dynamics & Contact Telemetry Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const rOrbKm = rEarthKm + orbitAltitudeKm

    // 1. Orbital Period and Velocity
    const vOrbKmS = Math.sqrt(mu / rOrbKm)
    const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)
    const orbitPeriodMin = orbitPeriodSec / 60
    const orbitsPerDay = 1440 / orbitPeriodMin

    // 2. Maximum Slant Range at AOS/LOS (km)
    const elevRad = (gs.minElevationDeg * Math.PI) / 180
    const maxSlantRangeKm = Math.round(
      Math.sqrt(Math.pow(rEarthKm * Math.sin(elevRad), 2) + 2 * rEarthKm * orbitAltitudeKm + Math.pow(orbitAltitudeKm, 2)) -
      rEarthKm * Math.sin(elevRad)
    )

    // 3. Contact Duration per Pass (Minutes)
    // Earth central angle psi_0:
    const cosPsi0 = (rEarthKm / rOrbKm) * Math.cos(elevRad)
    const psi0Rad = Math.acos(cosPsi0) - elevRad
    // Maximum pass track length:
    const maxGroundTrackKm = 2 * rEarthKm * psi0Rad
    const passDurationSec = maxGroundTrackKm / (vOrbKmS * (rEarthKm / rOrbKm))
    const avgPassDurationMin = Math.round((passDurationSec / 60) * 0.75 * 10) / 10 // Factor for mean pass elevation

    // 4. Contact Passes per 24 Hours
    // Polar stations (lat > 70 deg) see almost every SSO pass (~12-14 passes/day)
    let passesPerDayPerStation = 4.2
    if (Math.abs(gs.latitudeDeg) > 65) passesPerDayPerStation = 11.5
    else if (Math.abs(gs.latitudeDeg) > 40) passesPerDayPerStation = 5.8

    const totalPassesPerDay = Math.round(passesPerDayPerStation * groundStationCount)
    const totalContactMinutesPerDay = Math.round(totalPassesPerDay * avgPassDurationMin)

    // 5. Downlink Data Volume Capacity (Gbits per Day)
    // Downlink Mbits = TotalContactSec * Mbps
    const dailyDownlinkCapacityGbit = Math.round(((totalContactMinutesPerDay * 60 * downlinkRateMbps) / 1000) * 10) / 10

    // Data Buffer Clearance: Capacity must be >= 1.25x daily generated data
    const downlinkDataRatio = Math.round((dailyDownlinkCapacityGbit / Math.max(1, dailyPayloadGenGb)) * 10) / 10
    const bufferCleared = downlinkDataRatio >= 1.25

    // 6. Maximum Doppler Shift Frequency (kHz)
    // Delta_f = (v_rel / c) * f0
    const carrierFrequenciesGhz = {
      "S-Band (2.2 GHz)": 2.2,
      "X-Band (8.4 GHz)": 8.4,
      "Ka-Band (26 GHz)": 26.0,
    }
    const f0Ghz = carrierFrequenciesGhz[gs.frequencyBand] || 8.4
    const maxDopplerKhz = Math.round(((vOrbKmS / 299792.458) * (f0Ghz * 1e6)))

    return {
      orbitPeriodMin: orbitPeriodMin.toFixed(1),
      maxSlantRangeKm,
      avgPassDurationMin,
      totalPassesPerDay,
      totalContactMinutesPerDay,
      dailyDownlinkCapacityGbit,
      downlinkDataRatio,
      bufferCleared,
      maxDopplerKhz,
    }
  }, [orbitAltitudeKm, downlinkRateMbps, dailyPayloadGenGb, groundStationCount, gs])

  const exportGroundStationCSV = () => {
    const csv = `SPACECRAFT GROUND STATION NETWORK & CONTACT TELEMETRY
Target Ground Station,${gs.name}
Ground Network,${gs.network}
Station Coordinates,${gs.latitudeDeg} deg Lat / ${gs.longitudeDeg} deg Lon
Minimum Mask Elevation,${gs.minElevationDeg} deg
RF Terminal,${gs.antennaDiameterM}m Aperture (${gs.frequencyBand})
Orbit Altitude,${orbitAltitudeKm} km (Period: ${metrics.orbitPeriodMin} min)
Orbit Inclination,${orbitInclinationDeg} deg
Active Network Ground Stations,${groundStationCount} sites
Maximum Acquisition Slant Range,${metrics.maxSlantRangeKm} km
Average Contact Duration per Pass,${metrics.avgPassDurationMin} minutes
Total Contact Passes per Day,${metrics.totalPassesPerDay} passes / 24h
Cumulative Daily Contact Time,${metrics.totalContactMinutesPerDay} minutes / day
Peak Doppler Shift,±${metrics.maxDopplerKhz} kHz
Downlink Data Transmission Rate,${downlinkRateMbps} Mbps
Daily Payload Data Generated,${dailyPayloadGenGb} Gbits / day
Daily Network Downlink Capacity,${metrics.dailyDownlinkCapacityGbit} Gbits / day
Downlink Margin Ratio,${metrics.downlinkDataRatio}x (Req: >= 1.25x)
SSR Data Clearance Status,${metrics.bufferCleared ? "PASS (BUFFER FULLY EMPTIED DAILY)" : "FAIL (ONBOARD RECORDER OVERFLOW RISK)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-ground-station-${selectedGsKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              CCSDS Ground Station Contact Windows &amp; Slant Range Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              GROUND STATION TRACKING
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model elevation-dependent slant range geometry, orbital pass durations, Doppler frequency shifts, daily contact window budgets, and Solid-State Recorder (SSR) data dumping margins.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportGroundStationCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT GROUND SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(GROUND_STATIONS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                selectedGsKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.latitudeDeg}&deg; Lat · {v.network}</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> DAILY CONTACT TIME
            </div>
            <div className="text-3xl font-black text-cyan-400">{metrics.totalContactMinutesPerDay} min</div>
            <div className="text-[10px] text-slate-400">{metrics.totalPassesPerDay} Passes across 24h</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" /> DAILY DOWNLINK
            </div>
            <div className="text-3xl font-black text-emerald-400">{metrics.dailyDownlinkCapacityGbit} Gb</div>
            <div className="text-[10px] text-slate-400">At {downlinkRateMbps} Mbps Link Rate</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              {metrics.bufferCleared ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              )}
              SSR CLEARANCE RATIO
            </div>
            <div className={`text-3xl font-black ${metrics.bufferCleared ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.downlinkDataRatio}x
            </div>
            <div className="text-[10px] text-slate-400">Req: &ge; 1.25x Payload Volume</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Signal className="w-3 h-3 text-purple-400" /> MAX DOPPLER SHIFT
            </div>
            <div className="text-3xl font-black text-purple-400">&plusmn;{metrics.maxDopplerKhz} kHz</div>
            <div className="text-[10px] text-slate-400">Slant Range: {metrics.maxSlantRangeKm} km</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Orbit &amp; Downlink Parameters
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{orbitAltitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={300}
                max={1200}
                step={25}
                value={orbitAltitudeKm}
                onChange={(e) => setOrbitAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (Short Pass)</span>
                <span>Period: {metrics.orbitPeriodMin}m</span>
                <span>1200 km</span>
              </div>
            </div>

            {/* Downlink Data Rate */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">RF DOWNLINK BITRATE</label>
                <span className="text-emerald-400 font-bold">{downlinkRateMbps} MBPS</span>
              </div>
              <input
                type="range"
                min={20}
                max={1200}
                step={20}
                value={downlinkRateMbps}
                onChange={(e) => setDownlinkRateMbps(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 Mbps (S-Band)</span>
                <span>350 Mbps (X-Band)</span>
                <span>1200 Mbps (Ka-Band)</span>
              </div>
            </div>

            {/* Daily Generated Data & Station Count */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PAYLOAD (Gb/day)</label>
                <input
                  type="number"
                  step={20}
                  value={dailyPayloadGenGb}
                  onChange={(e) => setDailyPayloadGenGb(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">NETWORK SITES</label>
                <select
                  value={groundStationCount}
                  onChange={(e) => setGroundStationCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value={1}>1 Station</option>
                  <option value={2}>2 Dual-Polar</option>
                  <option value={3}>3 Global Ring</option>
                  <option value={4}>4 Multi-Site</option>
                </select>
              </div>
            </div>

            {/* Station Specs */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">SITE HARDWARE:</div>
              <p className="text-slate-300 font-mono text-[10px]">{gs.antennaDiameterM}m Aperture | {gs.frequencyBand}</p>
              <p className="text-slate-400">{gs.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Contact Window & Data Clearance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Satellite className="w-4 h-4 text-cyan-400" />
                  Pass Tracking &amp; Downlink Sizing Assessment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.bufferCleared
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.bufferCleared ? "DOWNLINK CAPACITY CLEARED" : "RECORDER OVERFLOW DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  At <strong className="text-white">{orbitAltitudeKm} km</strong> altitude, the spacecraft establishes contact at a maximum slant range of <strong className="text-cyan-400">{metrics.maxSlantRangeKm} km</strong> above the {gs.minElevationDeg}&deg; horizon mask.
                  Each pass averages <strong className="text-white">{metrics.avgPassDurationMin} minutes</strong> of contact time. Across the {groundStationCount}-station network, the vehicle accumulates <strong className="text-white">{metrics.totalPassesPerDay} contact passes ({metrics.totalContactMinutesPerDay} minutes/day)</strong>.
                </p>
                <p>
                  Transmitting at <strong className="text-emerald-400">{downlinkRateMbps} Mbps</strong> yields a daily network downlink volume of <strong className="text-white">{metrics.dailyDownlinkCapacityGbit} Gbits/day</strong> against a daily payload collection requirement of <strong className="text-white">{dailyPayloadGenGb} Gbits/day</strong>.
                  This secures a <strong className={metrics.bufferCleared ? "text-emerald-400" : "text-red-400"}>{metrics.downlinkDataRatio}x clearance ratio</strong> over generated volume.
                  {!metrics.bufferCleared && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Data buffer overflow hazard: Onboard solid-state memory will saturate within 48 hours. Increase RF downlink bitrate, transition to Ka-band, or contract secondary high-latitude ground stations.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Maximum Slant Range at AOS / LOS</span>
                  <span className="text-white font-bold">{metrics.maxSlantRangeKm} km (Elev: {gs.minElevationDeg}&deg;)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Maximum Doppler Carrier Shift</span>
                  <span className="text-purple-400 font-bold">&plusmn;{metrics.maxDopplerKhz} kHz (Requires AFC Tracking)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Daily Downlink vs Generated Data Ratio</span>
                  <span className={`font-bold ${metrics.bufferCleared ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.downlinkDataRatio}x (Req: &ge; 1.25x headroom)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Mission Ground Segment Clearance</span>
                  <span className={`font-bold ${metrics.bufferCleared ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.bufferCleared ? "PASS (CLEARED FOR CONTINUOUS DOWNLINK)" : "FAIL (INSUFFICIENT CONTACT TIME)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Correlated Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/link" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/link (RF)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/data-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/data-budget</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/swath" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/swath (Sensor)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
