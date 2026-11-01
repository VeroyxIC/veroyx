"use client"

import { useState, useEffect } from "react"
import { 
  Terminal, 
  Code2, 
  Key, 
  ShieldCheck, 
  Webhook, 
  Network, 
  Copy, 
  CheckCircle2, 
  Cpu,
  Lock
} from "lucide-react"

type Endpoint = {
  id: string
  method: "GET" | "POST" | "WSS"
  path: string
  title: string
  description: string
  auth: "Bearer Token" | "mTLS + HMAC"
  snippet: { [key: string]: string }
}

const API_ENDPOINTS: Endpoint[] = [
  {
    id: "stream-telemetry",
    method: "WSS",
    path: "/v2/telemetry/stream",
    title: "Live Telemetry Firehose",
    description: "Connect to the high-frequency (10Hz) WebSocket stream to receive live quaternions, power budgets, and thermal states.",
    auth: "Bearer Token",
    snippet: {
      Python: `import asyncio\nimport websockets\nimport json\n\nasync def stream_telemetry():\n    uri = "wss://api.veroyx.com/v2/telemetry/stream"\n    headers = {"Authorization": "Bearer vx_live_9812..."}\n    \n    async with websockets.connect(uri, extra_headers=headers) as ws:\n        while True:\n            data = await ws.recv()\n            frame = json.loads(data)\n            print(f"MET: {frame['met']} | Qx: {frame['q_x']} Qy: {frame['q_y']}")\n\nasyncio.run(stream_telemetry())`,
      Rust: `use tokio_tungstenite::{connect_async, tungstenite::client::IntoClientRequest};\nuse futures_util::StreamExt;\n\n#[tokio::main]\nasync fn main() {\n    let mut req = "wss://api.veroyx.com/v2/telemetry/stream".into_client_request().unwrap();\n    req.headers_mut().insert("Authorization", "Bearer vx_live_9812...".parse().unwrap());\n    \n    let (mut ws_stream, _) = connect_async(req).await.unwrap();\n    while let Some(msg) = ws_stream.next().await {\n        println!("Received: {}", msg.unwrap());\n    }\n}`
    }
  },
  {
    id: "get-ephemeris",
    method: "GET",
    path: "/v2/orbit/ephemeris?norad_id=60124",
    title: "Retrieve Orbital Ephemeris",
    description: "Fetch the latest state vectors (Position/Velocity) and Two-Line Elements (TLE) in standard CCSDS OEM JSON format.",
    auth: "Bearer Token",
    snippet: {
      cURL: `curl -X GET "https://api.veroyx.com/v2/orbit/ephemeris?norad_id=60124" \\\n  -H "Authorization: Bearer vx_live_9812..." \\\n  -H "Accept: application/json"`,
      Python: `import requests\n\nurl = "https://api.veroyx.com/v2/orbit/ephemeris"\nparams = {"norad_id": 60124}\nheaders = {"Authorization": "Bearer vx_live_9812..."}\n\nresponse = requests.get(url, headers=headers, params=params)\nprint(response.json())`
    }
  },
  {
    id: "post-maneuver",
    method: "POST",
    path: "/v2/command/maneuver",
    title: "Dispatch Maneuver Command",
    description: "Schedule a propulsion burn. Requires cryptographic HMAC-SHA256 signature of the payload using your private signing key to prevent command spoofing.",
    auth: "mTLS + HMAC",
    snippet: {
      Python: `import hmac\nimport hashlib\nimport json\nimport requests\nimport time\n\npayload = {\n    "norad_id": 60124,\n    "dv_vector_ntw": [1.5, 0.0, 0.0], # m/s\n    "ignition_epoch_jd": 2461012.5000\n}\nbody = json.dumps(payload)\n\n# Cryptographic Signature\nsecret = b"your_private_signing_key"\nsignature = hmac.new(secret, body.encode('utf-8'), hashlib.sha256).hexdigest()\n\nheaders = {\n    "Authorization": "Bearer vx_live_9812...",\n    "X-Veroyx-Signature": signature,\n    "Content-Type": "application/json"\n}\n\nresp = requests.post("https://api.veroyx.com/v2/command/maneuver", headers=headers, data=body)\nprint(resp.status_code)`
    }
  }
]

export default function DevelopersPage() {
  const [activeEndpoint, setActiveEndpoint] = useState<Endpoint>(API_ENDPOINTS[0])
  const [activeLang, setActiveLang] = useState<string>("Python")
  const [copied, setCopied] = useState(false)
  
  // Simulated Webhook Log
  const [webhookLogs, setWebhookLogs] = useState<{time: string, event: string, status: number}[]>([])

  useEffect(() => {
    // Auto-select first available language if current lang isn't in the new endpoint
    if (!activeEndpoint.snippet[activeLang]) {
      setActiveLang(Object.keys(activeEndpoint.snippet)[0])
    }
  }, [activeEndpoint, activeLang])

  useEffect(() => {
    const interval = setInterval(() => {
      const events = ["telemetry.degraded", "orbit.conjunction_warning", "system.meco_confirmed", "eps.eclipse_entry"]
      const newLog = {
        time: new Date().toISOString().split('T')[1].substring(0, 8) + 'Z',
        event: events[Math.floor(Math.random() * events.length)],
        status: 200
      }
      setWebhookLogs(prev => [newLog, ...prev].slice(0, 6))
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(activeEndpoint.snippet[activeLang])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getMethodColor = (method: string) => {
    switch(method) {
      case "GET": return "bg-cyan-950/80 text-cyan-400 border-cyan-500/30"
      case "POST": return "bg-emerald-950/80 text-emerald-400 border-emerald-500/30"
      case "WSS": return "bg-fuchsia-950/80 text-fuchsia-400 border-fuchsia-500/30"
      default: return "bg-slate-800 text-slate-300 border-slate-700"
    }
  }

  return (
    <div className="w-full h-full pt-24 px-8 pb-8 flex bg-slate-950 font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT PANEL: NAVIGATION & API SPECS */}
      <div className="w-1/3 h-full flex flex-col pr-6 border-r border-slate-800 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-widest flex items-center gap-3 uppercase">
            <Code2 className="w-6 h-6 text-indigo-400" />
            Developer Platform
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-wider">
            M2M Integration &amp; REST / WSS API v2
          </p>
        </div>

        <div className="space-y-6 font-mono text-xs">
          
          {/* API Keys */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4">
            <div className="text-indigo-400 font-bold tracking-widest flex items-center gap-2 mb-3">
              <Key className="w-4 h-4" /> PRODUCTION API KEY
            </div>
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded">
              <span className="text-slate-400 tracking-wider">vx_live_98124b8cf01...</span>
              <button className="text-slate-500 hover:text-white transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Endpoint Navigation */}
          <div className="space-y-3">
            <h3 className="text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800 pb-2">
              Core Endpoints
            </h3>
            <div className="flex flex-col gap-2">
              {API_ENDPOINTS.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setActiveEndpoint(ep)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    activeEndpoint.id === ep.id 
                      ? "bg-slate-900/80 border-slate-600 shadow-lg" 
                      : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${getMethodColor(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="font-bold text-slate-300 flex-1 truncate">{ep.path}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CENTER/RIGHT PANEL: DOCS & INTERACTIVE TERMINAL */}
      <div className="flex-1 h-full pl-8 flex flex-col overflow-y-auto">
        
        {/* Endpoint Documentation Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-1 rounded border font-bold text-xs font-mono tracking-wider ${getMethodColor(activeEndpoint.method)}`}>
              {activeEndpoint.method}
            </span>
            <span className="text-lg font-mono font-bold text-white tracking-wide">
              {activeEndpoint.path}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{activeEndpoint.title}</h2>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            {activeEndpoint.description}
          </p>
          
          <div className="flex items-center gap-4 mt-4 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> 
              AUTH: {activeEndpoint.auth}
            </div>
            {activeEndpoint.auth.includes("HMAC") && (
              <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-lg animate-pulse">
                <Lock className="w-3.5 h-3.5" /> 
                STRICT CRYPTOGRAPHY ENFORCED
              </div>
            )}
          </div>
        </div>

        {/* Code Snippet Editor */}
        <div className="w-full bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col flex-1 max-h-[450px]">
          {/* Editor Header */}
          <div className="flex items-center justify-between bg-[#161b22] border-b border-slate-800 px-4 py-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              {Object.keys(activeEndpoint.snippet).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1 rounded transition-colors ${activeLang === lang ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-800"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          
          {/* Editor Body */}
          <div className="p-4 overflow-y-auto flex-1 text-sm font-mono leading-relaxed whitespace-pre-wrap">
            <code className="text-[#c9d1d9]">
              {/* Basic Syntax Highlighting Simulation */}
              {activeEndpoint.snippet[activeLang].split('\n').map((line, i) => {
                // Highly simplified coloring for display purposes
                const isComment = line.trim().startsWith('#')
                const coloredLine = isComment 
                  ? <span className="text-[#8b949e]">{line}</span> 
                  : <span dangerouslySetInnerHTML={{ 
                      __html: line
                        .replace(/(".*?")/g, '<span class="text-[#a5d6ff]">$1</span>')
                        .replace(/\b(import|async|await|def|while|True|fn|let|mut|match|if)\b/g, '<span class="text-[#ff7b72]">$1</span>')
                    }} />
                return <div key={i} className="min-h-[1.25rem]">{coloredLine}</div>
              })}
            </code>
          </div>
        </div>

        {/* Live Webhook Monitor (Bottom Right) */}
        <div className="mt-6 w-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <h3 className="text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-400" /> Live Webhook Dispatch
            </h3>
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
              <Network className="w-3 h-3" /> LISTENING
            </span>
          </div>
          <div className="space-y-2">
            {webhookLogs.length === 0 ? (
              <div className="text-slate-600 animate-pulse">Waiting for events...</div>
            ) : (
              webhookLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-4 text-slate-300 opacity-90 hover:opacity-100 transition-opacity bg-slate-950/50 p-2 rounded border border-slate-800/50">
                  <span className="text-cyan-400 font-bold w-20">{log.time}</span>
                  <span className="flex-1 font-bold">{log.event}</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                    HTTP {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
