"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMission } from "@/lib/missionStore"
import { Play, Pause, RotateCcw, AlertTriangle } from "lucide-react"

export default function FlightDeckLayout({ children }: { children: React.ReactNode }) {
  const { isPlaying, timeScale, simTimeSec, alarms, setPlaying, setTimeScale, setSimTime } = useMission()
  const pathname = usePathname()

  // Base Epoch: Nov 1, 2026 12:00:00 UTC
  const baseEpochMs = 1793534400000 
  
  const [timeUI, setTimeUI] = useState({
    utcString: "",
    julianDate: ""
  })

  // Format UTC and Julian Date (10 Hz refresh for smooth UI clock)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentEpochMs = baseEpochMs + (useMission.getState().simTimeSec * 1000)
      const date = new Date(currentEpochMs)
      
      const utcString = date.toISOString().replace('T', ' ').substring(0, 19) + ' Z'
      // Standard Julian Date calculation
      const jd = (currentEpochMs / 86400000) + 2440587.5
      
      setTimeUI({
        utcString,
        julianDate: jd.toFixed(4)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* GLOBAL TOP HUD - ONLY VISIBLE IF NOT ON ROOT */}
      {pathname !== "/" && (
        <div className="absolute top-4 left-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          
          {/* MASTER CAUTION WARNING BANNER */}
          {alarms.length > 0 && (
            <div className="w-full flex items-center justify-center pointer-events-auto">
              <div className="px-4 py-1.5 rounded-lg bg-rose-600 border-2 border-rose-400 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>MASTER CAUTION: {alarms[0].subsystem} - {alarms[0].message}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white font-mono font-black text-sm tracking-wider hover:border-cyan-500/50 transition-all shadow-xl"
              >
                VEROYX
              </Link>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-cyan-400 font-mono text-xs tracking-widest flex items-center gap-4 shadow-xl">
                <span>{timeUI.utcString}</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400">JD {timeUI.julianDate}</span>
              </div>
            </div>

            {/* Global Time Controls */}
            <div className="flex items-center gap-2 font-mono text-xs bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
              <button
                onClick={() => setPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-all"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              {[1, 10, 60, 120].map(scale => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-2 py-1 rounded-lg transition-all ${timeScale === scale ? "bg-cyan-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"}`}
                >
                  {scale}x
                </button>
              ))}
              <button
                onClick={() => setSimTime(0)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE ROUTE PAGE HERE */}
      <div className="absolute inset-0 w-full h-full z-0">
        {children}
      </div>
    </div>
  )
}
