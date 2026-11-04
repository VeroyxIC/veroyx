"use client"

import React from "react"
import Link from "next/link"

interface VeroyxLogoProps {
  className?: string
  showText?: boolean
  size?: number
}

export default function VeroyxLogo({ className = "", showText = true, size = 26 }: VeroyxLogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3.5 group select-none ${className}`}>
      {/* 4-degree upward tilt towards the right corner */}
      <div 
        className="relative flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110"
        style={{ 
          width: size, 
          height: size,
          transform: "rotate(4deg)",
          transformOrigin: "center center"
        }}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.55)]">
          {/* Lensing Accretion Ring */}
          <circle cx="50" cy="50" r="44" stroke="#f59e0b" strokeWidth="2.2" strokeOpacity="0.35" strokeDasharray="3 3"/>
          <circle cx="50" cy="50" r="38" stroke="url(#logoLensGrad)" strokeWidth="3.2"/>
          <circle cx="50" cy="50" r="30" fill="#000000"/>

          {/* Luminous V Singularity */}
          <path
            d="M 28 32 L 43 32 L 50 64 L 57 32 L 72 32 L 55 77 L 45 77 Z"
            fill="url(#logoVGrad)"
          />
          <path
            d="M 33 34 L 41 34 L 50 60 L 59 34 L 67 34 L 54 74 L 46 74 Z"
            fill="#ffffff"
            opacity="0.9"
          />

          <defs>
            <linearGradient id="logoLensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="35%" stopColor="#fbbf24"/>
              <stop offset="80%" stopColor="#ea580c"/>
              <stop offset="100%" stopColor="#7c2d12"/>
            </linearGradient>
            <linearGradient id="logoVGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="50%" stopColor="#f59e0b"/>
              <stop offset="100%" stopColor="#b45309"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <span className="font-mono text-sm tracking-[0.32em] font-black text-white group-hover:text-amber-300 transition-colors uppercase">
          VEROYX
        </span>
      )}
    </Link>
  )
}
