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
      {/* Sharp, Cybernetic 'V' */}
      <path 
        d="M15 20 L50 85 L85 20 L68 20 L50 55 L32 20 Z" 
        fill="url(#vGrad)" 
      />
      
      {/* Orbital Sweep Arc */}
      <path 
        d="M 15 65 Q 50 90 85 45" 
        stroke="#0ea5e9" 
        strokeWidth="1.5" 
        strokeDasharray="4 4" 
        opacity="0.6" 
        fill="none" 
      />
      
      {/* Minimalist Satellite */}
      <g transform="translate(70, 35) rotate(-35)">
        {/* Solar Arrays */}
        <rect x="-18" y="-3" width="12" height="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
        <rect x="6" y="-3" width="12" height="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
        {/* Bus Chassis */}
        <rect x="-5" y="-5" width="10" height="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5"/>
        {/* Payload / Lens */}
        <circle cx="0" cy="0" r="2" fill="#f59e0b" />
      </g>
      
      <defs>
        <linearGradient id="vGrad" x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
    </svg>
  )
}
