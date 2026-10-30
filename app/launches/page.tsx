import { createClient } from "@supabase/supabase-js"
import LaunchTrackerClient from "@/components/LaunchTrackerClient"

export const dynamic = "force-dynamic"

export interface LaunchItem {
  slug: string
  mission_name: string
  operator: string
  vehicle: string
  launch_window_utc: string
  launch_site: string
  orbit_target: string
  payload_description: string
  status: string
  customer: string
}

const defaultLaunches: LaunchItem[] = [
  {
    slug: "starlink-15-18-spacex",
    mission_name: "Starlink Group 15-18",
    operator: "SpaceX",
    vehicle: "Falcon 9 Block 5",
    launch_window_utc: new Date(Date.now() + 86400000 * 1.25).toISOString(),
    launch_site: "SLC-4E, Vandenberg SFB, California",
    orbit_target: "LEO (Low-Earth Orbit)",
    payload_description: "27 Starlink V2-Mini broadband satellites for global mega-constellation deployment.",
    status: "GO FOR FLIGHT",
    customer: "SpaceX Commercial"
  },
  {
    slug: "the-sea-god-surveys-rocketlab",
    mission_name: "The Sea God Surveys (iQPS-9)",
    operator: "Rocket Lab",
    vehicle: "Electron",
    launch_window_utc: new Date(Date.now() + 86400000 * 3.4).toISOString(),
    launch_site: "LC-1B, Mahia Peninsula, New Zealand",
    orbit_target: "LEO (520 km, 97° SSO)",
    payload_description: "Synthetic Aperture Radar (SAR) Earth observation microsatellite with sub-meter resolution.",
    status: "SCHEDULED",
    customer: "iQPS Japan"
  },
  {
    slug: "blue-ghost-mission-1-firefly",
    mission_name: "Blue Ghost Mission 1 (CLPS CP-12)",
    operator: "Firefly Aerospace",
    vehicle: "Falcon 9 (Rideshare)",
    launch_window_utc: new Date(Date.now() + 86400000 * 8.1).toISOString(),
    launch_site: "SLC-39A, Kennedy Space Center, Florida",
    orbit_target: "TLI (Trans-Lunar Injection)",
    payload_description: "Ten NASA science payloads delivering surface instruments directly to Mare Crisium.",
    status: "INTEGRATION PHASE",
    customer: "NASA Exploration Directorate"
  },
  {
    slug: "vulcan-centaur-amazon-leo-1",
    mission_name: "Amazon Project Kuiper (LV-01)",
    operator: "United Launch Alliance",
    vehicle: "Vulcan Centaur (VC4L)",
    launch_window_utc: new Date(Date.now() + 86400000 * 14.6).toISOString(),
    launch_site: "SLC-41, Cape Canaveral SFS, Florida",
    orbit_target: "LEO (Low-Earth Orbit)",
    payload_description: "40 Amazon Leo broadband communications satellites on Vulcan configuration.",
    status: "SCHEDULED",
    customer: "Amazon Kuiper"
  }
]

export default async function LaunchesPage() {
  let launches: LaunchItem[] = defaultLaunches

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data, error } = await supabase
        .from("launches")
        .select("*")
        .order("launch_window_utc", { ascending: true })

      if (!error && data && data.length > 0) {
        launches = data
      }
    } catch {
      // Fallback preserves resilience
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Telemetry */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live Orbital Cadence Engine
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white font-mono">
              ORBITAL LAUNCH MANIFEST
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Real-time flight manifest tracking commercial orbital missions, window windows, vehicle configurations, and active T-minus countdowns.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-slate-500">
            RADAR TELEMETRY: <span className="text-emerald-400 font-semibold">T-0 SYNCHRONIZED</span>
          </div>
        </div>

        {/* Client Interactive Countdown Component */}
        <LaunchTrackerClient launches={launches} />

      </div>
    </div>
  )
}
