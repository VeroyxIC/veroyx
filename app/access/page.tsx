"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ShieldCheck, Award, Zap, Key, Lock, Globe, 
  Terminal, CheckCircle2, ArrowRight, Star, Cpu, 
  Users, Building, FileCheck, PhoneCall, Check, Sparkles 
} from "lucide-react"

export default function AccessPage() {
  const [seatCount, setSeatCount] = useState<number>(5)
  const [selectedTier, setSelectedTier] = useState<"ANALYST" | "PRIME" | "SOVEREIGN">("PRIME")
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [emailInput, setEmailInput] = useState<string>("")
  const [agencyInput, setAgencyInput] = useState<string>("")

  const tierPrices = {
    ANALYST: 10000,
    PRIME: 45000,
    SOVEREIGN: 250000
  }

  const monthlyTotal = selectedTier === "SOVEREIGN" 
    ? (tierPrices.SOVEREIGN / 12) * Math.max(1, Math.round(seatCount / 5))
    : tierPrices[selectedTier] * seatCount

  const annualTotal = monthlyTotal * 12

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput || !agencyInput) return
    setSubmitted(true)
  }

  return (
    <div className="w-full min-h-screen pt-20 pb-20 px-6 sm:px-12 bg-[#01030a] text-slate-100 font-sans selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* HERO TITLE */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL &amp; SOVEREIGN PROCUREMENT</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Enterprise <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">VIP Access</span> Portal
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Institutional licensing and operational access seats for defense prime contractors, sovereign space commands, intelligence agencies, and satellite constellation operators.
          </p>
        </div>

        {/* TIER COMPARISON CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* TIER 1: TACTICAL ANALYST */}
          <div 
            onClick={() => setSelectedTier("ANALYST")}
            className={`p-6 sm:p-8 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedTier === "ANALYST"
                ? "bg-slate-900/90 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                Tier 1 // Tactical Seat
              </div>
              <div className="text-2xl font-black text-white">Tactical Analyst</div>
              <div className="font-mono">
                <span className="text-3xl font-black text-cyan-400">$10,000</span>
                <span className="text-slate-500 text-xs"> / seat / month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Designed for aerospace intelligence analysts and orbital safety teams requiring high-cadence conjunction screening and sensor tasking.
              </p>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Full C2 Tactical Deck (`/c2`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> SSN Radar Sensor Tasking (`/tasking`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Conjunction Screening API &amp; Watchlist</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Standard 99.9% Uptime SLA</div>
              </div>
            </div>

            <button className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              selectedTier === "ANALYST" ? "bg-cyan-600 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              Select Analyst Tier
            </button>
          </div>

          {/* TIER 2: DEFENSE PRIME (FEATURED) */}
          <div 
            onClick={() => setSelectedTier("PRIME")}
            className={`p-6 sm:p-8 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
              selectedTier === "PRIME"
                ? "bg-slate-900/90 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase">
              MOST DEPLOYED
            </div>

            <div className="space-y-4">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                Tier 2 // Strategic Carrier
              </div>
              <div className="text-2xl font-black text-white">Defense Prime</div>
              <div className="font-mono">
                <span className="text-3xl font-black text-cyan-300">$45,000</span>
                <span className="text-slate-500 text-xs"> / seat / month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full-spectrum counter-space, kinetic intercept, hypersonic aerothermal OPIR tracking, and mesh self-healing suite.
              </p>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Everything in Analyst Tier</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Kinetic ASAT &amp; DEW Suite (`/intercept`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Hypersonic OPIR Tracking (`/hypersonic`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Dijkstra Mesh Self-Healing (`/resilience`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> EW &amp; Counter-PNT Nulling (`/pnt-resilience`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Dedicated Telemetry Uplink WebSocket</div>
              </div>
            </div>

            <button className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              selectedTier === "PRIME" ? "bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-lg" : "bg-slate-900 text-slate-400"
            }`}>
              Select Prime Tier
            </button>
          </div>

          {/* TIER 3: SOVEREIGN SPACE COMMAND */}
          <div 
            onClick={() => setSelectedTier("SOVEREIGN")}
            className={`p-6 sm:p-8 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedTier === "SOVEREIGN"
                ? "bg-slate-900/90 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-500"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Tier 3 // National Security
              </div>
              <div className="text-2xl font-black text-white">Sovereign Command</div>
              <div className="font-mono">
                <span className="text-3xl font-black text-amber-400">$250,000</span>
                <span className="text-slate-500 text-xs"> / node / year</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated air-gapped sovereign deployment for national space defense headquarters, satellite QKD relays, and SCIF integration.
              </p>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Complete 100+ Module Suite (`/nexus`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Satellite QKD Entanglement (`/qkd`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> HEMP &amp; Trapped Belts (`/hemp-sim`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Asteroid Planetary Defense (`/planetary-defense`)</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Air-Gapped On-Premises SCIF Cluster</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Custom Hardware Cryptographic Enclave</div>
              </div>
            </div>

            <button className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              selectedTier === "SOVEREIGN" ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400"
            }`}>
              Select Sovereign Tier
            </button>
          </div>
        </div>

        {/* INTERACTIVE SEAT ESTIMATOR */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1">
                Interactive License Calculator
              </div>
              <h2 className="text-2xl font-black text-white">Configure Your Enterprise Deployment</h2>
              <p className="text-xs text-slate-400 mt-1">
                Scale tactical seats across command centers, flight dynamics facilities, and radar outposts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">OPERATIONAL SEATS / NODES:</span>
                <span className="text-white font-bold text-sm">{seatCount} SEATS</span>
              </div>
              <input 
                type="range" min="1" max="25" step="1"
                value={seatCount}
                onChange={e => setSeatCount(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1 Seat (Single Desk)</span>
                <span>10 Seats (Squadron)</span>
                <span>25 Seats (Command HQ)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">MONTHLY COMMITMENT:</span>
                <span className="text-cyan-300 font-bold text-lg">${monthlyTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ANNUAL RUN-RATE:</span>
                <span className="text-white font-bold text-lg">${annualTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* PROCUREMENT RFQ INQUIRY FORM */}
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Request Verified Procurement Package</span>
            </div>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-white font-bold text-sm">Procurement Dossier Dispatched</div>
                <p className="text-xs text-slate-400">
                  Your designated defense procurement contact has been routed to our classified sales liaison. Check your agency inbox for license token generation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">OFFICIAL AGENCY / PRIME DOMAIN EMAIL</label>
                  <input 
                    type="email" 
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="officer@spaceforce.mil or director@prime.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ORGANIZATION / COMMAND TITLE</label>
                  <input 
                    type="text" 
                    required
                    value={agencyInput}
                    onChange={e => setAgencyInput(e.target.value)}
                    placeholder="e.g. USSF Space Systems Command, NATO Joint Air Power"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
                >
                  <span>Authorize Procurement Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="text-[9px] text-slate-500 text-center leading-relaxed font-mono">
              Compliant with ITAR 22 C.F.R. § 120-130, NIST SP 800-171, and CMMC Level 3.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
