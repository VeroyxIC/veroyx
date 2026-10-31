"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Cpu, 
  Code2, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Layers, 
  Radio, 
  Orbit, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Database,
  FileCode,
  Play
} from "lucide-react"

interface ApiEndpoint {
  id: string
  method: "POST" | "GET"
  path: string
  title: string
  description: string
  sampleRequest: Record<string, any>
  sampleResponse: Record<string, any>
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "orbit-prop",
    method: "POST",
    path: "/api/v1/propagate",
    title: "SGP4 / J2 Orbital State Propagation",
    description: "Propagate Keplerian orbit state vectors forward in time, accounting for J2 oblateness perturbations in J2000 ECI and WGS-84 ECEF coordinates.",
    sampleRequest: {
      epoch_utc: "2026-10-31T00:00:00Z",
      semi_major_axis_km: 6928.14,
      eccentricity: 0.0012,
      inclination_deg: 51.64,
      raan_deg: 142.3,
      arg_perigee_deg: 75.1,
      true_anomaly_deg: 0.0,
      duration_hours: 24,
      step_size_sec: 60,
      frame: "J2000_ECI"
    },
    sampleResponse: {
      status: "SUCCESS",
      frame: "J2000_ECI",
      ephemeris_points_count: 1440,
      nodal_precession_deg_day: -5.12,
      orbit_period_min: 95.6,
      sub_satellite_points: [
        { t_sec: 0, lat_deg: 28.5, lon_deg: -80.5, alt_km: 550.0 },
        { t_sec: 60, lat_deg: 32.1, lon_deg: -78.2, alt_km: 550.1 }
      ]
    }
  },
  {
    id: "rf-link",
    method: "POST",
    path: "/api/v1/link-budget",
    title: "CCSDS 401.0-B RF Downlink Closure",
    description: "Calculate free-space path loss, atmospheric attenuation, antenna gains, and receiver Eb/N0 link margin closure.",
    sampleRequest: {
      carrier_frequency_ghz: 8.4,
      orbit_altitude_km: 550.0,
      min_elevation_deg: 5.0,
      tx_power_watts: 10.0,
      tx_antenna_diameter_m: 0.3,
      rx_antenna_diameter_m: 11.3,
      bitrate_mbps: 350.0,
      target_ber: 1e-6
    },
    sampleResponse: {
      status: "COMPLIANT",
      carrier_frequency_ghz: 8.4,
      max_slant_range_km: 2132,
      free_space_path_loss_db: 177.5,
      tx_gain_dbi: 26.2,
      rx_gain_dbi: 57.8,
      eb_n0_received_db: 14.8,
      eb_n0_required_db: 10.5,
      link_margin_db: 4.3,
      margin_status: "PASS (>= 3.0 dB Flight Margin)"
    }
  },
  {
    id: "conjunction-risk",
    method: "POST",
    path: "/api/v1/conjunction-eval",
    title: "2D B-Plane Foster Collision Probability (Pc)",
    description: "Evaluate close-approach encounter geometry from Conjunction Data Messages (CDM) and size optimal collision avoidance maneuvers (CAM).",
    sampleRequest: {
      miss_distance_m: 85.0,
      relative_velocity_km_s: 14.2,
      primary_hbr_m: 2.2,
      secondary_hbr_m: 0.8,
      sigma_radial_m: 18.0,
      sigma_intrack_m: 120.0,
      sigma_crosstrack_m: 45.0,
      target_clearance_km: 1.5
    },
    sampleResponse: {
      status: "ACTIONABLE",
      collision_probability_pc: "4.82e-4",
      actionable_threshold: "1.00e-4",
      maneuver_required: true,
      optimized_in_track_delta_v_m_s: 0.18,
      propellant_penalty_kg: 0.038,
      post_cam_residual_pc: "3.20e-9"
    }
  }
]

export default function DevelopersPage() {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("orbit-prop")
  const [activeCodeLang, setActiveCodeLang] = useState<"python" | "matlab" | "curl">("python")
  const [copied, setCopied] = useState<boolean>(false)

  const activeEndpoint = API_ENDPOINTS.find(e => e.id === selectedEndpointId) || API_ENDPOINTS[0]

  const getCodeSnippet = () => {
    if (activeCodeLang === "python") {
      return `import requests
import json

# Veroyx Institutional API - ${activeEndpoint.title}
ENDPOINT = "https://veroyx.com${activeEndpoint.path}"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer VEROYX_INSTITUTIONAL_KEY"
}

payload = ${JSON.stringify(activeEndpoint.sampleRequest, null, 4)}

response = requests.post(ENDPOINT, headers=HEADERS, json=payload)
data = response.json()

print(f"Status: {data.get('status')}")
print(json.dumps(data, indent=2))`
    }

    if (activeCodeLang === "matlab") {
      return `% Veroyx Institutional API - MATLAB / Octave Automation
url = 'https://veroyx.com${activeEndpoint.path}';
options = weboptions('MediaType', 'application/json', ...
                     'HeaderFields', {'Authorization', 'Bearer VEROYX_INSTITUTIONAL_KEY'});

payload = struct();
${Object.entries(activeEndpoint.sampleRequest).map(([k, v]) => {
  if (typeof v === 'string') return `payload.${k} = '${v}';`
  return `payload.${k} = ${v};`
}).join('\n')}

response = webwrite(url, payload, options);
disp(response);`
    }

    return `curl -X POST https://veroyx.com${activeEndpoint.path} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer VEROYX_INSTITUTIONAL_KEY" \\
  -d '${JSON.stringify(activeEndpoint.sampleRequest)}'`
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Master Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              REST API &middot; Python SDK &middot; MATLAB Integration Suite
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              DEVELOPER API &amp; SDK
            </h1>
            <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-relaxed">
              Programmatic calculation infrastructure for NASA JPL Team X, Goddard concurrent engineering centers, and flight software teams. Headless endpoints supporting J2000 ECI, WGS-84 ECEF, and CCSDS standard schemas.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/compliance"
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 font-bold transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              VCRM COMPLIANCE MATRIX
            </Link>
          </div>
        </div>

        {/* Framework & Convention Standards Badge Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" /> COORDINATE FRAMES
            </div>
            <div className="text-base font-bold text-white">J2000 ECI / WGS-84</div>
            <div className="text-[10px] text-slate-400">RIC / SEZ Topocentric conversions</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" /> EPHEMERIS FORMATS
            </div>
            <div className="text-base font-bold text-white">CCSDS ODM / OEM</div>
            <div className="text-[10px] text-slate-400">OMM Mean Elements &amp; TLE Compatible</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> TIME CONVENTIONS
            </div>
            <div className="text-base font-bold text-white">UTC / TDB / ET</div>
            <div className="text-[10px] text-slate-400">Julian Date &amp; J2000 Seconds offset</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-amber-400" /> SPECIFICATION
            </div>
            <div className="text-base font-bold text-white">OpenAPI 3.1 JSON</div>
            <div className="text-[10px] text-slate-400">Zero-dependency JSON payload schemas</div>
          </div>
        </div>

        {/* API Interactive Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-mono text-xs">

          {/* Endpoint Navigator Column */}
          <div className="space-y-3">
            <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider px-1">
              PRODUCTION REST ENDPOINTS
            </div>

            {API_ENDPOINTS.map(ep => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpointId(ep.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedEndpointId === ep.id
                    ? "bg-cyan-950/70 border-cyan-500 text-white shadow-lg shadow-cyan-950/30"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    ep.method === "POST" ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300" : "bg-cyan-950 text-cyan-300"
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200">{ep.path}</span>
                </div>
                <div className="font-bold text-white text-xs">{ep.title}</div>
                <div className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                  {ep.description}
                </div>
              </button>
            ))}

            <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-[11px] font-sans text-slate-400 space-y-2 mt-4">
              <div className="text-cyan-400 font-mono font-bold text-xs flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" /> CSPICE &amp; PYTHON INTEGRATION
              </div>
              <p>
                All endpoint calculations execute the identical mathematical kernels utilized in the GUI engines. Output data vectors are directly importable into NumPy, Pandas, Astropy, and MATLAB timetables.
              </p>
            </div>
          </div>

          {/* Code Generation & Response Inspection Workbench */}
          <div className="lg:col-span-2 space-y-6">

            {/* Code Generator Card */}
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase text-xs">CLIENT EXECUTION HOOK</span>
                </div>

                <div className="flex items-center gap-2">
                  {(["python", "matlab", "curl"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveCodeLang(lang)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        activeCodeLang === lang
                          ? "bg-cyan-950 border border-cyan-500/60 text-cyan-300"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}

                  <button
                    onClick={copyCode}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
                    title="Copy Code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 overflow-x-auto text-[11px] text-slate-300 font-mono leading-relaxed">
                <pre>{getCodeSnippet()}</pre>
              </div>
            </div>

            {/* Request & Response Schema Dossier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Sample Request Body */}
              <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-slate-400 uppercase">
                  REQUEST PAYLOAD (JSON)
                </div>
                <div className="p-3.5 bg-slate-950 overflow-x-auto text-[10px] text-cyan-300 font-mono leading-relaxed max-h-64">
                  <pre>{JSON.stringify(activeEndpoint.sampleRequest, null, 2)}</pre>
                </div>
              </div>

              {/* Sample Response Body */}
              <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-emerald-400 uppercase">
                  RESPONSE DATA VECTOR (JSON)
                </div>
                <div className="p-3.5 bg-slate-950 overflow-x-auto text-[10px] text-emerald-300 font-mono leading-relaxed max-h-64">
                  <pre>{JSON.stringify(activeEndpoint.sampleResponse, null, 2)}</pre>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
