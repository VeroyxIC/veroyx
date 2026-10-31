export interface AerospaceTech {
  slug: string
  name: string
  trl: number // Technology Readiness Level 1-9
  domain: "Propulsion" | "Communications" | "Power & Energy" | "Structures & Materials"
  governingStandard: string
  summary: string
  specifications: Record<string, string>
  heritageMissions: string[]
  veroyxEnginePath: string
}

export const AEROSPACE_TECHNOLOGIES: Record<string, AerospaceTech> = {
  "hall-effect-thruster": {
    slug: "hall-effect-thruster",
    name: "Hall-Effect Electric Propulsion (HET)",
    trl: 9,
    domain: "Propulsion",
    governingStandard: "AIAA S-110-2005",
    summary: "Electrostatic propulsion utilizing crossed electric and magnetic fields to ionize and accelerate noble gas propellant (Xenon/Krypton) at high specific impulses.",
    specifications: {
      "Specific Impulse (Isp)": "1,650 - 2,200 seconds",
      "Thrust Output": "40 - 250 mN",
      "Power Demand": "500 W - 5.0 kW",
      "Propellant Options": "Xenon, Krypton, Iodine"
    },
    heritageMissions: ["Starlink v1.5/v2", "ESA SMART-1", "NASA Psyche (SPT-140)"],
    veroyxEnginePath: "/mission-builder"
  },
  "1550nm-lasercom": {
    slug: "1550nm-lasercom",
    name: "1550nm Optical Intersatellite Crosslink (OISL)",
    trl: 9,
    domain: "Communications",
    governingStandard: "CCSDS 141.0-B / SDA OISL Standard v3.0",
    summary: "Free-space narrow-beam optical communications operating in the infrared C-band, providing gigabit-per-second intersatellite crosslinks with minimal mass and power penalty.",
    specifications: {
      "Operating Wavelength": "1550 nm (C-Band Optical)",
      "Data Rate Capacity": "1.0 - 10.0 Gbps",
      "Acquisition Range": "Up to 5,500 km",
      "Pointing Requirement": "< 5.0 microradians (Fine Steering)"
    },
    heritageMissions: ["SDA Tranche 0/1", "NASA LCRD", "SpaceX Starlink Laser Mesh"],
    veroyxEnginePath: "/lasercom"
  },
  "triple-junction-gaas": {
    slug: "triple-junction-gaas",
    name: "Triple-Junction GaAs Solar Cells (InGaP/InGaAs/Ge)",
    trl: 9,
    domain: "Power & Energy",
    governingStandard: "ECSS-E-ST-20-08C",
    summary: "High-efficiency multi-junction photovoltaic cells engineered for space environments with elevated radiation tolerance against trapped proton and electron belts.",
    specifications: {
      "Beginning-of-Life Efficiency": "29.5% - 32.0% AM0",
      "Operating Temperature Range": "-100°C to +110°C",
      "Temperature Coefficient (Pmax)": "-0.32% / °C",
      "Radiation Degradation (1e15 1MeV e-)": "~15% loss at 15-year GEO"
    },
    heritageMissions: ["ISS Solar Arrays", "NASA Europa Clipper", "James Webb Space Telescope"],
    veroyxEnginePath: "/power"
  },
  "whipple-bumper": {
    slug: "whipple-bumper",
    name: "Whipple Stuffed Micrometeoroid Shielding (MMOD)",
    trl: 9,
    domain: "Structures & Materials",
    governingStandard: "NASA-STD-8719.14C / ISO 24113",
    summary: "Multi-wall hypervelocity impact shielding consisting of an outer sacrificial aluminum bumper, intermediate ceramic Nextel/Kevlar fabrics, and an internal rear pressure wall.",
    specifications: {
      "Ballistic Limit Velocity": "3.0 to 14.0 km/s hypervelocity",
      "Stand-Off Distance": "50 to 150 mm",
      "Absorbed Kinetic Energy": "> 5.5 kJ projectile disruption",
      "Material Composition": "Al 6061-T6 + Nextel 312 + Kevlar 49"
    },
    heritageMissions: ["ISS US Destiny Module", "Orion Crew Module", "Cygnus Cargo Vehicle"],
    veroyxEnginePath: "/mmod"
  }
}
