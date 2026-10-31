"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface MissionProfile {
  missionName: string
  targetOrbit: "LEO / SSO" | "MEO Navigation" | "GEO Telecom" | "Lunar Gateway / TLI"
  altitudeKm: number
  inclinationDeg: number
  dryMassKg: number
  propellantMassKg: number
  payloadPowerW: number
  busPowerW: number
  missionLifetimeYears: number
  launchVehicle: string
  heritagePct: number
  costReservePct: number
}

export const DEFAULT_MISSION: MissionProfile = {
  missionName: "VEROYX-SAT-1",
  targetOrbit: "LEO / SSO",
  altitudeKm: 550,
  inclinationDeg: 51.64,
  dryMassKg: 320,
  propellantMassKg: 65,
  payloadPowerW: 180,
  busPowerW: 140,
  missionLifetimeYears: 5.0,
  launchVehicle: "Falcon 9 (Reusable Booster)",
  heritagePct: 60,
  costReservePct: 25,
}

interface MissionContextType {
  mission: MissionProfile
  updateMission: (updates: Partial<MissionProfile>) => void
  resetMission: () => void
  totalWetMassKg: number
  totalPowerW: number
}

const MissionContext = createContext<MissionContextType | undefined>(undefined)

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [mission, setMission] = useState<MissionProfile>(DEFAULT_MISSION)

  // Load persisted mission state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("veroyx_active_mission")
      if (saved) {
        setMission(JSON.parse(saved))
      }
    } catch (e) {
      console.warn("Could not load mission from localStorage", e)
    }
  }, [])

  const updateMission = (updates: Partial<MissionProfile>) => {
    setMission((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem("veroyx_active_mission", JSON.stringify(next))
      } catch (e) {
        console.warn("Could not persist mission to localStorage", e)
      }
      return next
    })
  }

  const resetMission = () => {
    setMission(DEFAULT_MISSION)
    try {
      localStorage.setItem("veroyx_active_mission", JSON.stringify(DEFAULT_MISSION))
    } catch (e) {
      console.warn("Could not reset mission in localStorage", e)
    }
  }

  const totalWetMassKg = mission.dryMassKg + mission.propellantMassKg
  const totalPowerW = mission.payloadPowerW + mission.busPowerW

  return (
    <MissionContext.Provider
      value={{
        mission,
        updateMission,
        resetMission,
        totalWetMassKg,
        totalPowerW,
      }}
    >
      {children}
    </MissionContext.Provider>
  )
}

export function useMission() {
  const context = useContext(MissionContext)
  if (!context) {
    throw new Error("useMission must be used within a MissionProvider")
  }
  return context
}
