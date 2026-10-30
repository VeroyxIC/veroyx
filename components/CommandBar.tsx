'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Building2, Cpu, FileText, ExternalLink, Loader2 } from 'lucide-react'

interface QuickItem {
  name: string
  href: string
  category: 'Companies' | 'Technologies' | 'Contracts' | 'Launches'
  sub: string
}

const DEFAULT_ITEMS: QuickItem[] = [
  { name: 'Varda Space Industries', href: '/companies/varda-space-industries', category: 'Companies', sub: 'In-Space Manufacturing' },
  { name: 'Firefly Aerospace', href: '/companies/firefly-aerospace', category: 'Companies', sub: 'Launch & Lunar Landers' },
  { name: 'Dream Chaser Spaceplane', href: '/technologies/dream-chaser-spaceplane', category: 'Technologies', sub: 'TRL 8 • Reusable Spaceplane' },
  { name: 'NASA CLPS CP-12 Task Order', href: '/grants/nasa-clps-blue-ghost-task-1', category: 'Contracts', sub: 'NASA Exploration Systems' },
]

export default function CommandBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [liveItems, setLiveItems] = useState<QuickItem[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setLiveItems([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setLiveItems(data.results || [])
      } catch {
        setLiveItems([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const runSelect = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const displayedItems = query.length >= 2 ? liveItems : DEFAULT_ITEMS

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-cyan-500/40 text-xs font-mono transition-all"
      >
        <Search className="w-3.5 h-3.5 text-cyan-400" />
        <span>Search index...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-sans">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono z-10">
            <Command className="w-full">
              <div className="flex items-center px-4 border-b border-slate-800">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0 mr-3" />
                ) : (
                  <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-3" />
                )}
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Type to query database in real-time..."
                  className="w-full bg-transparent py-4 text-sm text-slate-100 placeholder-slate-500 outline-none"
                  autoFocus
                />
                <kbd className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-500">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-96 overflow-y-auto p-2 space-y-1">
                {displayedItems.length === 0 && !loading && (
                  <Command.Empty className="py-8 text-center text-xs text-slate-500">
                    No live telemetry entries found.
                  </Command.Empty>
                )}

                {displayedItems.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.name}
                    onSelect={() => runSelect(item.href)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.category === 'Companies' && <Building2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                      {item.category === 'Technologies' && <Cpu className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                      {item.category === 'Contracts' && <FileText className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                      <div>
                        <div className="font-medium text-slate-200 group-hover:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{item.sub}</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.List>

              <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/80 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Navigate <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">↑</kbd> <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">↓</kbd></span>
                <span>Select <kbd className="text-[9px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">ENTER</kbd></span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
