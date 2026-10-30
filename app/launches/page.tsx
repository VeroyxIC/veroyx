import { createClient } from "@supabase/supabase-js"
import Link from "next/link"

export const revalidate = 60 // Revalidate every 60s for fresh telemetry

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function LaunchesPage() {
  const { data: launches } = await supabase
    .from("launches")
    .select("*")
    .order("launch_window_utc", { ascending: true })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Telemetry */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live Orbital Cadence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white font-mono">
              COMMERCIAL LAUNCH MANIFEST
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Real-time flight index tracking commercial orbital flights, mission profiles, launch vehicles, and azimuth coordinates.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-slate-500">
            SYSTEM STATUS: <span className="text-emerald-400 font-semibold">FEED ONLINE</span>
          </div>
        </div>

        {/* Launch Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(launches ?? []).map((launch) => {
            const launchDate = launch.launch_window_utc ? new Date(launch.launch_window_utc) : null
            return (
              <div
                key={launch.slug}
                className="group relative bg-slate-900/60 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-4">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                      {launch.operator}
                    </span>
                    <span className="px-2.5 py-1 rounded border border-cyan-500/40 text-cyan-300 bg-cyan-950/40 font-medium">
                      {launch.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {launch.mission_name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">VEHICLE:</span>
                      <span className="text-slate-200">{launch.vehicle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">ORBIT:</span>
                      <span className="text-cyan-300">{launch.orbit_target}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">PAD:</span>
                      <span className="text-slate-300 line-clamp-1">{launch.launch_site}</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {launch.payload_description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">WINDOW (UTC)</div>
                    <div className="text-slate-200 font-medium">
                      {launchDate ? launchDate.toUTCString().slice(5, 22) : "TBD"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">CUSTOMER</div>
                    <div className="text-slate-300 font-medium">{launch.customer}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
