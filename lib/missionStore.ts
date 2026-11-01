import { create } from 'zustand'

export interface MissionProfile {
  id: string
  name: string
  missionName: string
  altitudeKm: number
  inclinationDeg: number
  dryMassKg: number
  propellantMassKg: number
  propulsionType: string
  targetOrbit: string
  missionLifetimeYears: number
  launchVehicle: string
  payloadPowerW: number
  busPowerW: number
  heritagePct: number
  costReservePct: number
}

export interface FlightAlarm {
  id: string
  level: 'WARNING' | 'CRITICAL'
  message: string
  subsystem: string
  timestampSec: number
}

const DEFAULT_MISSION: MissionProfile = {
  id: "VXO-2026",
  name: "PRIMARY LEO ASSET",
  missionName: "PRIMARY LEO ASSET",
  altitudeKm: 550,
  inclinationDeg: 53.2,
  dryMassKg: 180,
  propellantMassKg: 45,
  propulsionType: "Hydrazine Blowdown",
  targetOrbit: "SSO",
  missionLifetimeYears: 5,
  launchVehicle: "Falcon 9",
  payloadPowerW: 250,
  busPowerW: 200,
  heritagePct: 80,
  costReservePct: 15
}

interface MissionState {
  mission: MissionProfile
  isPlaying: boolean
  timeScale: number
  simTimeSec: number
  alarms: FlightAlarm[]
  totalWetMassKg: number
  totalPowerW: number
  setPlaying: (playing: boolean) => void
  setTimeScale: (scale: number) => void
  setSimTime: (time: number) => void
  addAlarm: (alarm: FlightAlarm) => void
  removeAlarm: (id: string) => void
  clearAlarms: () => void
  updateMission: (updates: Partial<MissionProfile>) => void
  resetMission: () => void
}

export const useMission = create<MissionState>((set) => ({
  mission: { ...DEFAULT_MISSION },
  isPlaying: true,
  timeScale: 10,
  simTimeSec: 0,
  alarms: [],
  totalWetMassKg: DEFAULT_MISSION.dryMassKg + DEFAULT_MISSION.propellantMassKg,
  totalPowerW: DEFAULT_MISSION.busPowerW + DEFAULT_MISSION.payloadPowerW,
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setSimTime: (simTimeSec) => set({ simTimeSec }),
  addAlarm: (alarm) => set((state) => ({ 
    alarms: [...state.alarms.filter(a => a.id !== alarm.id), alarm] 
  })),
  removeAlarm: (id) => set((state) => ({ 
    alarms: state.alarms.filter(a => a.id !== id) 
  })),
  clearAlarms: () => set({ alarms: [] }),
  updateMission: (updates) => set((state) => {
    const nextMission = { ...state.mission, ...updates }
    return { 
      mission: nextMission,
      totalWetMassKg: nextMission.dryMassKg + nextMission.propellantMassKg,
      totalPowerW: nextMission.busPowerW + nextMission.payloadPowerW
    }
  }),
  resetMission: () => set({ 
    mission: { ...DEFAULT_MISSION },
    totalWetMassKg: DEFAULT_MISSION.dryMassKg + DEFAULT_MISSION.propellantMassKg,
    totalPowerW: DEFAULT_MISSION.busPowerW + DEFAULT_MISSION.payloadPowerW
  }),
}))
