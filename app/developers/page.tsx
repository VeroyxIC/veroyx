\"use client\"

import { useState } from \"react\"
import { Terminal, Copy, Check, Code2, Globe, Key } from \"lucide-react\"

export default function DevelopersPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const curlExample1 = `curl -X GET \"https://veroyx.com/api/v1/telemetry?entity=companies&limit=5\" \\
  -H \"Accept: application/json\"`

  const curlExample2 = `curl -X GET \"https://veroyx.com/api/v1/telemetry?entity=technologies&trl=8\" \\
  -H \"Accept: application/json\"`

  const jsonSample = `{
  \"status\": \"success\",
  \"protocol\": \"VEROYX-AEROSPACE-v1\",
  \"timestamp\": \"2026-10-30T13:20:00.000Z\",
  \"companies\": [
    {
      \"name\": \"ABL Space Systems\",
      \"sector\": \"Deployable Launch\",
      \"funding_total\": \"$500M\",
      \"hq_location\": \"El Segundo, California\"
    }
  ]
}`

  return (
    <div className=\"min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans\">
      <div className=\"max-w-6xl mx-auto space-y-12\">
        <div className=\"border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6\">
          <div>
            <div className=\"inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3\">
              <Code2 className=\"w-3.5 h-3.5\" />
              Programmatic Telemetry Protocol
            </div>
            <h1 className=\"text-4xl md:text-5xl font-black tracking-tight text-white font-mono\">
              DEVELOPER & API SUITE
            </h1>
            <p className=\"text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed\">
              Query aerospace primes, propulsion systems, defense grants, and live launch manifests directly into your trading algorithms or internal intelligence pipelines.
            </p>
          </div>
          <div className=\"flex items-center gap-3 font-mono text-xs\">
            <span className=\"px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-bold\">
              API STATUS: 99.98% ONLINE
            </span>
          </div>
        </div>

        <div className=\"p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4\">
          <div className=\"flex items-center gap-2 font-mono text-sm text-cyan-400 font-bold\">
            <Key className=\"w-4 h-4\" /> PUBLIC ACCESS BEARER TOKEN
          </div>
          <div className=\"flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs\">
            <code className=\"text-slate-300 truncate w-full sm:w-auto\">
              Bearer vx_live_9f81a7b2e3c04d55b8014a9e
            </code>
            <button
              onClick={() => copySnippet(\"Bearer vx_live_9f81a7b2e3c04d55b8014a9e\", \"key\")}
              className=\"px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 shrink-0 flex items-center gap-1.5 transition-all\"
            >
              {copied === \"key\" ? <Check className=\"w-3.5 h-3.5 text-emerald-400\" /> : <Copy className=\"w-3.5 h-3.5\" />}
              {copied === \"key\" ? \"COPIED\" : \"COPY TOKEN\"}
            </button>
          </div>
        </div>

        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">
          <div className=\"space-y-6\">
            <h3 className=\"text-lg font-bold font-mono text-white flex items-center gap-2\">
              <Terminal className=\"w-4 h-4 text-cyan-400\" />
              REST ENDPOINTS
            </h3>
            <div className=\"space-y-4 font-mono text-xs\">
              <div className=\"p-4 rounded-xl bg-slate-900/30 border border-slate-800 space-y-3\">
                <div className=\"flex items-center gap-2\">
                  <span className=\"px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold\">GET</span>
                  <span className=\"text-slate-200\">/api/v1/telemetry</span>
                </div>
                <p className=\"text-slate-400 leading-relaxed font-sans text-xs\">
                  Returns aggregate or filtered telemetry arrays. Accepts granular filter parameters.
                </p>
                <div className=\"pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400\">
                  <div><code className=\"text-cyan-300\">entity</code>: <span className=\"text-slate-500\">all | companies | technologies | grants | launches</span></div>
                  <div><code className=\"text-cyan-300\">trl</code>: <span className=\"text-slate-500\">integer 1 - 9 (minimum readiness level)</span></div>
                  <div><code className=\"text-cyan-300\">limit</code>: <span className=\"text-slate-500\">integer (max 100, default 50)</span></div>
                </div>
              </div>

              <div className=\"space-y-2\">
                <div className=\"flex justify-between items-center text-slate-400 text-[11px]\">
                  <span>QUERY AEROSPACE PRIMES</span>
                  <button onClick={() => copySnippet(curlExample1, \"curl1\")} className=\"hover:text-cyan-400 flex items-center gap-1\">
                    {copied === \"curl1\" ? <Check className=\"w-3 h-3 text-emerald-400\" /> : <Copy className=\"w-3 h-3\" />}
                    Copy
                  </button>
                </div>
                <pre className=\"p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto\">
                  {curlExample1}
                </pre>
              </div>

              <div className=\"space-y-2\">
                <div className=\"flex justify-between items-center text-slate-400 text-[11px]\">
                  <span>FILTER BY FLIGHT-PROVEN HARDWARE (TRL &ge; 8)</span>
                  <button onClick={() => copySnippet(curlExample2, \"curl2\")} className=\"hover:text-cyan-400 flex items-center gap-1\">
                    {copied === \"curl2\" ? <Check className=\"w-3 h-3 text-emerald-400\" /> : <Copy className=\"w-3 h-3\" />}
                    Copy
                  </button>
                </div>
                <pre className=\"p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto\">
                  {curlExample2}
                </pre>
              </div>
            </div>
          </div>

          <div className=\"space-y-6\">
            <h3 className=\"text-lg font-bold font-mono text-white flex items-center gap-2\">
              <Globe className=\"w-4 h-4 text-purple-400\" />
              PAYLOAD SCHEMA RESPONSE
            </h3>
            <div className=\"relative\">
              <pre className=\"p-5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-[460px]\">
                {jsonSample}
              </pre>
              <div className=\"absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400\">
                JSON • 200 OK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
