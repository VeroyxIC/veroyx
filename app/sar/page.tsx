"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Radio, 
  Activity, 
  Maximize2, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Sliders, 
  Zap, 
  Waves, 
  Layers 
} from "lucide-react"

interface SarPreset {
  name: string
  band: "X-Band (9.6 GHz)" | "C-Band (5.4 GHz)" | "L-Band (1.25 GHz)"
  frequencyGhz: number
  orbitAltitudeKm: number
  peakRfPowerW: number
  dutyCyclePct: number
  antennaLengthM: number
  antennaWidthM: number
  chirpBandwidthMhz: number
  incidenceAngleDeg: number
  noiseFigureDb: number
  description: string
}

const SAR_PRESETS: Record<string, SarPreset> = {
  high_res_x_band: {
    name: "Sub-Meter X-Band Commercial SAR (Stripmap)",
    band: "X-Band (9.6 GHz)",
    frequencyGhz: 9.6,
    orbitAltitudeKm: 515,
    peakRfPowerW: 3200,
    dutyCyclePct: 18,
    antennaLengthM: 3.2,
    antennaWidthM: 0.8,
    chirpBandwidthMhz: 300,
    incidenceAngleDeg: 35,
    noiseFigureDb: 3.5,
    description: "Compact active phased array radar delivering sub-meter spotlight and stripmap imagery for infrastructure and maritime monitoring.",
  },
  c_band_interferometry: {
    name: "Sentinel-1 Analogue C-Band InSAR",
    band: "C-Band (5.4 GHz)",
    frequencyGhz: 5.4,
    orbitAltitudeKm: 693,
    peakRfPowerW: 4500,
    dutyCyclePct: 12,
    antennaLengthM: 12.0,
    antennaWidthM: 1.3,
    chirpBandwidthMhz: 100,
    incidenceAngleDeg: 38,
    noiseFigureDb: 3.8,
    description: "Large 12-meter deployable waveguide array optimized for global repeat-pass interferometry (InSAR) and crustal deformation tracking.",
  },
  l_band_biomass: {
    name: "NISAR Analogue L-Band Polarimetric SAR",
    band: "L-Band (1.25 GHz)",
    frequencyGhz: 1.25,
    orbitAltitudeKm: 747,
    peakRfPowerW: 2800,
    dutyCyclePct: 10,
    antennaLengthM: 12.0, // Large reflector aperture
    antennaWidthM: 3.5,
    chirpBandwidthMhz: 40,
    incidenceAngleDeg: 42,
    noiseFigureDb: 2.8,
    description: "Penetrating L-band radar capable of measuring forest canopy biomass, sub-surface soil moisture, and polar ice shelf dynamics.",
  },
}

export default function SarPayloadPage() {
  const [selectedKey, setSelectedKey] = useState<string>("high_res_x_band")
  const [altitudeKm, setAltitudeKm] = useState<number>(515)
  const [peakPowerW, setPeakPowerW] = useState<number>(3200)
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(18)
  const [antennaLengthM, setAntennaLengthM] = useState<number>(3.2)
  const [antennaWidthM, setAntennaWidthM] = useState<number>(0.8)
  const [chirpBandwidthMhz, setChirpBandwidthMhz] = useState<number>(300)
  const [incidenceAngleDeg, setIncidenceAngleDeg] = useState<number>(35)

  const activePreset = SAR_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = SAR_PRESETS[key]
    setSelectedKey(key)
    setAltitudeKm(p.orbitAltitudeKm)
    setPeakPowerW(p.peakRfPowerW)
    setDutyCyclePct(p.dutyCyclePct)
    setAntennaLengthM(p.antennaLengthM)
    setAntennaWidthM(p.antennaWidthM)
    setChirpBandwidthMhz(p.chirpBandwidthMhz)
    setIncidenceAngleDeg(p.incidenceAngleDeg)
  }

  // SAR Radar Equations & Ambiguity Geometry
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const c = 299792458
    const kBoltzmann = 1.380649e-23
    const t0 = 290 // Standard noise temp (K)

    const wavelengthM = c / (activePreset.frequencyGhz * 1e9)
    const incRad = (incidenceAngleDeg * Math.PI) / 180

    // 1. Orbital Velocity & Slant Range Geometry
    const rOrbKm = rEarthKm + altitudeKm
    const vOrbMS = Math.sqrt((mu * 1e9) / (rOrbKm * 1000))
    const vGroundMS = vOrbMS * (rEarthKm / rOrbKm)

    // Slant range to ground target: R_slant = h / cos(theta_inc)
    const slantRangeKm = altitudeKm / Math.cos(incRad)
    const slantRangeM = slantRangeKm * 1000

    // 2. Spatial Resolutions (Azimuth & Ground Range)
    // Azimuth Resolution in Stripmap SAR: delta_az = L_antenna / 2
    const azimuthResolutionM = Math.round((antennaLengthM / 2) * 100) / 100

    // Ground Range Resolution: delta_gr = c / (2 * B * sin(theta_inc))
    const slantRangeResolutionM = c / (2 * (chirpBandwidthMhz * 1e6))
    const groundRangeResolutionM = Math.round((slantRangeResolutionM / Math.sin(incRad)) * 100) / 100

    // 3. PRF Selection Window (Doppler Centroid & Range Ambiguity Constraints)
    // Minimum PRF to avoid azimuth Doppler aliasing: PRF_min = 2 * v_ground / L_antenna
    const minPrfHz = Math.round((2 * vGroundMS) / antennaLengthM)

    // Maximum PRF to avoid range echo overlap across swath:
    // Swath width approx: W_ground = (lambda * R) / (W_antenna * cos(theta_inc))
    const swathWidthKm = Math.round(((wavelengthM * slantRangeM) / (antennaWidthM * Math.cos(incRad))) / 1000)
    const maxPrfHz = Math.round(c / (2 * (swathWidthKm * 1000 * Math.sin(incRad) + 15000))) // Buffer
    const selectedPrfHz = Math.round((minPrfHz + maxPrfHz) / 2)
    const prfValid = maxPrfHz > minPrfHz

    // 4. Antenna Gain (Transmit & Receive Phased Array Aperture)
    // G = (4 * pi * A_phys * eta_ap) / lambda^2
    const antennaAreaM2 = antennaLengthM * antennaWidthM
    const etaAperture = 0.65
    const antennaGainRatio = (4 * Math.PI * antennaAreaM2 * etaAperture) / Math.pow(wavelengthM, 2)
    const antennaGainDbi = Math.round((10 * Math.log10(antennaGainRatio)) * 10) / 10

    // 5. Radiometric Noise Equivalent Sigma Zero (NESZ in dB)
    // Average RF power: P_avg = P_peak * duty_cycle
    const avgPowerW = peakPowerW * (dutyCyclePct / 100)
    const totalLossDb = 4.5 // Two-way atmospheric + feedline + processing losses
    const totalLossRatio = Math.pow(10, totalLossDb / 10)
    const noiseFigureRatio = Math.pow(10, activePreset.noiseFigureDb / 10)

    // NESZ = (4 * (4*pi)^3 * R^4 * k * T0 * F_n * L * v_g * sin(inc)) / (P_avg * G^2 * lambda^3 * c)
    const numerator = 4 * Math.pow(4 * Math.PI, 3) * Math.pow(slantRangeM, 4) * kBoltzmann * t0 * noiseFigureRatio * totalLossRatio * vGroundMS * Math.sin(incRad)
    const denominator = avgPowerW * Math.pow(antennaGainRatio, 2) * Math.pow(wavelengthM, 3) * c
    const neszLinear = numerator / Math.max(1e-12, denominator)
    const neszDb = Math.round((10 * Math.log10(neszLinear)) * 10) / 10

    // Standard SAR image quality requirement: NESZ <= -20.0 dB
    const neszPassed = neszDb <= -20.0

    return {
      vGroundMS: Math.round(vGroundMS),
      slantRangeKm: Math.round(slantRangeKm),
      wavelengthCm: Math.round(wavelengthM * 100 * 10) / 10,
      azimuthResolutionM,
      groundRangeResolutionM,
      swathWidthKm,
      minPrfHz,
      maxPrfHz,
      selectedPrfHz,
      prfValid,
      antennaGainDbi,
      avgPowerW: Math.round(avgPowerW),
      neszDb,
      neszPassed,
    }
  }, [altitudeKm, peakPowerW, dutyCyclePct, antennaLengthM, antennaWidthM, chirpBandwidthMhz, incidenceAngleDeg, activePreset])

  const exportSarCSV = () => {
    const csv = `SPACECRAFT SYNTHETIC APERTURE RADAR (SAR) SIZING SPEC
Instrument Preset,${activePreset.name}
Radar Operating Band,${activePreset.band} (${activePreset.frequencyGhz} GHz, ${metrics.wavelengthCm} cm)
Orbit Altitude,${altitudeKm} km (Ground Speed: ${metrics.vGroundMS} m/s)
Incidence Angle,${incidenceAngleDeg} deg (Slant Range: ${metrics.slantRangeKm} km)
Transmitter Peak RF Power,${peakPowerW} Watts (Avg RF Power: ${metrics.avgPowerW} W @ ${dutyCyclePct}% duty)
Antenna Aperture Dimensions,${antennaLengthM}m length x ${antennaWidthM}m width (Gain: +${metrics.antennaGainDbi} dBi)
Chirp Linear FM Bandwidth,${chirpBandwidthMhz} MHz
Azimuth Spatial Resolution (Stripmap),${metrics.azimuthResolutionM} meters
Ground Range Resolution,${metrics.groundRangeResolutionM} meters
Ground Swath Width,${metrics.swathWidthKm} km
Operating Pulse Repetition Frequency (PRF),${metrics.selectedPrfHz} Hz (Window: ${metrics.minPrfHz} Hz - ${metrics.maxPrfHz} Hz)
PRF Timing Validity,${metrics.prfValid ? "VALID (AMBIGUITY FREE WINDOW CLOSED)" : "AMBIGUITY OVERLAP VIOLATION"}
Noise Equivalent Sigma Zero (NESZ),${metrics.neszDb} dB (Standard Requirement: <= -20.0 dB)
Radar Image Quality Verdict,${metrics.neszPassed && metrics.prfValid ? "PASS (HIGH-SENSITIVITY SAR PERFORMANCE)" : "FAIL (INSUFFICIENT NESZ OR PRF CONFLICT)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-sar-payload-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Waves className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Synthetic Aperture Radar (SAR) Range Equation &amp; Ambiguity Sizing Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              SAR RADAR SIZING
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model Synthetic Aperture Radar (SAR) Noise Equivalent Sigma Zero (NESZ), azimuth/range spatial resolutions, PRF timing exclusion windows, and active phased-array RF power budgets.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportSarCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT SAR SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(SAR_PRESETS).map(([k, v]) => (
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
              <div className="text-[10px] text-slate-500">{v.band} · {v.orbitAltitudeKm} km</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> SENSITIVITY (NESZ)
            </div>
            <div className={`text-3xl font-black ${metrics.neszPassed ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.neszDb} dB
            </div>
            <div className="text-[10px] text-slate-400">Req: &le; -20.0 dB ({metrics.avgPowerW} W Avg RF)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-purple-400" /> RESOLUTION (AZ &times; GR)
            </div>
            <div className="text-3xl font-black text-purple-400">
              {metrics.azimuthResolutionM} &times; {metrics.groundRangeResolutionM} m
            </div>
            <div className="text-[10px] text-slate-400">Azimuth L/2 &times; Range Bandwidth</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Waves className="w-3 h-3 text-amber-400" /> SWATH WIDTH
            </div>
            <div className="text-3xl font-black text-amber-400">{metrics.swathWidthKm} km</div>
            <div className="text-[10px] text-slate-400">Slant Range: {metrics.slantRangeKm} km</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-white" /> PRF WINDOW
            </div>
            <div className={`text-3xl font-black ${metrics.prfValid ? "text-white" : "text-red-400"}`}>
              {metrics.selectedPrfHz} Hz
            </div>
            <div className="text-[10px] text-slate-400">Valid: {metrics.minPrfHz} - {metrics.maxPrfHz} Hz</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Radar Sizing Parameters
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={400}
                max={850}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>400 km (Low Slant)</span>
                <span>600 km</span>
                <span>850 km</span>
              </div>
            </div>

            {/* RF Power & Duty Cycle */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PEAK POWER (W)</label>
                <input
                  type="number"
                  step={200}
                  value={peakPowerW}
                  onChange={(e) => setPeakPowerW(Math.max(500, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">DUTY CYCLE (%)</label>
                <input
                  type="number"
                  step={2}
                  value={dutyCyclePct}
                  onChange={(e) => setDutyCyclePct(Math.max(5, Math.min(30, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Antenna Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">LENGTH (m)</label>
                <input
                  type="number"
                  step={0.2}
                  value={antennaLengthM}
                  onChange={(e) => setAntennaLengthM(Math.max(1.0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">WIDTH (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={antennaWidthM}
                  onChange={(e) => setAntennaWidthM(Math.max(0.3, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Chirp Bandwidth & Incidence Angle */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">CHIRP (MHz)</label>
                <input
                  type="number"
                  step={20}
                  value={chirpBandwidthMhz}
                  onChange={(e) => setChirpBandwidthMhz(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">INCIDENCE (&deg;)</label>
                <input
                  type="number"
                  step={2}
                  value={incidenceAngleDeg}
                  onChange={(e) => setIncidenceAngleDeg(Math.max(20, Math.min(55, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">SYNTHETIC APERTURE PRINCIPLE:</strong>
              Azimuth spatial resolution ({metrics.azimuthResolutionM} m) depends solely on half the physical antenna length ($L_a / 2$), completely independent of orbital altitude.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Radar Performance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Waves className="w-4 h-4 text-cyan-400" />
                  Spaceborne SAR Performance &amp; Noise Equivalent Sensitivity
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.neszPassed && metrics.prfValid
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.neszPassed && metrics.prfValid ? "SAR SENSITIVITY CERTIFIED" : "SENSITIVITY / PRF DEFICIT"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  Operating in <strong className="text-white">{activePreset.band}</strong> ({metrics.wavelengthCm} cm wavelength) at {altitudeKm} km altitude with an incidence angle of {incidenceAngleDeg}&deg; (slant range of <strong className="text-white">{metrics.slantRangeKm} km</strong>).
                  Transmitting <strong className="text-cyan-400">{peakPowerW} W peak RF power</strong> at a {dutyCyclePct}% duty cycle generates <strong className="text-white">{metrics.avgPowerW} W average microwave power</strong> across an antenna aperture of {antennaLengthM}m &times; {antennaWidthM}m (+{metrics.antennaGainDbi} dBi gain).
                </p>
                <p>
                  The system achieves a Noise Equivalent Sigma Zero of <strong className={metrics.neszPassed ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{metrics.neszDb} dB</strong> (threshold &le; -20 dB), guaranteeing crisp radar contrast over calm ocean and desert surfaces.
                  A chirp bandwidth of {chirpBandwidthMhz} MHz yields <strong className="text-purple-400 font-bold">{metrics.groundRangeResolutionM} m ground range resolution</strong> by <strong className="text-purple-400 font-bold">{metrics.azimuthResolutionM} m azimuth resolution</strong> across an unambiguous swath width of <strong className="text-white">{metrics.swathWidthKm} km</strong>.
                  {!metrics.neszPassed && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Sensitivity deficit: NESZ is higher than -20.0 dB. Increase peak RF power, increase transmit duty cycle, or enlarge antenna aperture area to enhance radar gain.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Antenna Array Phased Gain (G_tx = G_rx)</span>
                  <span className="text-white font-bold">+{metrics.antennaGainDbi} dBi</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Doppler Azimuth Resolution Limit</span>
                  <span className="text-purple-400 font-bold">{metrics.azimuthResolutionM} meters (L_a / 2)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Chirp Ground Range Resolution</span>
                  <span className="text-purple-400 font-bold">{metrics.groundRangeResolutionM} meters (@ {chirpBandwidthMhz} MHz)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Radar Sensitivity Clearance (NESZ)</span>
                  <span className={`font-bold ${metrics.neszPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.neszPassed ? "PASS (HIGH SENSITIVITY RADAR)" : "FAIL (INSUFFICIENT NESZ MARGIN)"}
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
                <Link href="/optical-payload" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/optical-payload</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/two-phase" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/two-phase (Heat)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/power" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/power (Load)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/data-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/data-budget</span>
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
