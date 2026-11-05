"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import Navbar from "@/components/nav/Navbar"
import { Search, RefreshCw } from "lucide-react"

interface RSOObject {
  noradId: number
  name: string
  intlDes: string
  regime: "LEO" | "MEO" | "GEO" | "HEO"
  type: "PAYLOAD" | "DEBRIS" | "ROCKET BODY" | "CLASSIFIED"
  altitudeKm: number
  inclinationDeg: number
  periodMin: number
  rcsSize: "SMALL" | "MEDIUM" | "LARGE"
  launchYear: number
  country: string
  tleLine1: string
  tleLine2: string
}

const MASTER_CATALOG_SAMPLE: RSOObject[] = [
  {
    noradId: 48219,
    name: "AST-01 VEROYX SDA BUS",
    intlDes: "2021-042A",
    regime: "LEO",
    type: "CLASSIFIED",
    altitudeKm: 512,
    inclinationDeg: 97.4,
    periodMin: 94.8,
    rcsSize: "MEDIUM",
    launchYear: 2021,
    country: "US / ALLIED",
    tleLine1: "1 48219U 21042A   26309.41284722  .00001420  00000-0  84120-4 0  9993",
    tleLine2: "2 48219  97.4120 184.2210 0012410 114.2201 245.9184 15.18491024284123"
  },
  {
    noradId: 25544,
    name: "HVA-01 / ISS (CREWED)",
    intlDes: "1998-067A",
    regime: "LEO",
    type: "PAYLOAD",
    altitudeKm: 418,
    inclinationDeg: 51.64,
    periodMin: 92.9,
    rcsSize: "LARGE",
    launchYear: 1998,
    country: "INTERNATIONAL",
    tleLine1: "1 25544U 98067A   26309.52841021  .00016420  00000-0  28412-3 0  9998",
    tleLine2: "2 25544  51.6420 120.4410 0004120 145.2210 214.8841 15.49812410481230"
  },
  {
    noradId: 53883,
    name: "STARLINK-5122",
    intlDes: "2022-114F",
    regime: "LEO",
    type: "PAYLOAD",
    altitudeKm: 550,
    inclinationDeg: 53.2,
    periodMin: 95.6,
    rcsSize: "MEDIUM",
    launchYear: 2022,
    country: "US",
    tleLine1: "1 53883U 22114F   26309.40012481  .00002140  00000-0  11420-4 0  9991",
    tleLine2: "2 53883  53.2040  45.1120 0001420  84.1204 276.0124 15.06241021148129"
  },
  {
    noradId: 48859,
    name: "NAVSTAR 80 (GPS III-05)",
    intlDes: "2021-054A",
    regime: "MEO",
    type: "PAYLOAD",
    altitudeKm: 20200,
    inclinationDeg: 55.0,
    periodMin: 718.0,
    rcsSize: "LARGE",
    launchYear: 2021,
    country: "US",
    tleLine1: "1 48859U 21054A   26309.11482014  .00000010  00000-0  00000-0 0  9996",
    tleLine2: "2 48859  55.0120  18.4410 0084120 284.1120  75.4410  2.00561204148123"
  },
  {
    noradId: 41866,
    name: "GALILEO 15 (GSAT-0210)",
    intlDes: "2016-069A",
    regime: "MEO",
    type: "PAYLOAD",
    altitudeKm: 23222,
    inclinationDeg: 56.0,
    periodMin: 844.2,
    rcsSize: "LARGE",
    launchYear: 2016,
    country: "EU",
    tleLine1: "1 41866U 16069A   26309.10214812  .00000005  00000-0  00000-0 0  9993",
    tleLine2: "2 41866  56.0120  94.2210 0002140 195.4410 164.8841  1.70561204128412"
  },
  {
    noradId: 51850,
    name: "GOES-18 (NOAA WEST GEO)",
    intlDes: "2022-021A",
    regime: "GEO",
    type: "PAYLOAD",
    altitudeKm: 35786,
    inclinationDeg: 0.04,
    periodMin: 1436.1,
    rcsSize: "LARGE",
    launchYear: 2022,
    country: "US",
    tleLine1: "1 51850U 22021A   26309.00412014  .00000002  00000-0  00000-0 0  9999",
    tleLine2: "2 51850   0.0410  84.1120 0001200 140.2210 219.8410  1.00271204128412"
  },
  {
    noradId: 44713,
    name: "INMARSAT-5 F5 (GX-5)",
    intlDes: "2019-080A",
    regime: "GEO",
    type: "PAYLOAD",
    altitudeKm: 35790,
    inclinationDeg: 0.02,
    periodMin: 1436.2,
    rcsSize: "LARGE",
    launchYear: 2019,
    country: "UK",
    tleLine1: "1 44713U 19080A   26309.00124812  .00000001  00000-0  00000-0 0  9994",
    tleLine2: "2 44713   0.0210  11.2210 0001840 210.4410 149.8841  1.00261204118412"
  },
  {
    noradId: 31115,
    name: "DEB FENGYUN 1C",
    intlDes: "1999-025BP",
    regime: "LEO",
    type: "DEBRIS",
    altitudeKm: 845,
    inclinationDeg: 98.6,
    periodMin: 101.8,
    rcsSize: "SMALL",
    launchYear: 1999,
    country: "PRC",
    tleLine1: "1 31115U 99025BP  26309.31204812  .00000410  00000-0  42100-4 0  9997",
    tleLine2: "2 31115  98.6120 312.4410 0041200 240.1120 119.8412 14.14812041381204"
  },
  {
    noradId: 34012,
    name: "DEB COSMOS 2251",
    intlDes: "1993-036KW",
    regime: "LEO",
    type: "DEBRIS",
    altitudeKm: 780,
    inclinationDeg: 74.0,
    periodMin: 100.4,
    rcsSize: "SMALL",
    launchYear: 1993,
    country: "CIS",
    tleLine1: "1 34012U 93036KW  26309.28410214  .00000620  00000-0  51200-4 0  9992",
    tleLine2: "2 34012  74.0120 148.9120 0028410 180.2210 179.8841 14.34120141284120"
  }
]

export default function SpaceCatalogPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegime, setSelectedRegime] = useState<string>("ALL")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [selectedObject, setSelectedObject] = useState<RSOObject>(MASTER_CATALOG_SAMPLE[0])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const filteredObjects = useMemo(() => {
    return MASTER_CATALOG_SAMPLE.filter(obj => {
      const matchSearch = 
        obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.noradId.toString().includes(searchTerm) ||
        obj.intlDes.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchRegime = selectedRegime === "ALL" || obj.regime === selectedRegime
      const matchType = selectedType === "ALL" || obj.type === selectedType
      return matchSearch && matchRegime && matchType
    })
  }, [searchTerm, selectedRegime, selectedType])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const particles = Array.from({ length: 1400 }).map(() => {
      let r = 0
      let type = "PAYLOAD"
      const rand = Math.random()

      if (rand < 0.65) {
        r = 75 + Math.random() * 55
        type = Math.random() > 0.45 ? "DEBRIS" : "PAYLOAD"
      } else if (rand < 0.82) {
        r = 150 + Math.random() * 40
        type = "PAYLOAD"
      } else {
        r = 240 + Math.random() * 12
        type = "PAYLOAD"
      }

      const speed = (0.35 / Math.sqrt(r)) * (Math.random() > 0.1 ? 1 : -1)

      return {
        r,
        theta: Math.random() * Math.PI * 2,
        speed,
        type,
        size: Math.random() > 0.95 ? 2.0 : 1.2
      }
    })

    const render = () => {
      animId = requestAnimationFrame(render)

      const w = (canvas.width = canvas.parentElement?.clientWidth || 600)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 460)
      const cx = w * 0.5
      const cy = h * 0.5

      ctx.fillStyle = "#020408"
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
      ctx.lineWidth = 1
      ;[130, 190, 252].forEach(rad => {
        ctx.beginPath()
        ctx.arc(cx, cy, rad, 0, Math.PI * 2)
        ctx.stroke()
      })

      const earthRadius = 48
      const earthGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, earthRadius)
      earthGrad.addColorStop(0, "#1e293b")
      earthGrad.addColorStop(0.85, "#0f172a")
      earthGrad.addColorStop(1, "#020408")
      ctx.fillStyle = earthGrad
      ctx.beginPath()
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2)
      ctx.stroke()

      particles.forEach(p => {
        p.theta += p.speed

        const x = cx + Math.cos(p.theta) * p.r
        const y = cy + Math.sin(p.theta) * (p.r * 0.65)

        if (p.type === "DEBRIS") {
          ctx.fillStyle = "rgba(244, 63, 94, 0.75)"
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)"
        }

        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      if (selectedObject) {
        let selR = 105
        if (selectedObject.regime === "MEO") selR = 175
        else if (selectedObject.regime === "GEO") selR = 252

        const selAngle = Date.now() * 0.0005 * (0.35 / Math.sqrt(selR))
        const sx = cx + Math.cos(selAngle) * selR
        const sy = cy + Math.sin(selAngle) * (selR * 0.65)

        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 1.5
        ctx.strokeRect(sx - 8, sy - 8, 16, 16)

        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(sx, sy, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = "9px monospace"
        ctx.fillText(selectedObject.name, sx + 12, sy - 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
        ctx.fillText(`NORAD ${selectedObject.noradId} [${selectedObject.altitudeKm} km]`, sx + 12, sy + 10)
      }
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [selectedObject])

  return (
    <div className="relative w-full min-h-screen bg-[#000000] text-white font-mono selection:bg-white/20 overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-28 pb-16 flex-1 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/[0.03] border border-white/10 text-slate-300 text-[10px] font-bold tracking-[0.25em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>SPACE-TRACK.ORG // 18TH SPACE DEFENSE SQUADRON (18 SDS) LIVE FEED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              RESIDENT SPACE OBJECT (RSO) 48K CATALOG
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-[#06080d] text-[10px] text-slate-400">
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>LIVE SGP4 SYNC: 18 SDS</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">TOTAL TRACKED RSO</span>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>48,219</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/10 border border-white/20 text-slate-300">
                ACTIVE CSpOC
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block">CATALOG COMPLETE (DIAMETER &gt; 5CM)</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">ACTIVE PAYLOADS</span>
            <div className="text-lg font-bold text-white">10,148</div>
            <span className="text-[9px] text-slate-400 block">STARLINK: ~6,800 // OTHERS: ~3,348</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">TRACKED DEBRIS &amp; UPPER STAGES</span>
            <div className="text-lg font-bold text-rose-400">38,071</div>
            <span className="text-[9px] text-slate-400 block">LETHAL NON-COOPERATIVE FRAGMENTS</span>
          </div>

          <div className="p-3.5 border border-white/[0.08] bg-[#06080d] space-y-1">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider">PROPAGATION SOLVER</span>
            <div className="text-lg font-bold text-emerald-400">SGP4 / SDP4</div>
            <span className="text-[9px] text-slate-400 block">WGS-84 // J2-J4 ZONAL HARMONICS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative w-full h-[400px] border border-white/[0.08] bg-[#020408]">
              <canvas ref={canvasRef} className="w-full h-full" />

              <div className="absolute top-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px] space-y-0.5">
                <div className="text-white font-bold">GPU POINT-CLOUD ORBITAL PROJECTION</div>
                <div className="text-slate-400">WGS-84 INERTIAL (ECI J2000)</div>
              </div>

              <div className="absolute top-3 right-3 px-2 py-1 bg-black/90 border border-white/10 text-[9px] space-y-0.5 text-right">
                <div className="flex items-center gap-1.5 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>PAYLOADS (WHITE)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>DEBRIS / ROCKETS (RED)</span>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-[10px]">
                <span className="text-slate-400">REGIMES: </span>
                <span className="text-white font-bold">LEO (130px) | MEO (190px) | GEO (252px)</span>
              </div>
            </div>

            {selectedObject && (
              <div className="p-4 border border-white/[0.08] bg-[#06080d] space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                      SELECTED RSO INSPECTION
                    </span>
                    <h3 className="text-sm font-black text-white">{selectedObject.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-white px-2 py-0.5 bg-white/10 border border-white/20">
                      NORAD {selectedObject.noradId}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-black border border-white/10 text-[9px] font-mono text-slate-300 leading-relaxed overflow-x-auto select-all">
                  <div>{selectedObject.tleLine1}</div>
                  <div>{selectedObject.tleLine2}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">ALTITUDE</span>
                    <span className="text-white font-bold">{selectedObject.altitudeKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">INCLINATION</span>
                    <span className="text-white font-bold">{selectedObject.inclinationDeg}°</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PERIOD</span>
                    <span className="text-white font-bold">{selectedObject.periodMin} min</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RCS SIZE</span>
                    <span className="text-white font-bold">{selectedObject.rcsSize}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="p-3 border border-white/[0.08] bg-[#06080d] space-y-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="SEARCH BY NORAD ID, NAME, OR INTL DES (e.g. 25544, STARLINK, AST-01)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-white/15 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 mr-1">REGIME:</span>
                  {["ALL", "LEO", "MEO", "GEO"].map((reg) => (
                    <button
                      key={reg}
                      onClick={() => setSelectedRegime(reg)}
                      className={`px-2 py-0.5 border uppercase tracking-wider transition-all ${
                        selectedRegime === reg
                          ? "bg-white text-black font-bold border-white"
                          : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 mr-1">TYPE:</span>
                  {["ALL", "PAYLOAD", "DEBRIS", "CLASSIFIED"].map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setSelectedType(tp)}
                      className={`px-2 py-0.5 border uppercase tracking-wider transition-all ${
                        selectedType === tp
                          ? "bg-white text-black font-bold border-white"
                          : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-white/[0.08] bg-[#06080d] overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-black/90 border-b border-white/[0.08] text-[9px] text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">NORAD ID</th>
                      <th className="py-2.5 px-3">OBJECT NAME</th>
                      <th className="py-2.5 px-3">REGIME</th>
                      <th className="py-2.5 px-3">ALTITUDE</th>
                      <th className="py-2.5 px-3">INC</th>
                      <th className="py-2.5 px-3">TYPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredObjects.map((obj) => {
                      const isSelected = selectedObject?.noradId === obj.noradId
                      return (
                        <tr
                          key={obj.noradId}
                          onClick={() => setSelectedObject(obj)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-white/10 text-white font-bold"
                              : "hover:bg-white/[0.03] text-slate-300"
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                            {obj.noradId}
                          </td>
                          <td className="py-2 px-3 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              obj.type === "DEBRIS" ? "bg-rose-400" :
                              obj.type === "CLASSIFIED" ? "bg-amber-400" : "bg-white"
                            }`} />
                            <span className="truncate max-w-[150px]">{obj.name}</span>
                          </td>
                          <td className="py-2 px-3 text-[10px] text-slate-400">
                            {obj.regime}
                          </td>
                          <td className="py-2 px-3 text-[10px]">
                            {obj.altitudeKm} km
                          </td>
                          <td className="py-2 px-3 text-[10px]">
                            {obj.inclinationDeg}°
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              obj.type === "DEBRIS" ? "text-rose-400 bg-rose-500/10" :
                              obj.type === "CLASSIFIED" ? "text-amber-400 bg-amber-500/10" :
                              "text-slate-300 bg-white/5"
                            }`}>
                              {obj.type}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 border-t border-white/[0.08] bg-black/90 flex items-center justify-between text-[10px] text-slate-500">
                <span>SHOWING {filteredObjects.length} OF 48,219 RSO RECORDS</span>
                <span>DATA STREAM: SECURE HTTPS / SPACE-TRACK API</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative w-full px-6 sm:px-12 py-4 border-t border-white/[0.08] bg-black/90 backdrop-blur-md flex flex-wrap items-center justify-between text-[10px] text-slate-500 z-20">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-wider">VEROYX CATALOG NODE</span>
          <span className="text-neutral-800">|</span>
          <span>18TH SPACE DEFENSE SQUADRON FEED</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/c2" className="hover:text-white transition-colors">JADC2 C2</Link>
          <Link href="/conjunction" className="hover:text-white transition-colors">CONJUNCTION</Link>
          <Link href="/planetary-defense" className="hover:text-white transition-colors">PLANETARY DEFENSE</Link>
        </div>
      </footer>
    </div>
  )
}
