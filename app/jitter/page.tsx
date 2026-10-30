"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Activity, 
  RotateCw, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Crosshair,
  Waves,
  Eye,
  Sliders
} from "lucide-react"

interface JitterPreset {
  name: string
  classType: string
  maxWheelRpm: number
  staticImbalanceGmm: number
  dynamicImbalanceGmm2: number
  wheelMassKg: number
  isolationType: "Hard-Mounted (No Isolator)" | "Elastomeric Bushing Damper" | "Tuned Hexapod Stewart Platform (Vis)"
  isolatorCornerFreqHz: number
  structuralResonanceHz: number
  structuralQFactor: number
  losSensitivityUradPerN: number
  description: string
}

const JITTER_PRESETS: Record<string, JitterPreset> = {
  high_res_sub30cm: {
    name: "Sub-30cm High-Res Optical Recon",
    classType: "Optical Earth Observation",
    maxWheelRpm: 4800,
    staticImbalanceGmm: 0.15,
    dynamicImbalanceGmm2: 3.5,
    wheelMassKg: 4.5,
    isolationType: "Tuned Hexapod Stewart Platform (Vis)",
    isolatorCornerFreqHz: 18.0,
    structuralResonanceHz: 65.0,
    structuralQFactor: 25.0,
    losSensitivityUradPerN: 0.85,
    description: "Stringent sub-microradian optical payload isolated with an active-passive hexapod damping platform.",
  },
  commercial_smallsat_cots: {
    name: "Agile LEO Smallsat Commercial Bus",
    classType: "Commercial Smallsat",
    maxWheelRpm: 6000,
    staticImbalanceGmm: 0.8,
    dynamicImbalanceGmm2: 12.0,
    wheelMassKg: 1.8,
    isolationType: "Hard-Mounted (No Isolator)",
    isolatorCornerFreqHz: 120.0,
    structuralResonanceHz: 45.0,
    structuralQFactor: 15.0,
    losSensitivityUradPerN: 2.2,
    description: "Standard COTS reaction wheels bolted directly to payload deck without dedicated elastomeric isolation.",
  },
  lasercom_inter_satellite: {
    name: "Optical Lasercom ISL Terminal",
    classType: "Laser Intersatellite Link (ISL)",
    maxWheelRpm: 3600,
    staticImbalanceGmm: 0.3,
    dynamicImbalanceGmm2: 5.0,
    wheelMassKg: 3.2,
    isolationType: "Elastomeric Bushing Damper",
    isolatorCornerFreqHz: 25.0,
    structuralResonanceHz: 80.0,
    structuralQFactor: 20.0,
    losSensitivityUradPerN: 1.4,
    description: "Precision laser tracking head requiring narrow jitter beam budget to maintain 10 Gbps coherent lock.",
  },
}

export default function ReactionWheelJitterPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("high_res_sub30cm")
  const [wheelRpm, setWheelRpm] = useState<number>(4800)
  const [staticImbalanceGmm, setStaticImbalanceGmm] = useState<number>(0.15)
  const [dynamicImbalanceGmm2, setDynamicImbalanceGmm2] = useState<number>(3.5)
  const [isolationType, setIsolationType] = useState<string>("Tuned Hexapod Stewart Platform (Vis)")
  const [structuralResonanceHz, setStructuralResonanceHz] = useState<number>(65.0)

  const preset = JITTER_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = JITTER_PRESETS[key]
    setSelectedPresetKey(key)
    setWheelRpm(p.maxWheelRpm)
    setStaticImbalanceGmm(p.staticImbalanceGmm)
    setDynamicImbalanceGmm2(p.dynamicImbalanceGmm2)
    setIsolationType(p.isolationType)
    setStructuralResonanceHz(p.structuralResonanceHz)
  }

  // NASA-STD-5020 & Micro-Vibration Mechanics Calculations
  const metrics = useMemo(() => {
    // Fundamental wheel spin frequency (Hz)
    const spinFreqHz = wheelRpm / 60
    const omegaRadS = spinFreqHz * 2 * Math.PI

    // 1. Static Imbalance Centrifugal Disturbance Force (Newtons)
    // F_rad = U_s * omega^2
    // U_s in g*mm = (U_s * 1e-6) kg*m
    const uStaticKgM = staticImbalanceGmm * 1e-6
    const fDisturbanceN = uStaticKgM * Math.pow(omegaRadS, 2)
    const fDisturbanceMilliN = Math.round(fDisturbanceN * 1000 * 10) / 10

    // 2. Dynamic Imbalance Rocking Torque (Newton-meters)
    // T_dyn = U_d * omega^2
    // U_d in g*mm^2 = (U_d * 1e-9) kg*m^2
    const uDynamicKgM2 = dynamicImbalanceGmm2 * 1e-9
    const tDisturbanceNm = uDynamicKgM2 * Math.pow(omegaRadS, 2)
    const tDisturbanceMicroNm = Math.round(tDisturbanceNm * 1e6 * 10) / 10

    // 3. Vibration Isolation System (VIS) Transmissibility H_iso
    let isolatorCornerHz = 18.0
    if (isolationType.includes("Hard-Mounted")) isolatorCornerHz = 200.0
    else if (isolationType.includes("Elastomeric")) isolatorCornerHz = 28.0

    // 2nd order low-pass filter transmissibility:
    // T_iso ~ 1 / sqrt( (1 - (f/fc)^2)^2 + (2*zeta*f/fc)^2 )
    const zetaIso = 0.15
    const freqRatioIso = spinFreqHz / Math.max(1, isolatorCornerHz)
    const transmissibilityIso = freqRatioIso > 1.414
      ? 1 / Math.sqrt(Math.pow(1 - Math.pow(freqRatioIso, 2), 2) + Math.pow(2 * zetaIso * freqRatioIso, 2))
      : 1.0

    // Attenuation in decibels (dB)
    const attenuationDb = Math.round(20 * Math.log10(Math.max(0.001, transmissibilityIso)) * 10) / 10

    // 4. Structural Dynamic Amplification (Q-Factor)
    // Check proximity to structural resonance
    const fn = structuralResonanceHz
    const freqRatioStruct = spinFreqHz / Math.max(1, fn)
    const zetaStruct = 1 / (2 * preset.structuralQFactor)
    const structAmplification = 1 / Math.sqrt(
      Math.pow(1 - Math.pow(freqRatioStruct, 2), 2) + Math.pow(2 * zetaStruct * freqRatioStruct, 2)
    )

    // Net transmitted force to payload deck (N)
    const netTransmittedForceN = fDisturbanceN * transmissibilityIso * Math.min(preset.structuralQFactor, structAmplification)
    const netTransmittedForceMilliN = Math.round(netTransmittedForceN * 1000 * 10) / 10

    // 5. Line-of-Sight (LOS) Pointing Jitter (microradians RMS)
    // Jitter = F_net * sensitivity (urad / N)
    const losJitterUrad = Math.round(netTransmittedForceN * preset.losSensitivityUradPerN * 100) / 100

    // Threshold check: sub-microradian optical missions require Jitter < 1.0 urad; lasercom < 2.5 urad
    const maxAllowableJitterUrad = preset.classType.includes("Laser") ? 2.5 : 1.0
    const jitterPassed = losJitterUrad <= maxAllowableJitterUrad

    return {
      spinFreqHz: spinFreqHz.toFixed(1),
      fDisturbanceMilliN,
      tDisturbanceMicroNm,
      attenuationDb,
      netTransmittedForceMilliN,
      losJitterUrad,
      maxAllowableJitterUrad,
      jitterPassed,
    }
  }, [wheelRpm, staticImbalanceGmm, dynamicImbalanceGmm2, isolationType, structuralResonanceHz, preset])

  const exportJitterCSV = () => {
    const csv = `SPACECRAFT REACTION WHEEL JITTER & LOS STABILITY SPEC
Preset System,${preset.name}
Payload Application,${preset.classType}
Wheel Operating Speed,${wheelRpm} RPM (${metrics.spinFreqHz} Hz fundamental)
Static Imbalance,${staticImbalanceGmm} g*mm
Dynamic Imbalance,${dynamicImbalanceGmm2} g*mm2
Raw Radial Centrifugal Force,${metrics.fDisturbanceMilliN} mN
Raw Dynamic Rocking Torque,${metrics.tDisturbanceMicroNm} uN*m
Vibration Isolation Architecture,${isolationType}
Isolator Transmissibility Attenuation,${metrics.attenuationDb} dB
Spacecraft Structural Resonance,${structuralResonanceHz} Hz (Q=${preset.structuralQFactor})
Net Transmitted Force to Payload,${metrics.netTransmittedForceMilliN} mN
Line-of-Sight (LOS) Pointing Jitter,${metrics.losJitterUrad} urad RMS (Limit: <= ${metrics.maxAllowableJitterUrad} urad)
Pointing Jitter Stability Verdict,${metrics.jitterPassed ? "LOS JITTER CLEARED (STABLE)" : "JITTER EXCEEDS APERTURE BUDGET"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-reaction-wheel-jitter-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Waves className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              NASA-STD-5020 Reaction Wheel Micro-Vibration &amp; LOS Jitter Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              REACTION WHEEL JITTER &amp; LOS STABILITY
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model static/dynamic wheel imbalance forces, structural resonance amplification, vibration isolation transmissibility, and sub-microradian optical Line-of-Sight (LOS) jitter.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportJitterCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT JITTER SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(JITTER_PRESETS).map(([k, v]) => (
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
              RWA Imbalance &amp; Isolation
            </div>

            {/* Wheel Speed */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">WHEEL OPERATING SPEED</label>
                <span className="text-cyan-400 font-bold">{wheelRpm} RPM</span>
              </div>
              <input
                type="range"
                min={500}
                max={7200}
                step={100}
                value={wheelRpm}
                onChange={(e) => setWheelRpm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1000 RPM (Low)</span>
                <span>{metrics.spinFreqHz} Hz Spin</span>
                <span>7200 RPM (Max)</span>
              </div>
            </div>

            {/* Imbalances */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">STATIC (g&middot;mm)</label>
                <input
                  type="number"
                  step={0.05}
                  value={staticImbalanceGmm}
                  onChange={(e) => setStaticImbalanceGmm(Math.max(0.01, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DYNAMIC (g&middot;mm²)</label>
                <input
                  type="number"
                  step={0.5}
                  value={dynamicImbalanceGmm2}
                  onChange={(e) => setDynamicImbalanceGmm2(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Vibration Isolation Architecture */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">VIBRATION ISOLATOR MOUNT</label>
              <select
                value={isolationType}
                onChange={(e) => setIsolationType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value="Hard-Mounted (No Isolator)">Hard-Mounted (No Isolator - Direct Deck Transmission)</option>
                <option value="Elastomeric Bushing Damper">Elastomeric Bushing Damper (fc ~ 28 Hz)</option>
                <option value="Tuned Hexapod Stewart Platform (Vis)">Tuned Hexapod Stewart Platform (fc ~ 18 Hz Active/Passive)</option>
              </select>
            </div>

            {/* Structural Resonance Frequency */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">STRUCTURAL NATURAL FREQ</label>
                <span className="text-purple-400 font-bold">{structuralResonanceHz} HZ</span>
              </div>
              <input
                type="range"
                min={20}
                max={150}
                step={5}
                value={structuralResonanceHz}
                onChange={(e) => setStructuralResonanceHz(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Payload deck fundamental structural bending mode</span>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">PAYLOAD STABILITY CLASS:</div>
              <p className="text-slate-300 font-mono text-[10px]">{preset.classType}</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.jitterPassed ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  LOS POINTING JITTER
                </div>
                <div className={`text-3xl font-black ${metrics.jitterPassed ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.losJitterUrad} µrad
                </div>
                <div className="text-[10px] text-slate-500">Aperture Limit: &le; {metrics.maxAllowableJitterUrad} µrad RMS</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Waves className="w-3 h-3 text-purple-400" /> ISOLATOR ATTENUATION
                </div>
                <div className="text-3xl font-black text-white">{metrics.attenuationDb} dB</div>
                <div className="text-[10px] text-purple-400">At {metrics.spinFreqHz} Hz Spin Frequency</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-cyan-400" /> TRANSMITTED FORCE
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.netTransmittedForceMilliN} mN</div>
                <div className="text-[10px] text-slate-500">Raw Radial: {metrics.fDisturbanceMilliN} mN</div>
              </div>
            </div>

            {/* Micro-Vibrations & Jitter Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Harmonics Transmissibility &amp; Focal Plane Jitter Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.jitterPassed
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.jitterPassed ? "POINTING JITTER CLEARED" : "FOCAL PLANE BLUR DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">MICRO-VIBRATION DYNAMIC COUPLING</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  Rotating at <strong className="text-white">{wheelRpm} RPM ({metrics.spinFreqHz} Hz)</strong>, static imbalance produces <strong className="text-white">{metrics.fDisturbanceMilliN} mN</strong> of centrifugal disturbance force, accompanied by <strong className="text-white">{metrics.tDisturbanceMicroNm} µN&middot;m</strong> of dynamic rocking couple.
                  The selected {isolationType} provides <strong className="text-purple-400">{metrics.attenuationDb} dB</strong> of isolation attenuation, transmitting <strong className="text-cyan-400">{metrics.netTransmittedForceMilliN} mN</strong> into the bus structure to induce <strong className={metrics.jitterPassed ? "text-emerald-400" : "text-red-400"}>{metrics.losJitterUrad} µrad RMS</strong> of optical LOS jitter.
                  {!metrics.jitterPassed && (
                    <span className="text-red-400 block mt-1">
                      Pointing stability violation: LOS jitter exceeds the allowable budget ({metrics.maxAllowableJitterUrad} µrad), blurring detector pixels and degrading resolution. Upgrade to a tuned hexapod isolator or lower wheel spin speed below structural resonance.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Wheel Spin Fundamental Frequency (1x)</span>
                  <span className="text-white font-bold">{metrics.spinFreqHz} Hz</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Raw Radial Imbalance Force</span>
                  <span className="text-cyan-400 font-bold">{metrics.fDisturbanceMilliN} mN</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Dynamic Imbalance Rocking Couple</span>
                  <span className="text-purple-400 font-bold">{metrics.tDisturbanceMicroNm} µN&middot;m</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Net Line-of-Sight Jitter Amplitude</span>
                  <span className={`font-bold ${metrics.jitterPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.losJitterUrad} µrad RMS (Limit: &le; {metrics.maxAllowableJitterUrad} µrad)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Optical Pointing Stability Status</span>
                  <span className={`font-bold ${metrics.jitterPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.jitterPassed ? "PASS (WITHIN APERTURE POINTING BUDGET)" : "FAIL (ISOLATION UPGRADE REQUIRED)"}
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
