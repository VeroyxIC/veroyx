'use client'

import React, { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'

interface ExportButtonProps {
  data: any[]
  filename?: string
}

export default function ExportButton({ data, filename = 'veroyx-export' }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const downloadCSV = () => {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const rows = data.map((obj) =>
      headers
        .map((h) => {
          let val = obj[h] ?? ''
          if (typeof val === 'string') {
            val = `"${val.replace(/"/g, '""')}"`
          }
          return val
        })
        .join(',')
    )
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 text-xs font-mono transition-all"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>EXPORT TELEMETRY</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-20 overflow-hidden font-mono text-xs">
          <button
            onClick={downloadCSV}
            className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
          >
            Export as CSV
          </button>
          <button
            onClick={downloadJSON}
            className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors border-t border-slate-800"
          >
            Export as JSON
          </button>
        </div>
      )}
    </div>
  )
}
