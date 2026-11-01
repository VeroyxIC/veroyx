"use client"

import React from "react"

export default function BrandLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${className} filter drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer telemetry target ring */}
      <circle cx="50" cy="50" r="45" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <circle cx="50" cy="50" r="41" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
      <circle cx="50" cy="50" r="32" stroke="#1e1b4b" strokeWidth="3" opacity="0.8" />
      
      {/* Orbital Sweep curves */}
      <ellipse cx="50" cy="50" rx="42" ry="14" stroke="#f59e0b" strokeWidth="1.5" transform="rotate(-28 50 50)" strokeDasharray="200" strokeDashoffset="40" opacity="0.85" />
      <ellipse cx="50" cy="50" rx="38" ry="10" stroke="#38bdf8" strokeWidth="1" transform="rotate(35 50 50)" opacity="0.5" />
      
      {/* Crosshair nodes */}
      <line x1="50" y1="3" x2="50" y2="12" stroke="#38bdf8" strokeWidth="2" />
      <line x1="50" y1="88" x2="50" y2="97" stroke="#38bdf8" strokeWidth="2" />
      <line x1="3" y1="50" x2="12" y2="50" stroke="#38bdf8" strokeWidth="2" />
      <line x1="88" y1="50" x2="97" y2="50" stroke="#38bdf8" strokeWidth="2" />

      {/* Cyber-Insignia Center 'V' */}
      <path 
        d="M28 35L44 73H56L72 35H61L50 60L39 35H28Z" 
        fill="url(#vGrad)" 
        stroke="#38bdf8" 
        strokeWidth="1.5" 
        strokeLinejoin="round" 
      />
      
      {/* Sub-Orbital Core Satellite Mark */}
      <circle cx="50" cy="42" r="3" fill="#ffffff" className="animate-pulse" />
      <path d="M47 42H53M50 39V45" stroke="#38bdf8" strokeWidth="1" />
      
      <defs>
        <linearGradient id="vGrad" x1="50" y1="35" x2="50" y2="73" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
    </svg>
  )
}
