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
    <Link href="/" className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Pure Razor-Sharp Glowing Singularity V (Zero borders, zero circles) */}
      <div 
        className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          className="w-full h-full drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]"
        >
          {/* Outer Radiant Flare */}
          <path
            d="M 14 18 L 36 18 L 50 70 L 64 18 L 86 18 L 58 88 L 42 88 Z"
            fill="url(#vAmberFlare)"
          />
          {/* Inner Hyper-Luminous Plasma Core */}
          <path
            d="M 26 20 L 37 20 L 50 64 L 63 20 L 74 20 L 55 83 L 45 83 Z"
            fill="url(#vWhiteCore)"
          />
          <defs>
            <linearGradient id="vAmberFlare" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="vWhiteCore" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <span className="font-mono text-xs sm:text-sm tracking-[0.28em] font-black text-white group-hover:text-amber-200 transition-colors uppercase">
          VEROYX
        </span>
      )}
    </Link>
  )
}
