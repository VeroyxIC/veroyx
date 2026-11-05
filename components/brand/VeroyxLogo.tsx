"use client"

import React from "react"
import Link from "next/link"

interface VeroyxLogoProps {
  className?: string
  showText?: boolean
  size?: number
}

export default function VeroyxLogo({ className = "", showText = true, size = 28 }: VeroyxLogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Pure Razor-Sharp Glowing Singularity V (No circles, no outer borders) */}
      <div 
        className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          className="w-full h-full drop-shadow-[0_0_14px_rgba(251,191,36,0.6)]"
        >
          {/* Outer Radiant Flare */}
          <path
            d="M 16 18 L 36 18 L 50 68 L 64 18 L 84 18 L 57 88 L 43 88 Z"
            fill="url(#vSingularityAmber)"
          />
          {/* Inner Hyper-Luminous Plasma Core */}
          <path
            d="M 27 20 L 37 20 L 50 63 L 63 20 L 73 20 L 54 83 L 46 83 Z"
            fill="url(#vSingularityWhite)"
          />
          <defs>
            <linearGradient id="vSingularityAmber" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="vSingularityWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <span className="font-mono text-sm tracking-[0.28em] font-black text-white group-hover:text-amber-200 transition-colors uppercase">
          VEROYX
        </span>
      )}
    </Link>
  )
}
