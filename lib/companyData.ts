export interface AerospaceCompany {
  slug: string
  name: string
  ticker?: string
  hq: string
  founded: number
  tier: "Prime / Heavy Launch" | "SmallSat Bus / Payload" | "SAR & Earth Observation" | "In-Space Servicing (ISAM)"
  valuationOrCap: string
  summary: string
  primaryPlatforms: {
    name: string
    type: string
    payloadToLeoKg?: number
    dryMassKg?: number
    heritageFlights?: number
    description: string
  }[]
  defenseContracts: {
    agency: "NASA" | "USSF / SDA" | "DARPA" | "ESA"
    program: string
    awardValue: string
    status: "ACTIVE" | "COMPLETED" | "SCHEDULED"
  }[]
  veroyxSimulationPreset: {
    missionName: string
    altitudeKm: number
    inclinationDeg: number
    dryMassKg: number
    propellantMassKg: number
    busPowerW: number
    payloadPowerW: number
  }
}

export const AEROSPACE_COMPANIES: Record<string, AerospaceCompany> = {
  "spacex": {
    slug: "spacex",
    name: "Space Exploration Technologies Corp. (SpaceX)",
    hq: "Hawthorne, CA & Starbase, TX",
    founded: 2002,
    tier: "Prime / Heavy Launch",
    valuationOrCap: "$210B (Private)",
    summary: "Commercial aerospace manufacturer and orbital launch provider operating Falcon 9, Falcon Heavy, and Starship, as well as the Starlink broadband megaconstellation.",
    primaryPlatforms: [
      { name: "Falcon 9 Block 5", type: "Two-stage reusable launch vehicle", payloadToLeoKg: 22800, heritageFlights: 380, description: "Standard medium-lift workhorse with autonomous drone-ship booster propulsive recovery." },
      { name: "Starship / Super Heavy", type: "Super heavy-lift fully reusable architecture", payloadToLeoKg: 150000, heritageFlights: 6, description: "Methane-oxygen stainless steel architecture selected for NASA Artemis III Human Landing System (HLS)." }
    ],
    defenseContracts: [
      { agency: "NASA", program: "Artemis III / IV HLS Moon Lander", awardValue: "$2.89B + $1.15B", status: "ACTIVE" },
      { agency: "USSF / SDA", program: "NSSL Phase 3 Lane 1 / 2 Manifests", awardValue: "$5.6B Multi-Award", status: "ACTIVE" },
      { agency: "NASA", program: "Commercial Crew Transportation (Crew Dragon)", awardValue: "$4.9B", status: "ACTIVE" }
    ],
    veroyxSimulationPreset: {
      missionName: "STARLINK-V2-MINI",
      altitudeKm: 530,
      inclinationDeg: 43.0,
      dryMassKg: 780,
      propellantMassKg: 150,
      busPowerW: 420,
      payloadPowerW: 850
    }
  },
  "rocket-lab": {
    slug: "rocket-lab",
    name: "Rocket Lab USA, Inc.",
    ticker: "NASDAQ: RKLB",
    hq: "Long Beach, CA & Mahia, NZ",
    founded: 2006,
    tier: "Prime / Heavy Launch",
    valuationOrCap: "$5.8B",
    summary: "End-to-end space company operating the Electron small launch vehicle, developing the Neutron medium-lift rocket, and manufacturing the Photon / Pioneer spacecraft bus line.",
    primaryPlatforms: [
      { name: "Electron", type: "Dedicated smallsat launch vehicle (Rutherford 3D-printed engines)", payloadToLeoKg: 300, heritageFlights: 54, description: "Dedicated carbon-composite launcher featuring electric-pump-fed propulsion and Curie kick stage." },
      { name: "Photon / Pioneer Bus", type: "Configurable satellite bus", dryMassKg: 350, description: "Deep-space capable bus architecture utilized for NASA CAPSTONE lunar pathfinder and EscaPADE Mars mission." }
    ],
    defenseContracts: [
      { agency: "USSF / SDA", program: "Tranche 2 Tracking Layer (18 Satellites)", awardValue: "$515M", status: "ACTIVE" },
      { agency: "NASA", program: "EscaPADE Twin Martian Probes", awardValue: "$80M", status: "SCHEDULED" },
      { agency: "USSF / SDA", program: "Tactically Responsive Space (VICTUS HAZE)", awardValue: "$32M", status: "ACTIVE" }
    ],
    veroyxSimulationPreset: {
      missionName: "PHOTON-SDA-T2",
      altitudeKm: 980,
      inclinationDeg: 81.0,
      dryMassKg: 340,
      propellantMassKg: 95,
      busPowerW: 220,
      payloadPowerW: 380
    }
  },
  "planet-labs": {
    slug: "planet-labs",
    name: "Planet Labs PBC",
    ticker: "NYSE: PL",
    hq: "San Francisco, CA",
    founded: 2010,
    tier: "SAR & Earth Observation",
    valuationOrCap: "$920M",
    summary: "Pioneer of commercial Earth observation constellations operating over 200 Dove and Pelican multispectral optical satellites providing daily global scanning.",
    primaryPlatforms: [
      { name: "SuperDove (Flock 4)", type: "3U / 12U CubeSat optical constellation", dryMassKg: 12, description: "Eight-band visible/NIR scanning line-array capturing 3.7m resolution imagery daily." },
      { name: "Pelican", type: "High-resolution agile optical satellite bus", dryMassKg: 85, description: "Sub-50cm rapid-revisit imaging platform equipped with intersatellite optical crosslinks." }
    ],
    defenseContracts: [
      { agency: "USSF / SDA", program: "NRO Electro-Optical Commercial Layer (EOCL)", awardValue: "$145M", status: "ACTIVE" },
      { agency: "NASA", program: "Commercial SmallSat Data Acquisition (CSDA)", awardValue: "$28M", status: "ACTIVE" }
    ],
    veroyxSimulationPreset: {
      missionName: "PELICAN-OPTICAL-01",
      altitudeKm: 500,
      inclinationDeg: 97.4,
      dryMassKg: 85,
      propellantMassKg: 14,
      busPowerW: 75,
      payloadPowerW: 160
    }
  },
  "astroscale": {
    slug: "astroscale",
    name: "Astroscale Holdings Inc.",
    ticker: "TYO: 186A",
    hq: "Tokyo, Japan & Harwell, UK",
    founded: 2013,
    tier: "In-Space Servicing (ISAM)",
    valuationOrCap: "$1.2B",
    summary: "Market leader in satellite life extension, active orbital debris removal (ADR), and on-orbit proximity rendezvous and docking services.",
    primaryPlatforms: [
      { name: "ADRAS-J", type: "Active Debris Removal Inspection Probe", dryMassKg: 150, description: "Autonomous non-cooperative rendezvous probe executed sub-50m fly-around inspection of an upper stage." },
      { name: "ELSA-M", type: "Multi-client active deorbit chaser", dryMassKg: 320, description: "Magnetic and robotic capture mechanism designed for multi-target constellation debris disposal." }
    ],
    defenseContracts: [
      { agency: "ESA", program: "CleanSpace One / ADR Passive Target Disposal", awardValue: "€105M", status: "ACTIVE" },
      { agency: "USSF / SDA", program: "Space Safari / In-Orbit Refueling & Servicing", awardValue: "$25.5M", status: "ACTIVE" }
    ],
    veroyxSimulationPreset: {
      missionName: "ELSA-M-CHASER",
      altitudeKm: 600,
      inclinationDeg: 98.0,
      dryMassKg: 310,
      propellantMassKg: 120,
      busPowerW: 180,
      payloadPowerW: 240
    }
  }
}
