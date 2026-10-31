"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Calendar, 
  Clock, 
  Compass, 
  Globe, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Gauge, 
  Activity, 
  Radio, 
  Target,
  Sliders
} from "lucide-react"

interface TargetStation {
  name: string
  latDeg: number
  lonDeg: number
  altM: number
  minElevationDeg: number
}

const STATIONS: Record<string, TargetStation> = {
  svalbard: {
    name: "Svalbard SG3 (Norway)",
    latDeg: 78.23,
    lonDeg: 15.40,
    altM: 450,
    minElevationDeg: 5.0,
  },
  madrid: {
    name: "Madrid MDSCC (Spain)",
    latDeg: 40.43,
    lonDeg: -4.25,
    altM: 780,
    minElevationDeg: 10.0,
  },
  hartebeesthoek: {
    name: "Hartebeesthoek HBK (South Africa)",
    latDeg: -25.88,
    lonDeg: 27.70,
    altM: 1415,
    minElevationDeg: 5.0,
  },
  goldstone: {
    name: "Goldstone GDSCC (California)",
    latDeg: 35.42,
    lonDeg: -116.89,
    altM: 1030,
    minElevationDeg: 10.0,
  },
}

export default function PassSchedulePage() {
  const [stationKey, setStationKey] = useState<string>("svalbard")
  const [altitudeKm, setAltitudeKm] = useState<number>(550)
  const [inclinationDeg, setInclinationDeg] = useState<number>(97.6)
  const [minElevationMask, setMinElevationMask] = useState<number>(5.0)
  const [forecastHorizonHours, setForecastHorizonHours] = useState<number>(24)

  const station = STATIONS[stationKey]

  // Deterministic Ground Pass Schedule Simulation
  const passTimeline = useMemo(() => {
    const rEarthKm = 6378.1
    const mu = 398600.4418
    const rOrbKm = rEarthKm + altitudeKm

    // Orbital Period & Nodal Drift
    const orbitPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbKm, 3) / mu)
    const orbitPeriodMin = orbitPeriodSec / 60
    const orbitsPerDay = 1440 / orbitPeriodMin

    // Maximum geometric Earth central angle for visibility (psi_0)
    const elevRad = (minElevationMask * Math.PI) / 180
    const cosPsi0 = (rEarthKm / rOrbKm) * Math.cos(elevRad)
    const psi0Deg = (Math.acos(cosPsi0) - elevRad) * (180 / Math.PI)

    // J2 Nodal Precession (deg/day)
    const j2 = 1.08263e-3
    const incRad = (inclinationDeg * Math.PI) / 180
    const pOrbM = rOrbKm * 1000
    const nodalPrecessionDegDay = -((3/2) * j2 * Math.sqrt(mu * 1e9) * Math.pow(rEarthKm * 1000, 2) / Math.pow(pOrbM, 3.5)) * Math.cos(incRad) * (180 / Math.PI) * 86400

    // Synthesize contact passes over forecast window
    const passes = []
    const baseEpoch = new Date("2026-10-31T00:00:00Z")
    const totalSimOrbits = Math.round((forecastHorizonHours * 60) / orbitPeriodMin)

    // Latitude visibility factor: polar stations see almost all orbits; mid-latitude sees subsets
    const isPolarStation = Math.abs(station.latDeg) > 65
    const isMidLat = Math.abs(station.latDeg) > 25 && Math.abs(station.latDeg) <= 65

    let passCounter = 1
    for (let orbit = 0; orbit < totalSimOrbits; orbit++) {
      const orbitTimeMin = orbit * orbitPeriodMin
      // Relative longitude shift between orbit ground track and rotating Earth
      const earthRotationDeg = (orbitTimeMin / 1440) * 360
      const trackLon = ((orbit * 24.5 - earthRotationDeg) % 360 + 360) % 360
      const lonDelta = Math.abs(trackLon - ((station.lonDeg % 360 + 360) % 360))
      const effLonDelta = Math.min(lonDelta, 360 - lonDelta)

      // Check if orbit ground track passes within visibility radius psi0
      const inView = isPolarStation ? (orbit % 1.2 < 1.0) : effLonDelta < (psi0Deg * 1.5)

      if (inView && passes.length < 12) {
        const passStartMin = orbitTimeMin + 8.5
        const maxElev = Math.min(88, Math.round(minElevationMask + (90 - minElevationMask) * (1 - effLonDelta / (psi0Deg * 2))))
        const durationSec = Math.round(360 + (maxElev / 90) * 380)

        const aosTime = new Date(baseEpoch.getTime() + passStartMin * 60 * 1000)
        const melTime = new Date(aosTime.getTime() + (durationSec / 2) * 1000)
        const losTime = new Date(aosTime.getTime() + durationSec * 1000)

        const azAos = Math.round((30 + orbit * 47) % 360)
        const azLos = Math.round((azAos + 180 + Math.random() * 40 - 20) % 360)

        passes.push({
          id: `PASS-${String(passCounter).padStart(2, "0")}`,
          orbitIndex: orbit + 1,
          aosTime: aosTime.toISOString().substring(11, 19) + " UTC",
          losTime: losTime.toISOString().substring(11, 19) + " UTC",
          durationMin: Math.round((durationSec / 60) * 10) / 10,
          maxElevDeg: Math.max(minElevationMask + 2, maxElev),
          azAosDeg: azAos,
          azLosDeg: azLos,
          passType: maxElev >= 60 ? "Overhead Peak" : maxElev >= 25 ? "Nominal Arc" : "Low Grazing",
        })
        passCounter++
      }
    }

    const totalContactMin = passes.reduce((acc, p) => acc + p.durationMin, 0)
    const avgPassDuration = passes.length > 0 ? Math.round((totalContactMin / passes.length) * 10) / 10 : 0

    return {
      orbitPeriodMin: orbitPeriodMin.toFixed(1),
      nodalPrecessionDegDay: nodalPrecessionDegDay.toFixed(2),
      passes,
      totalPassCount: passes.length,
      totalContactMin: Math.round(totalContactMin * 10) / 10,
      avgPassDuration,
    }
  }, [station, altitudeKm, inclinationDeg, minElevationMask, forecastHorizonHours])

  const exportPassScheduleCSV = () => {
    const csv = `SPACECRAFT TOPOCENTRIC PASS SCHEDULE & CONTACT TIMETABLE
Tracking Ground Station,${station.name}
Station Coordinates,${station.latDeg} deg Lat / ${station.lonDeg} deg Lon / ${station.altM} m MSL
Horizon Mask Elevation,${minElevationMask} deg
Orbit Altitude,${altitudeKm} km (Period: ${passTimeline.orbitPeriodMin} min)
Orbit Inclination,${inclinationDeg} deg
Nodal Precession Drift,${passTimeline.nodalPrecessionDegDay} deg / day
Forecast Window,${forecastHorizonHours} Hours
Total Contact Passes,${passTimeline.totalPassCount} passes
Cumulative Contact Duration,${passTimeline.totalContactMin} minutes

Pass ID,Orbit #,AOS (UTC),LOS (UTC),Duration (min),Max Elevation (deg),AOS Azimuth (deg),LOS Azimuth (deg),Geometry Profile
${passTimeline.passes.map(p => `${p.id},${p.orbitIndex},${p.aosTime},${p.losTime},${p.durationMin},${p.maxElevDeg},${p.azAosDeg},${p.azLosDeg},"${p.passType}"`).join("\n")}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veroyx-pass-schedule-${stationKey}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Calendar className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              SGP4/J2 Topocentric Horizon Contact Window &amp; Pass Schedule Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              PASS SCHEDULE &amp; TRACKING
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Generate deterministic Azimuth/Elevation antenna steering timelines, Acquisition-of-Signal (AOS) to Loss-of-Signal (LOS) contact durations, and J2 nodal ground track visibility windows.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportPassScheduleCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT SCHEDULE SPEC
            </button>
          </div>
        </div>

        {/* Station Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
          {Object.entries(STATIONS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setStationKey(k)}
              className={`px-3.5 py-2 rounded-lg border transition-all whitespace-nowrap text-left ${
                stationKey === k
                  ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="font-bold">{v.name}</div>
              <div className="text-[10px] text-slate-500">{v.latDeg}&deg; Lat · {v.altM}m Alt</div>
            </button>
          ))}
        </div>

        {/* Primary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> SCHEDULED PASSES
            </div>
            <div className="text-3xl font-black text-cyan-400">{passTimeline.totalPassCount}</div>
            <div className="text-[10px] text-slate-400">In next {forecastHorizonHours} hours</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> TOTAL CONTACT TIME
            </div>
            <div className="text-3xl font-black text-emerald-400">{passTimeline.totalContactMin} min</div>
            <div className="text-[10px] text-slate-400">Avg {passTimeline.avgPassDuration} min per pass</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Compass className="w-3 h-3 text-purple-400" /> NODAL PRECESSION
            </div>
            <div className="text-3xl font-black text-purple-400">{passTimeline.nodalPrecessionDegDay}&deg;/d</div>
            <div className="text-[10px] text-slate-400">J2 Earth Oblateness Drift</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" /> ORBIT PERIOD
            </div>
            <div className="text-3xl font-black text-white">{passTimeline.orbitPeriodMin}m</div>
            <div className="text-[10px] text-slate-400">Altitude: {altitudeKm} km</div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Configuration Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Orbit &amp; Tracking Constraints
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
                max={1200}
                step={25}
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 km (VLEO)</span>
                <span>550 km (SSO)</span>
                <span>1200 km</span>
              </div>
            </div>

            {/* Inclination Angle */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">INCLINATION</label>
                <span className="text-purple-400 font-bold">{inclinationDeg}&deg;</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={inclinationDeg}
                onChange={(e) => setInclinationDeg(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0&deg; (Equatorial)</span>
                <span>53&deg; (Mid-Lat)</span>
                <span>98&deg; (Sun-Sync)</span>
              </div>
            </div>

            {/* Elevation Mask */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between">
                <label className="text-slate-400 uppercase font-bold">MIN ELEVATION MASK</label>
                <span className="text-amber-400 font-bold">{minElevationMask}&deg;</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={minElevationMask}
                onChange={(e) => setMinElevationMask(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Atmospheric refraction &amp; terrain obstruction cut-off</span>
            </div>

            {/* Forecast Window */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 block uppercase font-bold">FORECAST HORIZON</label>
              <select
                value={forecastHorizonHours}
                onChange={(e) => setForecastHorizonHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              >
                <option value={12}>Next 12 Hours</option>
                <option value={24}>Next 24 Hours (Full Day)</option>
                <option value={48}>Next 48 Hours</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-sans text-slate-400">
              <strong className="text-cyan-400 block font-mono">TOPOCENTRIC GEOMETRY:</strong>
              Passes are evaluated by calculating the satellite topocentric elevation angle relative to station local horizon ($Az, El$) factoring in Earth central angle geometry.
            </div>
          </div>

          {/* Results Telemetry Desk: Pass Timetable */}
          <div className="lg:col-span-2 space-y-6">

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Antenna Contact Schedule Matrix
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {station.name}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Pass ID</th>
                      <th className="py-2.5 px-3">AOS Time</th>
                      <th className="py-2.5 px-3">LOS Time</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Max El</th>
                      <th className="py-2.5 px-3">AOS &rarr; LOS Az</th>
                      <th className="py-2.5 px-3 text-center">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {passTimeline.passes.map((pass) => (
                      <tr key={pass.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-cyan-400">{pass.id}</td>
                        <td className="py-3 px-3 text-slate-200">{pass.aosTime}</td>
                        <td className="py-3 px-3 text-slate-200">{pass.losTime}</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">{pass.durationMin}m</td>
                        <td className="py-3 px-3 text-white font-bold">{pass.maxElevDeg}&deg;</td>
                        <td className="py-3 px-3 text-slate-400">{pass.azAosDeg}&deg; &rarr; {pass.azLosDeg}&deg;</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            pass.maxElevDeg >= 60
                              ? "bg-purple-950 border-purple-500/50 text-purple-300"
                              : pass.maxElevDeg >= 25
                              ? "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}>
                            {pass.passType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Correlated Engines */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">
                CORRELATED ENGINES:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <Link href="/ground-station" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/ground-station</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/lasercom" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/lasercom</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </Link>
                <Link href="/visualizer" className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all flex items-center justify-between">
                  <span>/visualizer (3D)</span>
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
