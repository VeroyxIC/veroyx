"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Rocket, 
  Layers, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Maximize2,
  Box,
  Scale
} from "lucide-react"

interface LaunchVehicleEnvelope {
  name: string
  provider: string
  fairingOuterDiaM: number
  fairingUsableDiaM: number
  fairingCylinderHeightM: number
  fairingTotalHeightM: number
  maxLeoPayloadKg: number
  maxSsoPayloadKg: number
  maxGtoPayloadKg: number
  maxTliPayloadKg: number
  oasplDb: number
  reusable: boolean
  description: string
}

const VEHICLE_PRESETS: Record<string, LaunchVehicleEnvelope> = {
  falcon9: {
    name: "Falcon 9 (Standard)",
    provider: "SpaceX",
    fairingOuterDiaM: 5.2,
    fairingUsableDiaM: 4.6,
    fairingCylinderHeightM: 6.6,
    fairingTotalHeightM: 13.1,
    maxLeoPayloadKg: 17500,
    maxSsoPayloadKg: 13500,
    maxGtoPayloadKg: 5500,
    maxTliPayloadKg: 3500,
    oasplDb: 139.5,
    reusable: true,
    description: "Industry baseline 5.2m composite fairing with standard payload adapter.",
  },
  vulcan_long: {
    name: "Vulcan Centaur (Long Fairing)",
    provider: "United Launch Alliance",
    fairingOuterDiaM: 5.4,
    fairingUsableDiaM: 4.8,
    fairingCylinderHeightM: 11.2,
    fairingTotalHeightM: 21.3,
    maxLeoPayloadKg: 27200,
    maxSsoPayloadKg: 20000,
    maxGtoPayloadKg: 14500,
    maxTliPayloadKg: 8500,
    oasplDb: 138.2,
    reusable: false,
    description: "Extended composite payload fairing optimized for NSSL heavy national security payloads.",
  },
  new_glenn: {
    name: "New Glenn",
    provider: "Blue Origin",
    fairingOuterDiaM: 7.0,
    fairingUsableDiaM: 6.35,
    fairingCylinderHeightM: 14.5,
    fairingTotalHeightM: 21.9,
    maxLeoPayloadKg: 45000,
    maxSsoPayloadKg: 35000,
    maxGtoPayloadKg: 13000,
    maxTliPayloadKg: 7000,
    oasplDb: 137.8,
    reusable: true,
    description: "Large 7-meter diameter fairing offering twice the volume of traditional commercial fairings.",
  },
  starship: {
    name: "Starship (Cargo Bay)",
    provider: "SpaceX",
    fairingOuterDiaM: 9.0,
    fairingUsableDiaM: 8.0,
    fairingCylinderHeightM: 17.2,
    fairingTotalHeightM: 22.0,
    maxLeoPayloadKg: 150000,
    maxSsoPayloadKg: 120000,
    maxGtoPayloadKg: 40000,
    maxTliPayloadKg: 35000,
    oasplDb: 142.0,
    reusable: true,
    description: "Next-gen super-heavy fully reusable launch architecture with massive internal payload volume.",
  },
  electron: {
    name: "Electron",
    provider: "Rocket Lab",
    fairingOuterDiaM: 1.2,
    fairingUsableDiaM: 1.08,
    fairingCylinderHeightM: 1.7,
    fairingTotalHeightM: 2.5,
    maxLeoPayloadKg: 300,
    maxSsoPayloadKg: 200,
    maxGtoPayloadKg: 0,
    maxTliPayloadKg: 0,
    oasplDb: 136.0,
    reusable: true,
    description: "Dedicated carbon-composite smallsat fairing with separation system for rapid orbital deployment.",
  },
}

export default function PayloadTradePage() {
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string>("falcon9")
  const [spacecraftMassKg, setSpacecraftMassKg] = useState<number>(4200)
  const [spacecraftDiaM, setSpacecraftDiaM] = useState<number>(3.8)
  const [spacecraftHeightM, setSpacecraftHeightM] = useState<number>(5.5)
  const [targetRegime, setTargetRegime] = useState<"LEO" | "SSO" | "GTO" | "TLI">("GTO")

  const vehicle = VEHICLE_PRESETS[selectedVehicleKey]

  const metrics = useMemo(() => {
    // Usable Volume of the fairing
    const rUsable = vehicle.fairingUsableDiaM / 2
    const cylVol = Math.PI * Math.pow(rUsable, 2) * vehicle.fairingCylinderHeightM
    const noseConeHeight = Math.max(0, vehicle.fairingTotalHeightM - vehicle.fairingCylinderHeightM)
    const coneVol = (1 / 3) * Math.PI * Math.pow(rUsable, 2) * noseConeHeight
    const totalUsableVolumeM3 = Math.round(cylVol + coneVol)

    // Spacecraft Volume approximation
    const scRadius = spacecraftDiaM / 2
    const spacecraftVolM3 = Math.round(Math.PI * Math.pow(scRadius, 2) * spacecraftHeightM * 10) / 10

    // Clearance Buffers
    const radialClearanceM = Math.round(((vehicle.fairingUsableDiaM - spacecraftDiaM) / 2) * 100) / 100
    const heightClearanceM = Math.round((vehicle.fairingTotalHeightM - spacecraftHeightM) * 100) / 100
    const fitsEnvelope = radialClearanceM >= 0.1 && heightClearanceM >= 0.2

    // Mass Capacity Trade
    let capacityKg = vehicle.maxLeoPayloadKg
    if (targetRegime === "SSO") capacityKg = vehicle.maxSsoPayloadKg
    if (targetRegime === "GTO") capacityKg = vehicle.maxGtoPayloadKg
    if (targetRegime === "TLI") capacityKg = vehicle.maxTliPayloadKg

    const massMarginKg = capacityKg - spacecraftMassKg
    const massMarginPct = capacityKg > 0 ? Math.round((massMarginKg / capacityKg) * 100) : -100
    const massClosed = massMarginKg >= 0 && capacityKg > 0

    return {
      totalUsableVolumeM3,
      spacecraftVolM3,
      radialClearanceM,
      heightClearanceM,
      fitsEnvelope,
      capacityKg,
      massMarginKg,
      massMarginPct,
      massClosed,
      volUtilizationPct: Math.min(100, Math.round((spacecraftVolM3 / totalUsableVolumeM3) * 100)),
    }
  }, [vehicle, spacecraftMassKg, spacecraftDiaM, spacecraftHeightM, targetRegime])

  const exportTradeCSV = () => {
    const csv = `Parameter,Value,Unit
Vehicle,${vehicle.name},
Provider,${vehicle.provider},
Usable Fairing Diameter,${vehicle.fairingUsableDiaM},m
Usable Fairing Volume,${metrics.totalUsableVolumeM3},m3
Spacecraft Diameter,${spacecraftDiaM},m
Spacecraft Height,${spacecraftHeightM},m
Spacecraft Mass,${spacecraftMassKg},kg
Radial Clearance,${metrics.radialClearanceM},m
Vertical Clearance,${metrics.heightClearanceM},m
Target Regime,${targetRegime},
Vehicle Lift Capacity,${metrics.capacityKg},kg
Mass Margin,${metrics.massMarginKg},kg
Envelope Status,${metrics.fitsEnvelope ? "CLEARED" : "INTERFERENCE VIOLATION"},
Lift Status,${metrics.massClosed ? "VALIDATED" : "MASS DEFICIT"},`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-payload-fairing-trade.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Box className="w-3.5 h-3.5 animate-pulse" />
              Payload Dynamic Envelope &amp; Mass-to-Orbit Integration Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              FAIRING &amp; PAYLOAD TRADE ENGINE
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model usable cylindrical-conical fairing envelope stay-out zones, acoustic load limits, acoustic clearance buffers, and multi-regime mass-to-orbit lift margins.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportTradeCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT TRADE MANIFEST
            </button>
          </div>
        </div>

        {/* Vehicle Selection Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(VEHICLE_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setSelectedVehicleKey(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedVehicleKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {v.name} ({v.provider})
            </button>
          ))}
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Spacecraft Specification Inputs */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Spacecraft Envelope &amp; Mass
            </div>

            {/* Target Regime */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">MISSION TARGET ORBIT</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["LEO", "SSO", "GTO", "TLI"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTargetRegime(r)}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      targetRegime === r
                        ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacecraft Mass Input */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SPACECRAFT WET LAUNCH MASS</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={spacecraftMassKg}
                  onChange={(e) => setSpacecraftMassKg(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">kg</span>
              </div>
            </div>

            {/* Spacecraft Max Diameter Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">STOWED MAX DIAMETER</label>
                <span className="text-cyan-400 font-bold">{spacecraftDiaM} METERS</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8.5}
                step={0.1}
                value={spacecraftDiaM}
                onChange={(e) => setSpacecraftDiaM(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5m</span>
                <span>4.0m</span>
                <span>8.5m</span>
              </div>
            </div>

            {/* Spacecraft Total Stowed Height Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">TOTAL STOWED HEIGHT</label>
                <span className="text-purple-400 font-bold">{spacecraftHeightM} METERS</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={20.0}
                step={0.2}
                value={spacecraftHeightM}
                onChange={(e) => setSpacecraftHeightM(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5m</span>
                <span>10.0m</span>
                <span>20.0m</span>
              </div>
            </div>

            {/* Vehicle Architecture Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-slate-400 font-bold flex items-center justify-between">
                <span>FAIRING APERTURE</span>
                <span className="text-white">{vehicle.fairingOuterDiaM}m Outer</span>
              </div>
              <div className="text-slate-400 font-bold flex items-center justify-between">
                <span>USABLE INTERNAL DIA</span>
                <span className="text-cyan-400">{vehicle.fairingUsableDiaM}m Dynamic</span>
              </div>
              <div className="text-slate-400 font-bold flex items-center justify-between">
                <span>ACOUSTIC LOADS</span>
                <span className="text-amber-400">{vehicle.oasplDb} dB OASPL</span>
              </div>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-cyan-400" /> USABLE VOLUME
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.totalUsableVolumeM3} m³</div>
                <div className="text-[10px] text-slate-500">Payload Uses {metrics.volUtilizationPct}%</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.fitsEnvelope ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  RADIAL CLEARANCE
                </div>
                <div className={`text-3xl font-black ${metrics.radialClearanceM >= 0.1 ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.radialClearanceM >= 0 ? `+${metrics.radialClearanceM}m` : `${metrics.radialClearanceM}m`}
                </div>
                <div className="text-[10px] text-slate-500">Min 0.10m Buffer</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Scale className="w-3 h-3 text-purple-400" /> MASS LIFT MARGIN
                </div>
                <div className={`text-3xl font-black ${metrics.massClosed ? "text-purple-400" : "text-red-400"}`}>
                  {metrics.massClosed ? `+${metrics.massMarginKg.toLocaleString()} kg` : `${metrics.massMarginKg.toLocaleString()} kg`}
                </div>
                <div className="text-[10px] text-slate-500">Target: {targetRegime} Capacity</div>
              </div>
            </div>

            {/* Integration Validation Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  Mission Integration &amp; Envelope Clearance Review
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.fitsEnvelope && metrics.massClosed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.fitsEnvelope && metrics.massClosed
                    ? "FLIGHT APPROVED (CLEARANCE MET)"
                    : "INTEGRATION REJECTED (LIMIT EXCEEDED)"}
                </span>
              </div>

              {/* Volume Utilization Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">FAIRING ENVELOPE CAPACITY FILL</span>
                  <span className="text-white font-bold">{metrics.spacecraftVolM3} m³ / {metrics.totalUsableVolumeM3} m³ ({metrics.volUtilizationPct}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      metrics.volUtilizationPct > 90 ? "bg-amber-400" : "bg-cyan-400"
                    }`}
                    style={{ width: `${Math.min(100, metrics.volUtilizationPct)}%` }}
                  />
                </div>
              </div>

              {/* Regime Lift Capacity Comparison */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">LEO (28.5°)</span>
                  <span className="text-sm font-black text-white">{vehicle.maxLeoPayloadKg.toLocaleString()} kg</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">SSO (POLAR)</span>
                  <span className="text-sm font-black text-cyan-400">{vehicle.maxSsoPayloadKg.toLocaleString()} kg</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">GTO (TRANSFER)</span>
                  <span className="text-sm font-black text-purple-400">{vehicle.maxGtoPayloadKg.toLocaleString()} kg</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">TLI (LUNAR)</span>
                  <span className="text-sm font-black text-amber-400">{vehicle.maxTliPayloadKg.toLocaleString()} kg</span>
                </div>
              </div>

              {/* Clearance Specs */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Vertical Height Headroom</span>
                  <span className="text-white font-bold">{metrics.heightClearanceM} m remaining</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Acoustic Vibration Load Rating</span>
                  <span className="text-slate-200 font-bold">{vehicle.oasplDb} dB Overall Sound Pressure Level</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Launch Architecture Status</span>
                  <span className="text-emerald-400 font-bold">{vehicle.reusable ? "REUSABLE BOOSTER" : "EXPENDABLE"}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
