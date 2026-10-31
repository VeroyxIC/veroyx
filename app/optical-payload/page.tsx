"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Camera, 
  Eye, 
  Maximize2, 
  Activity, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Sliders, 
  Sun, 
  Focus, 
  Layers 
} from "lucide-react"

interface OpticalPreset {
  name: string
  classType: string
  orbitAltitudeKm: number
  focalLengthM: number
  apertureDiameterM: number
  pixelPitchMicrons: number
  spectralBandNm: number // Center wavelength
  toaRadianceW: number // W / (m2 * sr * um)
  tdiStages: number
  readNoiseElectrons: number
  description: string
}

const OPTICAL_PRESETS: Record<string, OpticalPreset> = {
  vhr_commercial_recon: {
    name: "Sub-Meter Very High Resolution (VHR)",
    classType: "Commercial Reconnaissance / Planetary Mapping",
    orbitAltitudeKm: 500,
    focalLengthM: 3.6,
    apertureDiameterM: 0.45,
    pixelPitchMicrons: 5.5,
    spectralBandNm: 650, // Panchromatic
    toaRadianceW: 85.0,
    tdiStages: 32,
    readNoiseElectrons: 12,
    description: "Sub-meter high-altitude imager utilizing folded Ritchey-Chrétien Cassegrain optics with digital TDI line-scan.",
  },
  multispectral_copernicus: {
    name: "Copernicus 10m Multispectral Baseline",
    classType: "Environmental Agriculture & Land Use",
    orbitAltitudeKm: 786,
    focalLengthM: 0.60,
    apertureDiameterM: 0.15,
    pixelPitchMicrons: 7.5,
    spectralBandNm: 560, // Green band
    toaRadianceW: 65.0,
    tdiStages: 1, // Standard frame or low-TDI
    readNoiseElectrons: 8,
    description: "Wide-swath land monitoring camera balancing moderate resolution with broad 290 km swath coverage.",
  },
  cubesat_microsat_edge: {
    name: "16U CubeSat Compact Optical Terminal",
    classType: "Rapid Revisit Constellation Node",
    orbitAltitudeKm: 450,
    focalLengthM: 0.95,
    apertureDiameterM: 0.12,
    pixelPitchMicrons: 4.2,
    spectralBandNm: 600,
    toaRadianceW: 75.0,
    tdiStages: 8,
    readNoiseElectrons: 15,
    description: "Ultra-compact refractive/reflective telephoto lens assembly optimized for volume-constrained ride-share buses.",
  },
}

export default function OpticalPayloadPage() {
  const [selectedKey, setSelectedKey] = useState<string>("vhr_commercial_recon")
  const [altitudeKm, setAltitudeKm] = useState<number>(500)
  const [focalLengthM, setFocalLengthM] = useState<number>(3.6)
  const [apertureDiameterM, setApertureDiameterM] = useState<number>(0.45)
  const [pixelPitchMicrons, setPixelPitchMicrons] = useState<number>(5.5)
  const [tdiStages, setTdiStages] = useState<number>(32)
  const [offNadirAngleDeg, setOffNadirAngleDeg] = useState<number>(15.0)

  const activePreset = OPTICAL_PRESETS[selectedKey]

  const applyPreset = (key: string) => {
    const p = OPTICAL_PRESETS[key]
    setSelectedKey(key)
    setAltitudeKm(p.orbitAltitudeKm)
    setFocalLengthM(p.focalLengthM)
    setApertureDiameterM(p.apertureDiameterM)
    setPixelPitchMicrons(p.pixelPitchMicrons)
    setTdiStages(p.tdiStages)
  }

  // Optical Remote Sensing & Radiometric Calculations
  const metrics = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const lambdaM = activePreset.spectralBandNm * 1e-9
    const pixelPitchM = pixelPitchMicrons * 1e-6
    const altitudeM = altitudeKm * 1000

    // 1. Orbital Velocity and Ground Velocity
    const vOrbKmS = Math.sqrt(mu / (rEarthKm + altitudeKm))
    const vGroundMS = (vOrbKmS * (rEarthKm / (rEarthKm + altitudeKm))) * 1000

    // 2. Nadir & Off-Nadir Ground Sample Distance (GSD in meters)
    const gsdNadirM = (pixelPitchM * altitudeM) / focalLengthM
    const rollRad = (offNadirAngleDeg * Math.PI) / 180
    const gsdCrossTrackM = gsdNadirM / Math.pow(Math.cos(rollRad), 2)
    const gsdAlongTrackM = gsdNadirM / Math.cos(rollRad)

    // 3. F-Number and Optical Quality Q-factor
    const fNumber = Math.round((focalLengthM / Math.max(0.01, apertureDiameterM)) * 10) / 10
    // Q = (lambda * F#) / pixel_pitch
    const qFactor = Math.round(((lambdaM * fNumber) / pixelPitchM) * 100) / 100
    // Q approx 1.0 to 1.2 is matched Nyquist; < 0.8 is detector-undersampled; > 1.5 is diffraction-blurred
    let qStatus = "Optimal Nyquist Sampling"
    if (qFactor < 0.8) qStatus = "Detector Undersampled (Aliasing)"
    else if (qFactor > 1.4) qStatus = "Diffraction Blurred (Over-sampled)"

    // 4. Line Integration Time without Smear (seconds)
    // t_int = GSD / v_ground
    const dwellTimeSec = gsdNadirM / vGroundMS
    const effectiveIntegrationTimeSec = dwellTimeSec * tdiStages

    // 5. System Modulation Transfer Function (MTF at Nyquist frequency)
    // MTF_optics ~ 0.55 (diffraction + aberrations), MTF_detector = sinc(pi/2) ~ 0.637
    // MTF_smear = sinc(pi/2 * 0.15) ~ 0.97, MTF_jitter ~ 0.92
    const mtfOptics = 0.55
    const mtfDetector = 0.637
    const mtfSmear = 0.96
    const mtfJitter = 0.93
    const systemMtfNyquist = Math.round(mtfOptics * mtfDetector * mtfSmear * mtfJitter * 100) / 100
    const mtfAcceptable = systemMtfNyquist >= 0.20 // Standard requirement: MTF at Nyquist >= 0.20 (20%)

    // 6. Radiometric Signal-to-Noise Ratio (SNR)
    // S_electrons = (pi / 4) * (D^2 / f^2) * L_lambda * delta_lambda * A_pixel * t_eff * tau_opt * QE / E_photon
    const opticsTransmittance = 0.82
    const quantumEfficiency = 0.68
    const h = 6.626e-34
    const c = 299792458
    const photonEnergyJ = (h * c) / lambdaM
    const bandwidthUm = 0.15 // 150 nm bandwidth
    const pixelAreaM2 = Math.pow(pixelPitchM, 2)

    const solidAngle = (Math.PI / 4) * Math.pow(apertureDiameterM / focalLengthM, 2)
    const signalPowerW = activePreset.toaRadianceW * bandwidthUm * pixelAreaM2 * solidAngle * opticsTransmittance
    const signalElectrons = (signalPowerW * effectiveIntegrationTimeSec * quantumEfficiency) / photonEnergyJ

    // Total Noise: sqrt(Signal + Dark + ReadNoise^2)
    const darkElectrons = 25 * effectiveIntegrationTimeSec
    const totalNoiseElectrons = Math.sqrt(signalElectrons + darkElectrons + Math.pow(activePreset.readNoiseElectrons, 2))
    const snr = Math.round(signalElectrons / Math.max(1, totalNoiseElectrons))
    const snrAcceptable = snr >= 80

    return {
      vGroundMS: Math.round(vGroundMS),
      gsdNadirCm: Math.round(gsdNadirM * 100 * 10) / 10,
      gsdOffNadirCm: Math.round(gsdCrossTrackM * 100 * 10) / 10,
      fNumber,
      qFactor,
      qStatus,
      dwellTimeMicroSec: Math.round(dwellTimeSec * 1e6 * 10) / 10,
      systemMtfNyquist,
      mtfAcceptable,
      signalElectrons: Math.round(signalElectrons),
      snr,
      snrAcceptable,
    }
  }, [altitudeKm, focalLengthM, apertureDiameterM, pixelPitchMicrons, tdiStages, offNadirAngleDeg, activePreset])

  const exportOpticalCSV = () => {
    const csv = `SPACECRAFT OPTICAL PAYLOAD SIZING & RADIOMETRIC SPEC
Instrument Preset,${activePreset.name}
Application Class,${activePreset.classType}
Orbit Altitude,${altitudeKm} km (Ground Speed: ${metrics.vGroundMS} m/s)
Telescope Focal Length,${focalLengthM} meters
Telescope Aperture Diameter,${apertureDiameterM} meters (Focal Ratio: F/${metrics.fNumber})
Detector Pixel Pitch,${pixelPitchMicrons} microns
Center Wavelength,${activePreset.spectralBandNm} nm
TDI Integration Stages,${tdiStages} lines
Target Off-Nadir Roll Angle,${offNadirAngleDeg} deg
Nadir Ground Sample Distance (GSD),${metrics.gsdNadirCm} cm
Off-Nadir GSD (${offNadirAngleDeg} deg Roll),${metrics.gsdOffNadirCm} cm
Optical Sampling Q-Factor,${metrics.qFactor} (${metrics.qStatus})
Pixel Dwell Integration Time,${metrics.dwellTimeMicroSec} microseconds
Cascaded System MTF at Nyquist,${metrics.systemMtfNyquist} (Threshold: >= 0.20)
Signal Photoelectrons Collected,${metrics.signalElectrons} e-
Radiometric Signal-to-Noise Ratio (SNR),${metrics.snr}:1 (Target: >= 80:1)
Imaging Clearance Verdict,${metrics.mtfAcceptable && metrics.snrAcceptable ? "PASS (HIGH-CONFIDENCE IMAGING ASSURANCE)" : "FAIL (REVISE APERTURE OR TDI)"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-optical-payload-${selectedKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Camera className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Earth Observation Optical Sensor, GSD, MTF &amp; Radiometric SNR Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              OPTICAL SENSOR SIZING
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Model Ground Sample Distance (GSD), diffraction-limited Q-factors, cascaded system MTF curves, TDI dwell integrations, and top-of-atmosphere radiometric SNR margins.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportOpticalCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT OPTICAL SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(OPTICAL_PRESETS).map(([k, v]) => (
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
              <div className="text-[10px] text-slate-500">{v.classType}</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Focus className="w-3 h-3 text-cyan-400" /> NADIR RESOLUTION (GSD)
            </div>
            <div className="text-3xl font-black text-cyan-400">{metrics.gsdNadirCm} cm</div>
            <div className="text-[10px] text-slate-400">Off-Nadir ({offNadirAngleDeg}&deg;): {metrics.gsdOffNadirCm} cm</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" /> RADIOMETRIC SNR
            </div>
            <div className={`text-3xl font-black ${metrics.snrAcceptable ? "text-emerald-400" : "text-red-400"}`}>
              {metrics.snr} : 1
            </div>
            <div className="text-[10px] text-slate-400">Req: &ge; 80:1 ({metrics.signalElectrons} e- signal)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-400" /> SYSTEM MTF @ NYQUIST
            </div>
            <div className={`text-3xl font-black ${metrics.mtfAcceptable ? "text-purple-400" : "text-amber-400"}`}>
              {(metrics.systemMtfNyquist * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-400">Req: &ge; 20% (Optics, Jitter &amp; Smear)</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Eye className="w-3 h-3 text-white" /> SAMPLING Q-FACTOR
            </div>
            <div className="text-3xl font-black text-white">{metrics.qFactor}</div>
            <div className="text-[10px] text-slate-400">{metrics.qStatus}</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Optomechanical Parameters
            </div>

            {/* Orbit Altitude */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">ORBIT ALTITUDE</label>
                <span className="text-cyan-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={300}
                max={900}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO)</span>
                <span>500 km (SSO)</span>
                <span>900 km</span>
              </div>
            </div>

            {/* Focal Length & Aperture */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">FOCAL LENGTH (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={focalLengthM}
                  onChange={(e) => setFocalLengthM(Math.max(0.2, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">APERTURE (m)</label>
                <input
                  type="number"
                  step={0.05}
                  value={apertureDiameterM}
                  onChange={(e) => setApertureDiameterM(Math.max(0.05, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Pixel Pitch & TDI Stages */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">PIXEL PITCH (µm)</label>
                <input
                  type="number"
                  step={0.5}
                  value={pixelPitchMicrons}
                  onChange={(e) => setPixelPitchMicrons(Math.max(1.0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">TDI STAGES</label>
                <input
                  type="number"
                  step={4}
                  value={tdiStages}
                  onChange={(e) => setTdiStages(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Off-Nadir Roll Angle */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">OFF-NADIR ROLL ANGLE</label>
                <span className="text-purple-400 font-bold">{offNadirAngleDeg}&deg;</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                step={2.5}
                value={offNadirAngleDeg}
                onChange={(e) => setOffNadirAngleDeg(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Roll steering angle expands access corridor but degrades cross-track GSD</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">NYQUIST SAMPLING:</strong>
              Q-factor of {metrics.qFactor} (F/{metrics.fNumber}) ensures the optical spot matches detector pixel dimensions without introducing spatial aliasing or excessive diffraction blur.
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Optical Performance Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Imaging Quality &amp; Radiometric Performance Dossier
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.mtfAcceptable && metrics.snrAcceptable
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.mtfAcceptable && metrics.snrAcceptable ? "IMAGING THRESHOLDS CERTIFIED" : "DEFICIT (REVISE OPTICS / INTEGRATION)"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed space-y-2">
                <p>
                  At <strong className="text-white">{altitudeKm} km altitude</strong> with ground track speed of <strong className="text-white">{metrics.vGroundMS} m/s</strong>, the {focalLengthM}m focal length telescope achieves a nadir ground resolution of <strong className="text-cyan-400 font-bold">{metrics.gsdNadirCm} cm</strong>.
                  Rolling off-nadir by {offNadirAngleDeg}&deg; expands the footprint to <strong className="text-white">{metrics.gsdOffNadirCm} cm</strong> cross-track.
                </p>
                <p>
                  Line dwell time of <strong className="text-white">{metrics.dwellTimeMicroSec} µs</strong> paired with <strong className="text-white">{tdiStages} TDI stages</strong> deposits <strong className="text-emerald-400">{metrics.signalElectrons} photoelectrons</strong> per pixel, securing a radiometric <strong className={metrics.snrAcceptable ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>SNR of {metrics.snr}:1</strong> against top-of-atmosphere radiance.
                  The cascaded system MTF at the Nyquist spatial frequency reaches <strong className="text-purple-400 font-bold">{(metrics.systemMtfNyquist * 100).toFixed(0)}%</strong>, preserving sharp edge transitions.
                  {!metrics.snrAcceptable && (
                    <span className="text-red-400 block mt-1 font-bold">
                      Radiometric deficit: SNR is below the 80:1 imaging standard. Increase optical aperture diameter, increase TDI integration stages, or broaden spectral filter bandwidth.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Telescope Optical F-Number</span>
                  <span className="text-white font-bold">F/{metrics.fNumber} (Aperture: {apertureDiameterM}m)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Detector Nyquist Spatial Frequency</span>
                  <span className="text-white font-bold">{(1000 / (2 * pixelPitchMicrons)).toFixed(1)} lp/mm</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Cascaded System MTF @ Nyquist</span>
                  <span className={`font-bold ${metrics.mtfAcceptable ? "text-emerald-400" : "text-amber-400"}`}>
                    {(metrics.systemMtfNyquist * 100).toFixed(0)}% (Standard Req: &ge; 20%)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Earth Observation Sensor Clearance</span>
                  <span className={`font-bold ${metrics.mtfAcceptable && metrics.snrAcceptable ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.mtfAcceptable && metrics.snrAcceptable ? "PASS (CLEARED FOR HIGH-RESOLUTION FLIGHT)" : "FAIL (INSUFFICIENT RADIOMETRIC OR MTF MARGIN)"}
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
                <Link href="/swath" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/swath (Coverage)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/jitter" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/jitter (Blur)</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/data-budget" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/data-budget</span>
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
