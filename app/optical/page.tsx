"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Eye, 
  Camera, 
  Gauge, 
  Layers, 
  Download, 
  ShieldCheck, 
  Crosshair, 
  ArrowRight,
  Focus,
  Maximize2
} from "lucide-react"

interface SensorPreset {
  name: string
  operator: string
  apertureDiameterM: number
  focalLengthMm: number
  pixelPitchMicrons: number
  detectorPixelsAcross: number
  nominalAltitudeKm: number
  description: string
}

const OPTICAL_PRESETS: Record<string, SensorPreset> = {
  worldview3: {
    name: "WorldView-3 / Legion Class",
    operator: "Maxar Technologies",
    apertureDiameterM: 1.1,
    focalLengthMm: 13300,
    pixelPitchMicrons: 8.0,
    detectorPixelsAcross: 40000,
    nominalAltitudeKm: 619,
    description: "Commercial sub-30cm electro-optical benchmark with 1.1m Cassegrain optics.",
  },
  pelican: {
    name: "Pelican High-Res Constellation",
    operator: "Planet Labs",
    apertureDiameterM: 0.45,
    focalLengthMm: 4500,
    pixelPitchMicrons: 4.5,
    detectorPixelsAcross: 16000,
    nominalAltitudeKm: 500,
    description: "Rapid-revisit high-resolution smallsat pushbroom imaging array.",
  },
  kh11_recon: {
    name: "Keyhole-Class Recon (KH-11)",
    operator: "USSF / NRO (Defense)",
    apertureDiameterM: 2.4,
    focalLengthMm: 24000,
    pixelPitchMicrons: 5.0,
    detectorPixelsAcross: 60000,
    nominalAltitudeKm: 320,
    description: "Sovereign defense electro-optical telescope with 2.4m primary mirror in low perigee orbit.",
  },
  cubesat_smallsat: {
    name: "3U CubeSat Recon Imager",
    operator: "Commercial SmallSat",
    apertureDiameterM: 0.09,
    focalLengthMm: 650,
    pixelPitchMicrons: 3.45,
    detectorPixelsAcross: 4096,
    nominalAltitudeKm: 480,
    description: "Miniaturized refractive optics payload for distributed situational awareness.",
  },
}

export default function OpticalSimulatorPage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("worldview3")
  const [apertureM, setApertureM] = useState<number>(1.1)
  const [focalLengthMm, setFocalLengthMm] = useState<number>(13300)
  const [pixelPitchMicrons, setPixelPitchMicrons] = useState<number>(8.0)
  const [detectorPixels, setDetectorPixels] = useState<number>(40000)
  const [altitudeKm, setAltitudeKm] = useState<number>(619)

  const preset = OPTICAL_PRESETS[selectedPresetKey]

  const applyPreset = (key: string) => {
    const p = OPTICAL_PRESETS[key]
    setSelectedPresetKey(key)
    setApertureM(p.apertureDiameterM)
    setFocalLengthMm(p.focalLengthMm)
    setPixelPitchMicrons(p.pixelPitchMicrons)
    setDetectorPixels(p.detectorPixelsAcross)
    setAltitudeKm(p.nominalAltitudeKm)
  }

  // Optical Recon Physics Computation
  const metrics = useMemo(() => {
    const wavelengthNm = 550
    const wavelengthM = wavelengthNm * 1e-9
    const altM = altitudeKm * 1000
    const focalLengthM = focalLengthMm / 1000
    const pixelPitchM = pixelPitchMicrons * 1e-6

    // 1. Geometric Ground Sample Distance (GSD) in cm
    const gsdM = (pixelPitchM * altM) / focalLengthM
    const gsdCm = gsdM * 100

    // 2. Rayleigh Diffraction Limit spot size on ground in cm
    const diffractionSpotM = (1.22 * wavelengthM * altM) / apertureM
    const diffractionSpotCm = diffractionSpotM * 100

    // 3. Ground Resolved Distance (GRD) - optics vs detector limited
    const grdCm = Math.max(gsdCm, diffractionSpotCm)
    const isDiffractionLimited = diffractionSpotCm > gsdCm

    // 4. Ground Swath Width in km
    const swathWidthKm = (detectorPixels * gsdM) / 1000

    // 5. NIIRS Rating (National Imagery Interpretability Rating Scale: 0 to 9)
    const gsdInches = gsdCm / 2.54
    let niirsEstimate = 10.251 - 3.32 * Math.log10(Math.max(0.5, gsdInches))
    niirsEstimate = Math.max(1, Math.min(9, Math.round(niirsEstimate * 10) / 10))

    // 6. Tactical Discernibility Classification
    let targetCapability = "Regional Topography & Weather Fronts"
    if (grdCm <= 10) {
      targetCapability = "Individual Footwear, Handheld Antennas, Facial Silhouettes (NIIRS 9)"
    } else if (grdCm <= 25) {
      targetCapability = "Aircraft Engine Cowlings, Missile Radomes, Small Armaments (NIIRS 8)"
    } else if (grdCm <= 50) {
      targetCapability = "Vehicle Chassis, Radar Dishes, Cockpit Canopies (NIIRS 6-7)"
    } else if (grdCm <= 120) {
      targetCapability = "Vehicle Detection, Runway Striping, Shipping Containers (NIIRS 5)"
    } else if (grdCm <= 300) {
      targetCapability = "Maritime Frigates, Commercial Aircraft Presence, Roadways (NIIRS 4)"
    } else {
      targetCapability = "Urban Footprints, Airport Boundaries, Harbors (NIIRS 2-3)"
    }

    return {
      gsdCm: gsdCm.toFixed(1),
      diffractionSpotCm: diffractionSpotCm.toFixed(1),
      grdCm: grdCm.toFixed(1),
      isDiffractionLimited,
      swathWidthKm: swathWidthKm.toFixed(1),
      niirsEstimate: niirsEstimate.toFixed(1),
      targetCapability,
    }
  }, [apertureM, focalLengthMm, pixelPitchMicrons, detectorPixels, altitudeKm])

  const exportOpticalCSV = () => {
    const csv = `Parameter,Value,Unit
Sensor Preset,${preset.name},
Aperture Diameter,${apertureM},m
Focal Length,${focalLengthMm},mm
Pixel Pitch,${pixelPitchMicrons},um
Linear Array Width,${detectorPixels},pixels
Orbital Altitude,${altitudeKm},km
Geometric GSD,${metrics.gsdCm},cm
Diffraction Limit Spot,${metrics.diffractionSpotCm},cm
Effective GRD,${metrics.grdCm},cm
Ground Swath Width,${metrics.swathWidthKm},km
NIIRS Rating,${metrics.niirsEstimate},NIIRS
Target Capability,${metrics.targetCapability},`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-optical-gsd-recon.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Eye className="w-3.5 h-3.5 animate-pulse" />
              Electro-Optical Sensor Physics &amp; NIIRS Reconnaissance Model
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              OPTICAL SENSOR &amp; GSD SIMULATOR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Model optical ground sample distance (GSD), Rayleigh diffraction limits, focal length aperture scaling, and NATO NIIRS target discernibility ratings from orbit.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportOpticalCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT RECON SPEC
            </button>
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(OPTICAL_PRESETS).map(([k, v]) => (
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
              <Camera className="w-4 h-4 text-cyan-400" />
              Optical Payload Parameters
            </div>

            {/* Primary Mirror Aperture */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">PRIMARY APERTURE (D)</label>
                <span className="text-cyan-400 font-bold">{apertureM} METERS</span>
              </div>
              <input
                type="range"
                min={0.08}
                max={3.0}
                step={0.05}
                value={apertureM}
                onChange={(e) => setApertureM(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.09m (CubeSat)</span>
                <span>1.1m (WorldView)</span>
                <span>2.4m (KH-11)</span>
              </div>
            </div>

            {/* Focal Length */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">EFFECTIVE FOCAL LENGTH (F)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={focalLengthMm}
                  onChange={(e) => setFocalLengthMm(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">mm</span>
              </div>
            </div>

            {/* Pixel Pitch */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">SENSOR PIXEL PITCH (P)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={0.1}
                  value={pixelPitchMicrons}
                  onChange={(e) => setPixelPitchMicrons(Math.max(1.0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">μm</span>
              </div>
            </div>

            {/* Orbital Altitude Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-slate-400">ORBITAL ALTITUDE (H)</label>
                <span className="text-purple-400 font-bold">{altitudeKm} KM</span>
              </div>
              <input
                type="range"
                min={250}
                max={900}
                step={10}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO Recon)</span>
                <span>500 km (SSO)</span>
                <span>700 km (High-LEO)</span>
              </div>
            </div>

            {/* Pushbroom Array Width */}
            <div className="space-y-1.5">
              <label className="text-slate-400 block uppercase font-bold">LINEAR DETECTOR WIDTH</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={detectorPixels}
                  onChange={(e) => setDetectorPixels(Math.max(1024, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-slate-500">PIXELS</span>
              </div>
            </div>

            {/* Preset Description */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sans">
              <div className="text-cyan-400 font-bold font-mono">HERITAGE BENCHMARK:</div>
              <p className="text-slate-400">{preset.description}</p>
            </div>
          </div>

          {/* Results Telemetry Desk */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Focus className="w-3 h-3 text-cyan-400" /> GEOMETRIC GSD
                </div>
                <div className="text-3xl font-black text-cyan-400">{metrics.gsdCm} cm</div>
                <div className="text-[10px] text-slate-500">Detector Sample Resolution</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-purple-400" /> RESOLVED GRD
                </div>
                <div className="text-3xl font-black text-white">{metrics.grdCm} cm</div>
                <div className="text-[10px] text-purple-400">
                  {metrics.isDiffractionLimited ? "Diffraction Limited (Optics)" : "Sensor Pixel Limited"}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> NATO NIIRS LEVEL
                </div>
                <div className="text-3xl font-black text-emerald-400">NIIRS {metrics.niirsEstimate}</div>
                <div className="text-[10px] text-slate-500">National Imagery Standard</div>
              </div>
            </div>

            {/* Tactical Target Discernibility HUD */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Tactical Reconnaissance Identification Threshold
                </span>
                <span className="text-[10px] text-slate-500">DEFENSE STANDARD</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">IDENTIFIABLE TARGET DOMAIN</div>
                <div className="text-base font-bold text-white">{metrics.targetCapability}</div>
                <div className="text-[11px] text-slate-400 font-sans">
                  At an effective Ground Resolved Distance of {metrics.grdCm} cm, imagery intelligence (IMINT) exploitation software can reliably categorize this asset class under standard contrast and atmospheric optical depth conditions.
                </div>
              </div>

              {/* Swath Width & Physical Optics Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Ground Swath Width</span>
                  <span className="text-cyan-400 font-bold">{metrics.swathWidthKm} km</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Diffraction Limit Spot (λ = 550 nm)</span>
                  <span className="text-slate-200 font-bold">{metrics.diffractionSpotCm} cm</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Telescope F-Number (f/D)</span>
                  <span className="text-purple-400 font-bold">f/{(focalLengthMm / (apertureM * 1000)).toFixed(1)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-400">Instantaneous Field of View (IFOV)</span>
                  <span className="text-slate-200 font-bold">{((pixelPitchMicrons * 1e-3) / (focalLengthMm / 1000) * 1e6).toFixed(1)} μrad</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
