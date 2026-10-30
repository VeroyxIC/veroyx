"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bookmark, Building, Cpu, Rocket, Bell, Trash2, ArrowRight } from "lucide-react"

export default function WatchlistPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadItems = async () => {
    try {
      const res = await fetch("/api/v1/watchlist")
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const removeItem = async (item: any) => {
    try {
      await fetch("/api/v1/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: item.entity_type,
          entityId: item.entity_id,
          entityName: item.entity_name,
        }),
      })
      localStorage.removeItem(`vx_watch_${item.entity_type}_${item.entity_id}`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-20 px-6 sm:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-3">
              <Bookmark className="w-3.5 h-3.5" />
              Institutional Target Tracking
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
              OPERATIONS WATCHLIST
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
              Curated telemetry feed monitoring prime capitalization, subsystem status changes, and imminent orbital flight manifests.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>DISPATCH ALERTS: <strong className="text-cyan-400">ENABLED</strong></span>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            LOADING WATCHLIST TELEMETRY ARRAYS...
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 uppercase text-[10px] text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30">
                      {item.entity_type === "company" && <Building className="w-3 h-3" />}
                      {item.entity_type === "technology" && <Cpu className="w-3 h-3" />}
                      {item.entity_type === "launch" && <Rocket className="w-3 h-3" />}
                      {item.entity_type}
                    </span>
                    <button
                      onClick={() => removeItem(item)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Untrack entity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight truncate">
                      {item.entity_name}
                    </h3>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tracked since: {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE TELEMETRY
                  </span>
                  <Link
                    href={
                      item.entity_type === "company"
                        ? `/companies/${item.entity_slug}`
                        : item.entity_type === "technology"
                        ? `/technologies/${item.entity_slug}`
                        : "/launches"
                    }
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-bold"
                  >
                    DOSSIER <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-slate-900/20 border border-dashed border-slate-800 text-center space-y-4">
            <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-mono text-base font-bold text-white">NO MONITORED ENTITIES YET</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                Click &quot;TRACK ENTITY&quot; on any prime contractor dossier, flight system, or launch manifest to aggregate updates here.
              </p>
            </div>
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 transition-all"
            >
              BROWSE PRIMES DIRECTORY <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
