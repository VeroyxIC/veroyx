import { createClient } from '@supabase/supabase-js'
import CompareClient from '@/components/CompareClient'

export const dynamic = 'force-dynamic'

export default async function ComparePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let companies: any[] = []
  let technologies: any[] = []

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const [compRes, techRes] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('technologies').select('*').order('name')
    ])
    if (compRes.data) companies = compRes.data
    if (techRes.data) technologies = techRes.data
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 sm:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Telemetry */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Technical Shootout & Trade Study Matrix
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white font-mono">
              BENCHMARKING RADAR
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">
              Conduct side-by-side comparative trade studies across venture-backed aerospace primes, propulsion systems, capital capitalization, and readiness levels.
            </p>
          </div>
          <div className="font-mono text-xs text-slate-500">
            RADAR MODE: <span className="text-cyan-400 font-semibold">DUAL-SLOT TELEMETRY</span>
          </div>
        </div>

        {/* Client Comparison Component */}
        <CompareClient companies={companies} technologies={technologies} />

      </div>
    </div>
  )
}
