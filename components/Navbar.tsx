import Link from 'next/link'
import CommandBar from '@/components/CommandBar'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 sm:px-12">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-mono font-black text-white text-lg group-hover:scale-105 transition-transform">
              V
            </div>
            <span className="font-mono text-xl font-bold tracking-wider text-white">
              VEROYX<span className="text-cyan-400">.</span>
            </span>
          </Link>
          <CommandBar />
        </div>

        <nav className="flex items-center gap-6 text-sm font-mono text-slate-400">
          <Link href="/companies" className="hover:text-cyan-400 transition-colors">
            COMPANIES
          </Link>
          <Link href="/technologies" className="hover:text-cyan-400 transition-colors">
            TECH
          </Link>
          <Link href="/grants" className="hover:text-cyan-400 transition-colors">
            CONTRACTS
          </Link>
          <Link href="/launches" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            LAUNCHES
          </Link>
          <Link href="/analytics" className="text-white hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/50">
            RADAR
          </Link>
        </nav>
      </div>
    </header>
  )
}
