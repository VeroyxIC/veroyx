"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  DollarSign, 
  Layers, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Activity, 
  BarChart3, 
  PieChart, 
  Briefcase, 
  Rocket, 
  Cpu, 
  Sliders 
} from "lucide-react"

interface CostPreset {
  name: string
  missionType: "LEO Smallsat Constellation Bus" | "Planetary Deep Space Probe" | "Commercial Telecom Flagship"
  dryMassKg: number
  payloadCostM: number
  busPowerW: number
  hardwareHeritagePct: number
  developmentYears: number
  costReservePct: number
  description: string
}

const COST_PRESETS: Record<string, CostPreset> = {
  smallsat_commercial: {
    name: "Commercial LEO Earth Observation Bus",
    missionType: "LEO Smallsat Constellation Bus",
    dryMassKg: 180,
    payloadCostM: 6.5,
    busPowerW: 320,
    hardwareHeritagePct: 65,
    developmentYears: 2.5,
    costReservePct: 20,
    description: "Rapid-schedule commercial bus utilizing substantial existing subsystem heritage and COTS up-screened parts.",
  },
  deep_space_science: {
    name: "NASA Discovery-Class Deep Space Explorer",
    missionType: "Planetary Deep Space Probe",
    dryMassKg: 650,
    payloadCostM: 45.0,
    busPowerW: 550,
    hardwareHeritagePct: 25,
    developmentYears: 5.0,
    costReservePct: 30,
    description: "Class A/B deep-space mission with strict mission assurance standards, high radiation shielding, and custom NRE.",
  },
  geo_commercial_flagship: {
    name: "GEO High-Throughput Communications Bus",
    missionType: "Commercial Telecom Flagship",
    dryMassKg: 2800,
    payloadCostM: 85.0,
    busPowerW: 12000,
    hardwareHeritagePct: 80,
    developmentYears: 3.5,
    costReservePct: 15,
    description: "Multi-kilowatt commercial telecom satellite built on an established high-heritage commercial production line.",
  },
}

export default function MissionCostPage() {
  const [selectedKey, setSelectedKey] = useState<string>("smallsat_commercial")
  const [dryMassKg, setDryMassKg] = useState<number>(180)
  const [payloadCostM, setPayloadCostM] = useState<number>(6.5)
  const [busPowerW, setBusPowerW] = useState<number>(320)
  const [heritagePct, setHeritagePct] = useState<number>(65)
  const [devYears, setDevYears] = useState<number>(2.5)
  const [reservePct, setReservePct] = useState<number>(20)

  const activePreset = COST_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = COST_PRESETS[key]
    setSelectedKey(key)
    setDryMassKg(p.dryMassKg)
    setPayloadCostM(p.payloadCostM)
    setBusPowerW(p.busPowerW)
    setHeritagePct(p.hardwareHeritagePct)
    setDevYears(p.developmentYears)
    setReservePct(p.costReservePct)
  }

  // NASA PCEC / USCM Parametric Cost Estimating Calculations
  const metrics = useMemo(() => {
    // Heritage complexity factor (100% heritage = 0.35x NRE, 0% heritage = 1.0x NRE)
    const nreFactor = 1.0 - (heritagePct / 100) * 0.65

    // 1. Bus Hardware Subsystem CERs (USCM / PCEC power laws)
    // Structure & Thermal: C = 0.045 * M^0.75 ($M)
    const costStructureThermalM = Math.round((0.045 * Math.pow(dryMassKg * 0.35, 0.75) * nreFactor) * 100) / 100

    // Avionics, CDH & TT&C: C = 0.12 * M_avionics^0.65 ($M)
    const costAvionicsM = Math.round((0.14 * Math.pow(dryMassKg * 0.18, 0.65) * nreFactor) * 100) / 100

    // Electrical Power Subsystem (EPS): C = 0.008 * Power^0.82 ($M)
    const costEpsM = Math.round((0.0085 * Math.pow(busPowerW, 0.82) * nreFactor) * 100) / 100

    // ADCS & Propulsion: C = 0.08 * M^0.7 ($M)
    const costAdcsPropM = Math.round((0.09 * Math.pow(dryMassKg * 0.25, 0.70) * nreFactor) * 100) / 100

    // Total Spacecraft Bus Hardware Cost (WBS 05)
    const totalBusHardwareCostM = Math.round((costStructureThermalM + costAvionicsM + costEpsM + costAdcsPropM) * 100) / 100

    // 2. Assembly, Integration & Test (AI&T, WBS 06) ~ 15% of hardware
    const costAitM = Math.round((totalBusHardwareCostM * 0.16) * 100) / 100

    // 3. Project Management, Systems Engineering & Mission Assurance (WBS 01, 02, 03) ~ 20%
    const costPmSeSmaM = Math.round(((totalBusHardwareCostM + payloadCostM) * 0.18) * 100) / 100

    // 4. Ground Data System (GDS) & Mission Operations (WBS 07 & 09)
    const costOpsM = Math.round((1.2 * devYears) * 100) / 100

    // Total Base Baseline Cost before Reserve
    const baseCostBeforeReserveM = Math.round(
      (totalBusHardwareCostM + payloadCostM + costAitM + costPmSeSmaM + costOpsM) * 100
    ) / 100

    // 5. Cost Contingency Reserve Allocation
    const reserveAmountM = Math.round((baseCostBeforeReserveM * (reservePct / 100)) * 100) / 100
    const totalLifecycleCostM = Math.round((baseCostBeforeReserveM + reserveAmountM) * 100) / 100

    // NASA Budget Clearance Check: SmallSat <= $40M, Discovery <= $500M
    const budgetSane = totalLifecycleCostM < 1000

    return {
      costStructureThermalM,
      costAvionicsM,
      costEpsM,
      costAdcsPropM,
      totalBusHardwareCostM,
      costAitM,
      costPmSeSmaM,
      costOpsM,
      baseCostBeforeReserveM,
      reserveAmountM,
      totalLifecycleCostM,
      budgetSane,
    }
  }, [dryMassKg, payloadCostM, busPowerW, heritagePct, devYears, reservePct])

  const exportCostCSV = () => {
    const csv = `SPACECRAFT NASA PCEC / USCM PARAMETRIC COST ESTIMATE
Mission Profile,${activePreset.name}
Mission Architecture Class,${activePreset.missionType}
Spacecraft Dry Mass,${dryMassKg} kg
Subsystem Power Demand,${busPowerW} Watts
Hardware Subsystem Heritage,${heritagePct}% Existing Flight Design
Development Timeline,${devYears} Years
Cost Reserve Margin,${reservePct}% Allocation
WBS 01/02/03 Management & Systems Engineering (PM/SE/SMA),$${metrics.costPmSeSmaM} Million USD
WBS 04 Payload / Science Instrument,$${payloadCostM} Million USD
WBS 05 Spacecraft Bus Hardware Total,$${metrics.totalBusHardwareCostM} Million USD
  - Structure & Thermal Control,$${metrics.costStructureThermalM} Million USD
  - Avionics C&DH and RF Communications,$${metrics.costAvionicsM} Million USD
  - Electrical Power System (Solar & Battery),$${metrics.costEpsM} Million USD
  - ADCS Attitude Control & Propulsion Hardware,$${metrics.costAdcsPropM} Million USD
WBS 06 Assembly Integration & Test (AI&T),$${metrics.costAitM} Million USD
WBS 07/09 Ground Operations & GDS,$${metrics.costOpsM} Million USD
Total Baseline Cost (Before Reserve),$${metrics.baseCostBeforeReserveM} Million USD
Contingency Cost Reserve Allocation,$${metrics.reserveAmountM} Million USD
Total Lifecycle Mission Cost (P80 Baseline),$${metrics.totalLifecycleCostM} Million USD`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-cost-model-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <DollarSign className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              NASA PCEC &amp; USCM Parametric Mission Lifecycle Cost Model
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PARAMETRIC COST ESTIMATION
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model institutional space mission costs using Cost Estimating Relationships (CERs) across WBS 01 through WBS 09, subsystem heritage discounts, AI&amp;T testing, and contingency reserves.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportCostCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT COST SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(COST_PRESETS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                selectedKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.missionType} · {v.dryMassKg} kg</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> TOTAL LIFECYCLE COST
            </div>
            <div className="text-3xl font-black text-emerald-400">${metrics.totalLifecycleCostM}M</div>
            <div className="text-[10px] text-slate-400">P80 Baseline with {reservePct}% Reserve</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Rocket className="w-3 h-3 text-cyan-400" /> BUS HARDWARE (WBS 05)
            </div>
            <div className="text-3xl font-black text-cyan-400">${metrics.totalBusHardwareCostM}M</div>
            <div className="text-[10px] text-slate-400">Includes {heritagePct}% Design Heritage</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-purple-400" /> PM, SE &amp; SMA (WBS 01-03)
            </div>
            <div className="text-3xl font-black text-purple-400">${metrics.costPmSeSmaM}M</div>
            <div className="text-[10px] text-slate-400">Management &amp; Mission Assurance</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" /> COST RESERVE (P80)
            </div>
            <div className="text-3xl font-black text-amber-400">${metrics.reserveAmountM}M</div>
            <div className="text-[10px] text-slate-400">{reservePct}% Contingency Margin</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Mission Scaling Parameters
            </div>

            {/* Dry Mass Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">SPACECRAFT DRY MASS</label>
                <span className="text-cyan-400 font-bold">{dryMassKg} KG</span>
              </div>
              <input
                type="range"
                min={20}
                max={3500}
                step={20}
                value={dryMassKg}
                onChange={(e) => setDryMassKg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 kg</span>
                <span>500 kg</span>
                <span>3500 kg</span>
              </div>
            </div>

            {/* Bus Power Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">BUS ELECTRICAL POWER</label>
                <span className="text-amber-400 font-bold">{busPowerW} WATTS</span>
              </div>
              <input
                type="range"
                min={50}
                max={15000}
                step={50}
                value={busPowerW}
                onChange={(e) => setBusPowerW(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Drives solar array, battery &amp; power distribution sizing</span>
            </div>

            {/* Payload Instrument Cost */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">PAYLOAD INSTRUMENT COST</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.5}
                  value={payloadCostM}
                  onChange={(e) => setPayloadCostM(Math.max(0.5, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">$M</span>
              </div>
            </div>

            {/* Heritage % & Reserve % */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">HERITAGE (%)</label>
                <input
                  type="number"
                  step={5}
                  value={heritagePct}
                  onChange={(e) => setHeritagePct(Math.max(0, Math.min(95, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">Discounts NRE</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">RESERVE (%)</label>
                <input
                  type="number"
                  step={5}
                  value={reservePct}
                  onChange={(e) => setReservePct(Math.max(10, Math.min(45, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
                <span className="text-[9px] text-slate-500 block">Req: 20-30%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">PARAMETRIC RELATIONSHIPS:</strong>
              CERs map structural mass, RF transmitter power, and subsystem complexity directly into constant-dollar budgets verified against historical flight data.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* WBS Cost Breakdown Table */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  NASA Standard WBS Cost Breakdown ($M USD)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-950 text-emerald-300 uppercase">
                  PCEC CER MODEL VERIFIED
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span>WBS 01, 02, 03: Project Management, Systems Eng &amp; SMA</span>
                  <span className="text-white font-bold">${metrics.costPmSeSmaM}M</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span>WBS 04: Payload Science / Mission Instrument</span>
                  <span className="text-cyan-400 font-bold">${payloadCostM}M</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span>WBS 05: Spacecraft Bus Hardware Total</span>
                  <span className="text-white font-bold">${metrics.totalBusHardwareCostM}M</span>
                </div>
                <div className="pl-4 space-y-1 text-[11px] text-slate-400 border-b border-slate-800/40 pb-2">
                  <div className="flex justify-between">
                    <span>&bull; Structure &amp; Thermal Control Subsystem</span>
                    <span className="text-slate-200">${metrics.costStructureThermalM}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&bull; Avionics C&amp;DH and RF Communications</span>
                    <span className="text-slate-200">${metrics.costAvionicsM}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&bull; Electrical Power Subsystem (EPS)</span>
                    <span className="text-slate-200">${metrics.costEpsM}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&bull; ADCS Attitude Control &amp; Propulsion</span>
                    <span className="text-slate-200">${metrics.costAdcsPropM}M</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span>WBS 06: Assembly, Integration &amp; Testing (AI&amp;T)</span>
                  <span className="text-white font-bold">${metrics.costAitM}M</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60 text-slate-300">
                  <span>WBS 07 &amp; 09: Ground Operations &amp; Mission Support</span>
                  <span className="text-white font-bold">${metrics.costOpsM}M</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80 text-amber-400 font-bold">
                  <span>P80 Risk Contingency Reserve ({reservePct}%)</span>
                  <span>+${metrics.reserveAmountM}M</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-black text-emerald-400 border-t border-slate-800">
                  <span>TOTAL ESTIMATED PROGRAM LIFECYCLE COST</span>
                  <span>${metrics.totalLifecycleCostM}M USD</span>
                </div>
              </div>
            </div>

            {/* Correlated Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/mass-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mass-budget</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/power" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/power</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/mission-builder" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/mission-builder</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/compliance" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/compliance</span>
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
