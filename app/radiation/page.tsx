"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Gauge, 
  Download, 
  Layers, 
  Zap, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from "lucide-react"

interface RadPreset {
  name: string
  operator: string
  regime: "LEO (500 km)" | "LEO Polar / SSO" | "MEO (Van Allen Belts)" | "GEO (35,786 km)" | "Deep Space (Jupiter / Lunar)"
  missionDurationYears: number
  shieldingMm: number
  componentGrade: "COTS (Commercial Off-The-Shelf)" | "Rad-Tolerant Space Grade" | "Strategic Rad-Hardened"
  description: string
}

const RAD_PRESETS: Record<string, RadPreset> = {
  cots_smallsat: {
    name: "LEO CubeSat / COTS Smallsat",
    operator: "Commercial SmallSat",
    regime: "LEO (500 km)",
    missionDurationYears: 3,
    shieldingMm: 2.0,
    componentGrade: "COTS (Commercial Off-The-Shelf)",
    description: "Standard commercial automotive-grade silicon operating with minimal spot shielding.",
  },
  meo_nav: {
    name: "MEO Navigation Constellation (GPS/Galileo)",
    operator: "Space Systems Command (USSF) / ESA",
    regime: "MEO (Van Allen Belts)",
    missionDurationYears: 12,
    shieldingMm: 5.0,
    componentGrade: "Strategic Rad-Hardened",
    description: "Harsh trapped energetic electron belt environment requiring heavy spot shielding and hardened ASICs.",
  },
  geo_defense: {
    name: "GEO Strategic Protected SATCOM",
    operator: "US Space Force (USSF)",
    regime: "GEO (35,786 km)",
    missionDurationYears: 15,
    shieldingMm: 4.5,
    componentGrade: "Strategic Rad-Hardened",
    description: "Multi-year exposure to solar particle events (SPE) and deep dielectric charging in outer electron belt.",
  },
  deep_space_clipper: {
    name: "Planetary Jovian Radiation Probe",
    operator: "NASA / JPL",
    regime: "Deep Space (Jupiter / Lunar)",
    missionDurationYears: 7,
    shieldingMm: 8.0,
    componentGrade: "Strategic Rad-Hardened",
    description: "Extreme Jovian magnetosphere electron flux requiring a dedicated titanium-tantalum radiation vault.",
  },
}

export default function SpacecraftRadiationPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("cots_smallsat")
  const [regime, setRegime] = useState<string>("LEO (500 km)")
  const [missionYears, setMissionYears] = useState<number>(3)
  const [shieldingMm, setShieldingMm] = useState<number>(2.0)
  const [componentGrade, setComponentGrade] = useState<string>("COTS (Commercial Off-The-Shelf)")

  const preset = RAD_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = RAD_PRESETS[key]
    setSelectedPresetKey(key)
    setRegime(p.regime)
    setMissionYears(p.missionDurationYears)
    setShieldingMm(p.shieldingMm)
    setComponentGrade(p.componentGrade)
  }

  // Radiation Dosage & Reliability Physics
  const metrics = useMemo(() => {
    // 1. Unshielded Annual TID Dose baseline (krad(Si) / year)
    let baselineAnnualKrad = 1.8 // LEO
    if (regime.includes("Polar")) baselineAnnualKrad = 3.5
    else if (regime.includes("MEO")) baselineAnnualKrad = 38.0 // Extreme Van Allen belt core
    else if (regime.includes("GEO")) baselineAnnualKrad = 6.2
    else if (regime.includes("Deep Space")) baselineAnnualKrad = 45.0 // Jovian

    // 2. Aluminium Depth-Dose Attenuation (exponential decay + brehmsstrahlung floor)
    // Formula: D = D0 * (0.15 + 0.85 * exp(-t / 2.2))
    const attenuationFactor = 0.12 + 0.88 * Math.exp(-shieldingMm / 2.4)
    const annualDoseKrad = baselineAnnualKrad * attenuationFactor
    const totalMissionTidKrad = Math.round(annualDoseKrad * missionYears * 10) / 10

    // 3. Component Radiation Tolerance Rating
    let componentTidToleranceKrad = 15 // COTS
    let latchupImmune = false
    if (componentGrade.includes("Rad-Tolerant")) {
      componentTidToleranceKrad = 50
      latchupImmune = true
    } else if (componentGrade.includes("Strategic")) {
      componentTidToleranceKrad = 150
      latchupImmune = true
    }

    // 4. Radiation Design Margin (RDM) = Tolerance / Environment TID
    const rdm = Math.round((componentTidToleranceKrad / Math.max(0.1, totalMissionTidKrad)) * 10) / 10
    const meetsNasaRdm = rdm >= 2.0 // NASA standard requires RDM >= 2.0

    // 5. Single-Event Upset (SEU) Bit-Flip Rate
    // Bit flips per gigabit per day based on cosmic rays & SAA passes
    let seuFluxMultiplier = regime.includes("Polar") ? 2.5 : regime.includes("MEO") ? 5.0 : regime.includes("GEO") ? 3.8 : 1.0
    if (componentGrade.includes("COTS")) seuFluxMultiplier *= 8.0
    else if (componentGrade.includes("Rad-Tolerant")) seuFluxMultiplier *= 1.5
    else seuFluxMultiplier *= 0.15 // Silicon-On-Insulator (SOI) rad-hard

    const bitFlipsPerGbDay = Math.round(1.2 * seuFluxMultiplier * 10) / 10

    return {
      totalMissionTidKrad,
      annualDoseKrad: annualDoseKrad.toFixed(2),
      componentTidToleranceKrad,
      rdm,
      meetsNasaRdm,
      latchupImmune,
      bitFlipsPerGbDay,
      shieldMassKgM2: Math.round(shieldingMm * 2.7 * 10) / 10, // Aluminium density ~2.7 g/cm3 -> 2.7 kg/m2 per mm
    }
  }, [regime, missionYears, shieldingMm, componentGrade])

  const exportRadCSV = () => {
    const csv = `SPACECRAFT RADIATION & HARDNESS ASSURANCE (RHA) DOSSIER
Preset,${preset.name}
Operator,${preset.operator}
Orbital Environment,${regime}
Mission Lifetime,${missionYears} years
Equivalent Aluminium Shielding,${shieldingMm} mm (${metrics.shieldMassKgM2} kg/m2)
Silicon Component Grade,${componentGrade}
Component TID Rating,${metrics.componentTidToleranceKrad} krad(Si)
Annual Penetrating Dose,${metrics.annualDoseKrad} krad/yr
Total Mission TID Dose,${metrics.totalMissionTidKrad} krad(Si)
Radiation Design Margin (RDM),${metrics.rdm}x (${metrics.meetsNasaRdm ? "PASS >= 2.0x" : "VIOLATION < 2.0x"})
Single-Event Latchup (SEL) Immunity,${metrics.latchupImmune ? "IMMUNE (LET > 75 MeV)" : "VULNERABLE (COTS LATCHUP RISK)"}
Estimated SEU Bit-Flip Rate,${metrics.bitFlipsPerGbDay} flips/Gb/day`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-radiation-hardness-dossier.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              Radiation Hardness Assurance (RHA) &amp; Total Ionising Dose (TID) Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              RADIATION DOSAGE &amp; SEE SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model orbital Total Ionising Dose (TID), aluminium equivalent shielding attenuation, Single-Event Upsets (SEU), and NASA EEE-INST-002 component Radiation Design Margins.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportRadCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT RHA DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(RAD_PRESETS).map(([k, v]) => (
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
              Radiation Hardness Parameters
            </div>

            {/* Orbital Radiation Environment */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">ORBITAL RADIATION BELT</label>
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="LEO (500 km)">LEO Standard (500 km - SAA Exposure)</option>
                <option value="LEO Polar / SSO">LEO Polar / SSO (Auroral Horns &amp; SAA)</option>
                <option value="MEO (Van Allen Belts)">MEO (Van Allen Energetic Electron Belts)</option>
                <option value="GEO (35,786 km)">GEO (Trapped Electrons &amp; Solar Particles)</option>
                <option value="Deep Space (Jupiter / Lunar)">Deep Space (Cosmic Rays &amp; Jovian Flux)</option>
              </select>
            </div>

            {/* Mission Lifetime Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">MISSION LIFETIME DURATION</label>
                <span className="text-cyan-400 font-bold">{missionYears} YEARS</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={missionYears}
                onChange={(e) => setMissionYears(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 Year</span>
                <span>10 Years</span>
                <span>20 Years</span>
              </div>
            </div>

            {/* Aluminium Shielding Thickness */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ALUMINIUM EQUIVALENT SHIELDING</label>
                <span className="text-purple-400 font-bold">{shieldingMm} mm ({metrics.shieldMassKgM2} kg/m²)</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={15.0}
                step={0.5}
                value={shieldingMm}
                onChange={(e) => setShieldingMm(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5 mm (Thin Chassis)</span>
                <span>5.0 mm</span>
                <span>15.0 mm (Vault Enclosure)</span>
              </div>
            </div>

            {/* Component Grade Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SILICON COMPONENT CLASS</label>
              <select
                value={componentGrade}
                onChange={(e) => setComponentGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="COTS (Commercial Off-The-Shelf)">COTS (Automotive/Industrial - 15 krad)</option>
                <option value="Rad-Tolerant Space Grade">Rad-Tolerant Space Qualified (50 krad)</option>
                <option value="Strategic Rad-Hardened">Strategic Rad-Hardened (SOI/RHBD - 150 krad)</option>
              </select>
            </div>

            {/* Heritage Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">MISSION PROFILE:</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Master RHA Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> TOTAL MISSION TID
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.totalMissionTidKrad} krad</div>
                <div className="text-[10px] text-slate-500">{metrics.annualDoseKrad} krad(Si) / year</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.meetsNasaRdm ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  DESIGN MARGIN (RDM)
                </div>
                <div className={`text-3xl font-black ${metrics.meetsNasaRdm ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.rdm}x
                </div>
                <div className="text-[10px] text-slate-500">NASA Target: &ge; 2.0x Margin</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" /> SEU FLIP RATE
                </div>
                <div className="text-3xl font-black text-white">{metrics.bitFlipsPerGbDay}</div>
                <div className="text-[10px] text-purple-400">Bit Flips / Gigabit / Day</div>
              </div>
            </div>

            {/* Radiation Assurance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Electronic Part Reliability &amp; Single-Event Effects (SEE)
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.meetsNasaRdm
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.meetsNasaRdm ? "ASSURANCE VERIFIED (RDM >= 2.0x)" : "ASSURANCE DEFICIT (RISK OF FAILURE)"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">DESTRUCTIVE SINGLE-EVENT LATCH-UP (SEL) STATUS</div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  {metrics.latchupImmune ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> SEL IMMUNE (LETth &gt; 75 MeV·cm²/mg)
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> VULNERABLE TO DESTRUCTIVE LATCH-UP
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  {metrics.latchupImmune
                    ? "Silicon devices incorporate Silicon-On-Insulator (SOI) or triple-modular redundancy (TMR) architectures, preventing parasitic PNPN thyristor triggering from heavy ions."
                    : "COTS bulk CMOS transistors have not been de-risked against parasitic PNPN latch-up. A current-limiting watchdog circuit and automatic power cycle switch is mandatory to prevent gate oxide destruction."}
                </p>
              </div>

              {/* Radiation Physics Specs Table */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Total Absorbed Mission Dose</span>
                  <span className="text-cyan-400 font-bold">{metrics.totalMissionTidKrad} krad(Si)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Component Radiation Capability</span>
                  <span className="text-white font-bold">{metrics.componentTidToleranceKrad} krad(Si) rated</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Aluminium Shield Areal Mass</span>
                  <span className="text-purple-400 font-bold">{metrics.shieldMassKgM2} kg per m² of chassis</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radiation Design Margin (RDM)</span>
                  <span className={`font-bold ${metrics.meetsNasaRdm ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.rdm}x ({metrics.meetsNasaRdm ? "Complies with NASA EEE-INST-002" : "Below 2.0x Requirement"})
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
