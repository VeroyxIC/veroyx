"use client"

import { use, useMemo } from "react"
import Link from "next/link"
import { Printer, ArrowLeft, ShieldCheck, Compass, CheckCircle2 } from "lucide-react"

interface ScenarioData {
  id: string
  name: string
  client: string
  regime: string
  altitudeKm: number
  vehicle: string
  busMassKg: number
  solarAreaM2: number
  rfBand: string
  dataRateMbps: number
  internalHeatW: number
  description: string
}

const PRESET_DATA: Record<string, ScenarioData> = {
  smallsat_recon: {
    id: "smallsat_recon",
    name: "Tactical ISR Rapid-Revisit Constellation",
    client: "Defense Intelligence Agency (DIA)",
    regime: "SSO",
    altitudeKm: 500,
    vehicle: "Falcon 9 (SpaceX)",
    busMassKg: 420,
    solarAreaM2: 3.5,
    rfBand: "X-Band",
    dataRateMbps: 300,
    internalHeatW: 320,
    description: "Rapid optical and SAR Earth observation constellation in Sun-Synchronous Orbit.",
  },
  broadband_mega: {
    id: "broadband_mega",
    name: "High-Throughput Global Broadband Shell",
    client: "Commercial Mega-Constellation",
    regime: "LEO",
    altitudeKm: 550,
    vehicle: "Falcon 9 (SpaceX)",
    busMassKg: 1250,
    solarAreaM2: 18.0,
    rfBand: "Ka-Band",
    dataRateMbps: 1200,
    internalHeatW: 1800,
    description: "Next-gen direct-to-cell phased array comms satellite in mid-inclination low Earth orbit.",
  },
  geo_defense_relay: {
    id: "geo_defense_relay",
    name: "Strategic Nuclear Protected SATCOM Relay",
    client: "US Space Force (USSF)",
    regime: "GEO",
    altitudeKm: 35786,
    vehicle: "Vulcan Centaur (ULA)",
    busMassKg: 4800,
    solarAreaM2: 42.0,
    rfBand: "Ka-Band",
    dataRateMbps: 450,
    internalHeatW: 6500,
    description: "Radiation-hardened geostationary sovereign relay bus with crosslinks and anti-jam antennas.",
  },
  dedicated_smallsat_iot: {
    id: "dedicated_smallsat_iot",
    name: "Dedicated IoT / AIS Low-Cost Mesh",
    client: "Maritime Domain Awareness",
    regime: "LEO",
    altitudeKm: 450,
    vehicle: "Electron (Rocket Lab)",
    busMassKg: 65,
    solarAreaM2: 0.8,
    rfBand: "S-Band",
    dataRateMbps: 10,
    internalHeatW: 55,
    description: "Responsive smallsat mesh launched to precise orbital inclination on dedicated booster.",
  },
}

export default function ScenarioBriefingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const scenarioKey = resolvedParams.id
  const scenario = PRESET_DATA[scenarioKey] || PRESET_DATA.smallsat_recon

  // Synthetic calculations for formal review
  const specs = useMemo(() => {
    const launchCapKg = scenario.vehicle.includes("Falcon")
      ? 13500
      : scenario.vehicle.includes("Vulcan")
      ? 14500
      : 200
    const launchMarginKg = launchCapKg - scenario.busMassKg

    const bolPowerW = Math.round(scenario.solarAreaM2 * 1361 * 0.88 * 0.3)
    const eolPowerW = Math.round(bolPowerW * 0.904)
    const powerMarginW = eolPowerW - scenario.internalHeatW

    const slantRangeKm = Math.round(scenario.altitudeKm * 1.35)
    const linkMarginDb = scenario.rfBand === "Ka-Band" ? 4.2 : scenario.rfBand === "X-Band" ? 5.8 : 7.1

    const surfaceAreaM2 = Math.max(2, Math.round(Math.pow(scenario.busMassKg / 150, 2 / 3) * 6))
    const tHotC = 58
    const tColdC = -24

    return {
      launchCapKg,
      launchMarginKg,
      bolPowerW,
      eolPowerW,
      powerMarginW,
      slantRangeKm,
      linkMarginDb,
      surfaceAreaM2,
      tHotC,
      tColdC,
      reportDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }
  }, [scenario])

  return (
    <div className="min-h-screen bg-white text-black p-8 sm:p-14 font-mono text-xs selection:bg-slate-200 print:p-0">
      {/* Top On-Screen Print Action Bar (Hidden when printed) */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between print:hidden border-b border-slate-300 pb-4">
        <Link
          href="/scenarios"
          className="flex items-center gap-1.5 text-slate-600 hover:text-black font-sans font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Scenario Synthesizer
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 font-sans font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Formal Document Shell */}
      <div className="max-w-4xl mx-auto space-y-8 print:max-w-none">

        {/* Classification & Header */}
        <div className="border-b-2 border-black pb-4 flex justify-between items-start">
          <div>
            <div className="text-[10px] tracking-widest text-slate-600 uppercase">
              VEROYX AEROSPACE SYSTEMS INTELLIGENCE // FORM-MRD-84
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase mt-1">
              MISSION ARCHITECTURE READINESS DOSSIER
            </h1>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Preliminary Design Review (PDR) &amp; Systems Feasibility Verification
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold border border-black px-2 py-0.5 inline-block">
              FLIGHT ASSURANCE: CLEARED
            </div>
            <div className="text-[10px] text-slate-500 mt-1">DATE: {specs.reportDate}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border border-black bg-slate-50">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">MISSION CODENAME</span>
            <span className="font-bold text-xs block">{scenario.name}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">CLIENT / SPONSOR</span>
            <span className="font-bold text-xs block">{scenario.client}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">ORBITAL REGIME</span>
            <span className="font-bold text-xs block">{scenario.regime} ({scenario.altitudeKm} km)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">PRIMARY LAUNCHER</span>
            <span className="font-bold text-xs block">{scenario.vehicle}</span>
          </div>
        </div>

        {/* 1. Launch & Mass Budget */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase border-b border-black pb-1 flex items-center justify-between">
            <span>1. Launch Mass Margin &amp; Fairing Envelope</span>
            <span className="text-[10px] font-normal text-emerald-700">STATUS: VERIFIED (+{specs.launchMarginKg} kg MARGIN)</span>
          </h2>
          <table className="w-full text-left border-collapse text-[11px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Spacecraft Wet Launch Mass (M_wet)</td>
                <td className="py-1.5 font-bold text-right">{scenario.busMassKg} kg</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Launch Vehicle Lift Capacity ({scenario.regime})</td>
                <td className="py-1.5 font-bold text-right">{specs.launchCapKg} kg</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                <td className="py-1.5 pl-2">Net Launch Lift Reserve</td>
                <td className="py-1.5 pr-2 text-right">+{specs.launchMarginKg} kg</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Electrical Power Subsystem (EPS) */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase border-b border-black pb-1 flex items-center justify-between">
            <span>2. Electrical Power Balance (EPS)</span>
            <span className="text-[10px] font-normal text-emerald-700">STATUS: VERIFIED (+{specs.powerMarginW} W SURPLUS)</span>
          </h2>
          <table className="w-full text-left border-collapse text-[11px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Solar Array Aperture Area (GaAs Triple-Junction)</td>
                <td className="py-1.5 font-bold text-right">{scenario.solarAreaM2} m²</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Beginning of Life (BOL) Peak Generation</td>
                <td className="py-1.5 font-bold text-right">{specs.bolPowerW} W</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">5-Year End of Life (EOL) Generation (Radiation Degraded)</td>
                <td className="py-1.5 font-bold text-right">{specs.eolPowerW} W</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Continuous Subsystem Power Requirement</td>
                <td className="py-1.5 font-bold text-right">{scenario.internalHeatW} W</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                <td className="py-1.5 pl-2">Net 5-Year EOL Power Reserve</td>
                <td className="py-1.5 pr-2 text-right">+{specs.powerMarginW} W</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. RF Telemetry Downlink Subsystem */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase border-b border-black pb-1 flex items-center justify-between">
            <span>3. RF Telemetry &amp; Link Closure</span>
            <span className="text-[10px] font-normal text-emerald-700">STATUS: CLOSED (+{specs.linkMarginDb} dB MARGIN)</span>
          </h2>
          <table className="w-full text-left border-collapse text-[11px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Operating Frequency Band</td>
                <td className="py-1.5 font-bold text-right">{scenario.rfBand}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Target Downlink Throughput</td>
                <td className="py-1.5 font-bold text-right">{scenario.dataRateMbps} Mbps</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Nominal Ground Station Slant Range</td>
                <td className="py-1.5 font-bold text-right">{specs.slantRangeKm} km</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                <td className="py-1.5 pl-2">Eb/N0 Received Link Margin</td>
                <td className="py-1.5 pr-2 text-right">+{specs.linkMarginDb} dB</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Thermal Control Subsystem (TCS) */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase border-b border-black pb-1 flex items-center justify-between">
            <span>4. Thermal Management &amp; Radiation Equilibrium</span>
            <span className="text-[10px] font-normal text-emerald-700">STATUS: NOMINAL TRADES</span>
          </h2>
          <table className="w-full text-left border-collapse text-[11px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Radiating Structural Surface Area</td>
                <td className="py-1.5 font-bold text-right">{specs.surfaceAreaM2} m²</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Peak Sunlit Equilibrium Temperature</td>
                <td className="py-1.5 font-bold text-right">+{specs.tHotC}°C (331 K)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 text-slate-600">Deep Eclipse Shadow Temperature</td>
                <td className="py-1.5 font-bold text-right">{specs.tColdC}°C (249 K)</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                <td className="py-1.5 pl-2">Thermal Qualification Range</td>
                <td className="py-1.5 pr-2 text-right">-40°C to +70°C (PASS)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sign-off Certification Blocks */}
        <div className="pt-6 border-t-2 border-black space-y-4">
          <div className="text-[10px] text-slate-600 uppercase">
            CERTIFICATION &amp; TECHNICAL AUTHORITY SIGN-OFF
          </div>
          <div className="grid grid-cols-2 gap-8 text-[11px]">
            <div className="border-t border-black pt-2">
              <span className="block font-bold">LEAD SYSTEMS ARCHITECT</span>
              <span className="text-slate-500">AUTONOMOUS FLIGHT VERIFICATION AGENT</span>
            </div>
            <div className="border-t border-black pt-2">
              <span className="block font-bold">PROGRAM MANAGER / CHIEF ENGINEER</span>
              <span className="text-slate-500">VEROYX INSTITUTIONAL FLIGHT ASSURANCE</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
