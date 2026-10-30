"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { 
  Radio, 
  MapPin, 
  Globe, 
  Clock, 
  Zap, 
  Download, 
  Filter, 
  Search, 
  ShieldCheck, 
  Compass, 
  ArrowRight,
  Wifi
} from "lucide-react"

interface GroundStationRecord {
  id: string
  name: string
  code: string
  operator: string
  country: string
  latitude: number
  longitude: number
  elevation_m: number
  supported_bands: string[]
  dish_diameters_m: number[]
  polar_optimized: boolean
  status: string
}

export default function GroundStationTopologyPage() {
  const [stations, setStations] = useState<GroundStationRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedBand, setSelectedBand] = useState<string>("ALL")
  const [polarOnly, setPolarOnly] = useState<boolean>(false)
  const [constellationInclination, setConstellationInclination] = useState<number>(53) // Standard LEO (Starlink/Kuiper)

  useEffect(() => {
    async function loadStations() {
      const { data, error } = await supabase
        .from("ground_stations")
        .select("*")
        .order("latitude", { ascending: false })

      if (!error && data) {
        setStations(data as GroundStationRecord[])
      }
      setLoading(false)
    }

    loadStations()
  }, [])

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      const matchesBand = selectedBand === "ALL" || s.supported_bands.includes(selectedBand)
      const matchesPolar = !polarOnly || s.polar_optimized
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.country.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesBand && matchesPolar && matchesSearch
    })
  }, [stations, selectedBand, polarOnly, searchQuery])

  // Contact time accumulation model
  const contactStats = useMemo(() => {
    const isPolarOrbit = constellationInclination >= 80
    // Polar stations get 14 passes/day in polar orbit, ~3-4 in mid-inclination
    let totalMinutesPerDay = 0

    filtered.forEach((s) => {
      let passesPerDay = 4
      if (s.polar_optimized) {
        passesPerDay = isPolarOrbit ? 14 : 5
      } else {
        passesPerDay = isPolarOrbit ? 2 : 5
      }
      totalMinutesPerDay += passesPerDay * 9.5 // ~9.5 min average LEO pass duration
    })

    const hours = Math.floor(totalMinutesPerDay / 60)
    const mins = Math.round(totalMinutesPerDay % 60)

    return {
      dailyPassMinutes: Math.round(totalMinutesPerDay),
      dailyFormatted: `${hours}h ${mins}m`,
      coveragePercentage: Math.min(100, Math.round((totalMinutesPerDay / 1440) * 100)),
      stationCount: filtered.length,
    }
  }, [filtered, constellationInclination])

  const exportStationCSV = () => {
    const headers = "Station_Name,Code,Operator,Country,Latitude,Longitude,Elevation_m,Supported_Bands,Max_Dish_Dia_m,Polar_Optimized\n"
    const rows = filtered.map(s => 
      `"${s.name}","${s.code}","${s.operator}","${s.country}",${s.latitude},${s.longitude},${s.elevation_m},"${s.supported_bands.join(" | ")}",${Math.max(...s.dish_diameters_m)},${s.polar_optimized}`
    ).join("\n")

    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "veroyx-ground-station-topology.csv"
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Global Earth Station Telemetry &amp; Contact Pass Network
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              GROUND STATION TOPOLOGY &amp; SCHEDULER
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Global federated downlink gateways, frequency band capabilities, aperture diameters, and orbital contact window accumulators across polar and equatorial belts.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={exportStationCSV}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT NETWORK SPEC
            </button>
          </div>
        </div>

        {/* Top KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" /> ACTIVE GATEWAYS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400">{contactStats.stationCount} NODES</div>
            <div className="text-[10px] text-slate-500">Global Earth Stations Filtered</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> TOTAL CONTACT TIME
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{contactStats.dailyFormatted}</div>
            <div className="text-[10px] text-slate-500">Accumulated Pass Budget / Day</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> PASS DUTY CYCLE
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{contactStats.coveragePercentage}%</div>
            <div className="text-[10px] text-slate-500">Continuous Network Availability</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-amber-400" /> DOWNLINK BANDS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">S • X • Ka • OPT</div>
            <div className="text-[10px] text-slate-500">Multi-Spectrum Support</div>
          </div>
        </div>

        {/* Orbit Inclination Simulator Bar */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="text-white font-bold uppercase flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Constellation Orbital Inclination Simulation
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              Adjust inclination to model contact passes over polar (Svalbard/Troll) vs. equatorial station footprints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold text-sm">{constellationInclination}&deg; Inclination</span>
            <input
              type="range"
              min={28}
              max={98}
              step={1}
              value={constellationInclination}
              onChange={(e) => setConstellationInclination(Number(e.target.value))}
              className="accent-cyan-400 w-36 sm:w-48 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">{constellationInclination >= 80 ? "Polar / SSO" : "Mid-LEO"}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            {["ALL", "Ka-Band", "X-Band", "S-Band", "Optical"].map((band) => (
              <button
                key={band}
                onClick={() => setSelectedBand(band)}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                  selectedBand === band
                    ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 font-bold"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {band}
              </button>
            ))}

            <button
              onClick={() => setPolarOnly(!polarOnly)}
              className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                polarOnly
                  ? "bg-purple-950 border-purple-500/50 text-purple-300 font-bold"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Polar Ring Only (&ge;60&deg; Lat)
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter site, country, code, or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>
        </div>

        {/* Ground Station Terminal Grid */}
        {loading ? (
          <div className="p-16 text-center font-mono text-xs text-slate-500">
            POLLING GLOBAL FEDERATED EARTH STATIONS...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
            {filtered.map((s) => {
              const maxDish = Math.max(...s.dish_diameters_m)
              return (
                <div
                  key={s.id}
                  className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{s.code}</span>
                        {s.polar_optimized && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                            POLAR GATEWAY
                          </span>
                        )}
                      </div>
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {s.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">{s.country}</p>
                      <p className="text-cyan-400 text-[10px] mt-0.5">Operator: {s.operator}</p>
                    </div>

                    {/* Telemetry Coordinates & Elevation */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block">COORDINATES</span>
                        <span className="text-slate-300">{Number(s.latitude).toFixed(2)}&deg;, {Number(s.longitude).toFixed(2)}&deg;</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ALTITUDE</span>
                        <span className="text-slate-300">{s.elevation_m}m MSL</span>
                      </div>
                    </div>
                  </div>

                  {/* Frequency Bands & Antennas */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    <div className="flex flex-wrap gap-1">
                      {s.supported_bands.map((b) => (
                        <span key={b} className="text-[9px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {b}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Max Aperture: <strong className="text-white">{maxDish}m</strong></span>
                      <Link
                        href="/rf"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        Calculate Link <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
