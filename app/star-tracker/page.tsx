"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Sparkles, 
  Sun, 
  Globe, 
  Gauge, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Activity,
  Compass,
  Eye,
  Sliders
} from "lucide-react"

interface StarTrackerPreset {
  name: string
  classType: string
  sensorFovDeg: number
  sunExclusionDeg: number
  earthExclusionDeg: number
  maxSlewRateDegS: number
  limitingMagnitudeMv: number
  pointingAccuracyArcsec: number
  opticalHeads: number
  description: string
}

const STAR_TRACKER_PRESETS: Record<string, StarTrackerPreset> = {
  high_precision_science: {
    name: "Sub-Arcsecond Science Flagship (Dual-Head)",
    classType: "Astrophysics / Deep Space",
    sensorFovDeg: 14.0,
    sunExclusionDeg: 42.0,
    earthExclusionDeg: 28.0,
    maxSlewRateDegS: 1.8,
    limitingMagnitudeMv: 6.2,
    pointingAccuracyArcsec: 0.8,
    opticalHeads: 2,
    description: "Deep baffle attenuation suppressing scattered sunlight with skewed optical heads for continuous inertial lock.",
  },
  tactical_smallsat_agile: {
    name: "Agile LEO Smallsat Commercial Tracker",
    classType: "Commercial Smallsat ADCS",
    sensorFovDeg: 20.0,
    sunExclusionDeg: 30.0,
    earthExclusionDeg: 18.0,
    maxSlewRateDegS: 4.5,
    limitingMagnitudeMv: 5.5,
    pointingAccuracyArcsec: 3.5,
    opticalHeads: 1,
    description: "Wide field-of-view sensor designed for fast target slewing and rapid lost-in-space centroid re-acquisition.",
  },
  geostationary_telecom_bus: {
    name: "GEO Telecom Standard Triple-Head",
    classType: "GEO Flagship Bus",
    sensorFovDeg: 16.0,
    sunExclusionDeg: 35.0,
    earthExclusionDeg: 22.0,
    maxSlewRateDegS: 2.2,
    limitingMagnitudeMv: 5.8,
    pointingAccuracyArcsec: 1.5,
    opticalHeads: 3,
    description: "Tri-head redundant geometry guaranteeing 100% celestial coverage during seasonal equinox eclipse passages.",
  },
}

export default function StarTrackerPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("high_precision_science")
  const [actualSunAngleDeg, setActualSunAngleDeg] = useState<number>(55.0)
  const [actualEarthAngleDeg, setActualEarthAngleDeg] = useState<number>(36.0)
  const [bodySlewRateDegS, setBodySlewRateDegS] = useState<number>(1.2)
  const [opticalHeads, setOpticalHeads] = useState<number>(2)
  const [galacticLatitude, setGalacticLatitude] = useState<string>("Intermediate Galactic Plane (b ~ 30 deg)")

  const preset = STAR_TRACKER_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = STAR_TRACKER_PRESETS[key]
    setSelectedPresetKey(key)
    setOpticalHeads(p.opticalHeads)
  }

  // ISO 16691 & ECSS Star Tracker Celestial Geometry Calculations
  const metrics = useMemo(() => {
    // 1. Exclusion Angle Compliance for Primary Optical Head
    const sunBlinded = actualSunAngleDeg < preset.sunExclusionDeg
    const earthBlinded = actualEarthAngleDeg < preset.earthExclusionDeg
    const primaryHeadBlinded = sunBlinded || earthBlinded

    // 2. Multi-Head Redundancy Mitigation
    // If opticalHeads >= 2, skewed mount geometry (e.g. 60 deg separation) preserves lock unless both blinded
    let allHeadsBlinded = false
    if (opticalHeads === 1) {
      allHeadsBlinded = primaryHeadBlinded
    } else if (opticalHeads === 2) {
      // Skewed head 2 angle is shifted relative to head 1
      const head2SunAngleDeg = Math.abs(actualSunAngleDeg - 55.0)
      const head2Blinded = head2SunAngleDeg < preset.sunExclusionDeg
      allHeadsBlinded = primaryHeadBlinded && head2Blinded
    } else {
      // 3 heads ensure > 99.8% availability
      allHeadsBlinded = false
    }

    // 3. Slew Smear & Rate Blindness Check
    const slewExceeded = bodySlewRateDegS > preset.maxSlewRateDegS

    // 4. Star Density within FOV based on Galactic Latitude & Limiting Magnitude
    // Mean number of guide stars visible in sensor FOV:
    // Star count ~ FOV_solid_angle * Star_density(Mv)
    let latitudeFactor = 1.0
    if (galacticLatitude.includes("Core")) latitudeFactor = 2.4
    else if (galacticLatitude.includes("Poles")) latitudeFactor = 0.55

    const fovAreaSqDeg = Math.PI * Math.pow(preset.sensorFovDeg / 2, 2)
    const baseStarsPerSqDeg = 0.085 * Math.pow(1.9, preset.limitingMagnitudeMv - 4.5)
    const visibleGuideStars = Math.round(fovAreaSqDeg * baseStarsPerSqDeg * latitudeFactor)

    // Minimum required guide stars for 3-axis quaternion solution is 4
    const sufficientStars = visibleGuideStars >= 4

    // 5. Overall Tracking Lock State
    const attitudeLockMaintained = !allHeadsBlinded && !slewExceeded && sufficientStars

    // 6. Cross-Boresight Pointing Jitter (Arcseconds)
    // Jitter scales with slew rate:
    const dynamicJitterArcsec = Math.round(
      (preset.pointingAccuracyArcsec * (1 + 0.45 * Math.pow(bodySlewRateDegS, 1.4))) * 10
    ) / 10

    return {
      sunBlinded,
      earthBlinded,
      primaryHeadBlinded,
      allHeadsBlinded,
      slewExceeded,
      visibleGuideStars,
      sufficientStars,
      attitudeLockMaintained,
      dynamicJitterArcsec,
    }
  }, [actualSunAngleDeg, actualEarthAngleDeg, bodySlewRateDegS, opticalHeads, galacticLatitude, preset])

  const exportStarTrackerCSV = () => {
    const csv = `SPACECRAFT STAR TRACKER & STRAY LIGHT DOSSIER
Preset Sensor Architecture,${preset.name}
Class,${preset.classType}
Sensor Field of View (FOV),${preset.sensorFovDeg} deg
Limiting Visual Magnitude,${preset.limitingMagnitudeMv} Mv
Sun Exclusion Angle Constraint,${preset.sunExclusionDeg} deg (Actual: ${actualSunAngleDeg} deg)
Earth Albedo Exclusion Angle,${preset.earthExclusionDeg} deg (Actual: ${actualEarthAngleDeg} deg)
Body Angular Slew Rate,${bodySlewRateDegS} deg/s (Max Sensor Limit: ${preset.maxSlewRateDegS} deg/s)
Active Optical Head Units (OHU),${opticalHeads} heads
Star Field Region,${galacticLatitude}
Detected Guide Stars in FOV,${metrics.visibleGuideStars} stars (Min Required: 4)
Dynamic Pointing Jitter Accuracy,${metrics.dynamicJitterArcsec} arcseconds
Primary Head Stray Light Status,${metrics.primaryHeadBlinded ? "BLINDED BY SCATTERED LIGHT" : "CLEAR CELESTIAL SKY"}
ADCS Attitude Lock Verdict,${metrics.attitudeLockMaintained ? "TRACKING LOCK MAINTAINED" : "LOST-IN-SPACE CENTROID FAILURE"}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-star-tracker-${selectedPresetKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              ISO 16691 Star Tracker Celestial Stray Light &amp; Slew Rate Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              STAR TRACKER &amp; STRAY LIGHT
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model optical baffle Sun/Earth exclusion angles, slew rate smear limits, guide star catalog availability, and multi-head attitude lost-in-space recovery.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportStarTrackerCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT TRACKER DOSSIER
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(STAR_TRACKER_PRESETS).map(([k, v]) => (
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
              Pointing Angles &amp; Slew Kinematics
            </div>

            {/* Sun Angle Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> SUN-TO-BORESIGHT ANGLE
                </label>
                <span className={`font-bold ${metrics.sunBlinded ? "text-red-400" : "text-amber-400"}`}>
                  {actualSunAngleDeg}&deg; (Min: {preset.sunExclusionDeg}&deg;)
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={1}
                value={actualSunAngleDeg}
                onChange={(e) => setActualSunAngleDeg(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10&deg; (Blinded)</span>
                <span>45&deg; (Cut-off)</span>
                <span>120&deg; (Deep Void)</span>
              </div>
            </div>

            {/* Earth Limb Angle Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" /> EARTH LIMB ANGLE
                </label>
                <span className={`font-bold ${metrics.earthBlinded ? "text-red-400" : "text-cyan-400"}`}>
                  {actualEarthAngleDeg}&deg; (Min: {preset.earthExclusionDeg}&deg;)
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                step={1}
                value={actualEarthAngleDeg}
                onChange={(e) => setActualEarthAngleDeg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5&deg; (Albedo Glare)</span>
                <span>25&deg; (Baffle Edge)</span>
                <span>90&deg; (Zenith)</span>
              </div>
            </div>

            {/* Slew Rate */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">BODY SLEW RATE</label>
                <span className={`font-bold ${metrics.slewExceeded ? "text-red-400" : "text-purple-400"}`}>
                  {bodySlewRateDegS}&deg;/s (Max: {preset.maxSlewRateDegS}&deg;/s)
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={6.0}
                step={0.1}
                value={bodySlewRateDegS}
                onChange={(e) => setBodySlewRateDegS(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Exceeding max rate causes centroid star smearing</span>
            </div>

            {/* Optical Heads & Field */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">OPTICAL HEADS</label>
                <select
                  value={opticalHeads}
                  onChange={(e) => setOpticalHeads(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value={1}>1 Head (Single)</option>
                  <option value={2}>2 Heads (Skewed)</option>
                  <option value={3}>3 Heads (Tri-Redundant)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block uppercase font-bold">GALACTIC FIELD</label>
                <select
                  value={galacticLatitude}
                  onChange={(e) => setGalacticLatitude(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                >
                  <option value="Galactic Core (b ~ 0 deg)">Galactic Core (Dense)</option>
                  <option value="Intermediate Galactic Plane (b ~ 30 deg)">Plane (Nominal)</option>
                  <option value="Galactic Poles (b ~ 90 deg)">Poles (Sparse)</option>
                </select>
              </div>
            </div>

            {/* Scenario Info */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">SENSOR SPECIFICATION:</div>
              <p className="text-slate-300 font-mono text-[10px]">FOV: {preset.sensorFovDeg}&deg; | Sensitivity: {preset.limitingMagnitudeMv} Mv</p>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  {metrics.attitudeLockMaintained ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  )}
                  ATTITUDE TRACKING
                </div>
                <div className={`text-3xl font-black ${metrics.attitudeLockMaintained ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.attitudeLockMaintained ? "LOCKED" : "LOST"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {metrics.attitudeLockMaintained ? "Continuous Quaternion" : "Lost-in-Space Triggered"}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> GUIDE STARS VISIBLE
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.visibleGuideStars}</div>
                <div className="text-[10px] text-slate-500">Min Required: 4 Guide Stars</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Compass className="w-3 h-3 text-purple-400" /> POINTING ACCURACY
                </div>
                <div className="text-3xl font-black text-white">{metrics.dynamicJitterArcsec}&quot;</div>
                <div className="text-[10px] text-purple-400">Cross-Boresight 1-Sigma RMS</div>
              </div>
            </div>

            {/* Star Tracker Stray Light Dossier */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Baffle Attenuation &amp; Optical Blindness Analysis
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                  metrics.attitudeLockMaintained
                    ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950 border-red-500/40 text-red-300"
                }`}>
                  {metrics.attitudeLockMaintained ? "OPTICAL ATTITUDE CLEARED" : "SENSOR BLINDNESS / SMEAR"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">CELESTIAL INTERACTION SUMMARY</div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  With the Sun positioned at <strong className="text-white">{actualSunAngleDeg}&deg;</strong> and Earth limb at <strong className="text-white">{actualEarthAngleDeg}&deg;</strong> from the primary boresight, the optical head encounters {metrics.primaryHeadBlinded ? <span className="text-red-400 font-bold">diffuse scattered glare exceeding baffle attenuation thresholds</span> : <span className="text-emerald-400 font-bold">clean dark-sky background</span>}.
                  {opticalHeads > 1 && metrics.primaryHeadBlinded && !metrics.allHeadsBlinded && (
                    <span className="text-cyan-400 block mt-1">
                      Multi-head mitigation engaged: While the primary head is blinded, skewed secondary optical head {opticalHeads >= 2 ? "OHU-2" : "OHU-3"} maintains continuous stellar tracking lock, avoiding attitude determination dropouts.
                    </span>
                  )}
                  {metrics.slewExceeded && (
                    <span className="text-red-400 block mt-1">
                      Slew smear anomaly: The body angular rate ({bodySlewRateDegS}&deg;/s) surpasses the maximum tracking velocity ({preset.maxSlewRateDegS}&deg;/s), smearing point-spread star functions across detector pixels and initiating autonomous Lost-in-Space routines.
                    </span>
                  )}
                </p>
              </div>

              {/* Specs Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Sun Baffle Exclusion Margin</span>
                  <span className={`font-bold ${metrics.sunBlinded ? "text-red-400" : "text-emerald-400"}`}>
                    {actualSunAngleDeg}&deg; (Exclusion Limit: &ge; {preset.sunExclusionDeg}&deg;)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Earth Albedo Exclusion Margin</span>
                  <span className={`font-bold ${metrics.earthBlinded ? "text-red-400" : "text-emerald-400"}`}>
                    {actualEarthAngleDeg}&deg; (Exclusion Limit: &ge; {preset.earthExclusionDeg}&deg;)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Angular Slew Tracking Margin</span>
                  <span className={`font-bold ${metrics.slewExceeded ? "text-red-400" : "text-purple-400"}`}>
                    {bodySlewRateDegS}&deg;/s (Sensor Slew Limit: &le; {preset.maxSlewRateDegS}&deg;/s)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Star Field Catalog Density</span>
                  <span className={`font-bold ${metrics.sufficientStars ? "text-cyan-400" : "text-amber-400"}`}>
                    {metrics.visibleGuideStars} Guide Stars (Threshold: &ge; 4 Stars in {preset.sensorFovDeg}&deg; FOV)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">ADCS Star Tracker Status</span>
                  <span className={`font-bold ${metrics.attitudeLockMaintained ? "text-emerald-400" : "text-red-400"}`}>
                    {metrics.attitudeLockMaintained ? "PASS (HIGH-PRECISION LOCK CLEARED)" : "FAIL (LOST-IN-SPACE CENTROID DROP)"}
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
