export interface TLEData {
  name: string
  line1: string
  line2: string
}

export interface ECIState {
  r: [number, number, number] // km [x, y, z]
  v: [number, number, number] // km/s [vx, vy, vz]
  lat: number // deg
  lon: number // deg
  altKm: number // km
  speedKms: number // km/s
  periodMin: number
}

// Earth Gravitational Constants (WGS-84)
const MU_EARTH = 398600.4418 // km^3/s^2
const R_EARTH = 6378.137 // km
const J2 = 0.00108262668 // J2 oblateness coefficient

export function parseTLE(line1: string, line2: string) {
  // Line 1 parsing
  const noradId = parseInt(line1.substring(2, 7).trim(), 10)
  const intlDesig = line1.substring(9, 17).trim()
  const epochYear2Digit = parseInt(line1.substring(18, 20).trim(), 10)
  const epochYear = epochYear2Digit < 57 ? 2000 + epochYear2Digit : 1900 + epochYear2Digit
  const epochDay = parseFloat(line1.substring(20, 32).trim())
  const bstar = parseFloat(line1.substring(53, 59).trim()) * Math.pow(10, parseFloat(line1.substring(59, 61).trim()))

  // Line 2 parsing
  const inclinationDeg = parseFloat(line2.substring(8, 16).trim())
  const raanDeg = parseFloat(line2.substring(17, 25).trim())
  const eccentricity = parseFloat("0." + line2.substring(26, 33).trim())
  const argPerigeeDeg = parseFloat(line2.substring(34, 42).trim())
  const meanAnomalyDeg = parseFloat(line2.substring(43, 51).trim())
  const meanMotionRevDay = parseFloat(line2.substring(52, 63).trim())

  return {
    noradId,
    intlDesig,
    epochYear,
    epochDay,
    bstar,
    inclinationDeg,
    raanDeg,
    eccentricity,
    argPerigeeDeg,
    meanAnomalyDeg,
    meanMotionRevDay
  }
}

export function propagateJ2Analytical(tle: ReturnType<typeof parseTLE>, deltaMinutes: number): ECIState {
  const n0_rad_min = (tle.meanMotionRevDay * 2 * Math.PI) / 1440 // rad/min
  const n0_rad_sec = n0_rad_min / 60 // rad/sec
  const a0 = Math.pow(MU_EARTH / (n0_rad_sec * n0_rad_sec), 1 / 3) // semi-major axis (km)
  const p = a0 * (1 - tle.eccentricity * tle.eccentricity) // semi-latus rectum (km)

  const inc_rad = (tle.inclinationDeg * Math.PI) / 180
  const cos_i = Math.cos(inc_rad)
  const sin_i = Math.sin(inc_rad)

  // J2 secular perturbation rates (rad/min)
  const j2_factor = 1.5 * J2 * Math.pow(R_EARTH / p, 2) * n0_rad_min
  const d_raan_dt = -j2_factor * cos_i // RAAN precession rate
  const d_argp_dt = j2_factor * (2.5 * cos_i * cos_i - 0.5) // Argument of perigee rate

  // Propagated angles at t + deltaMinutes
  const raan = (tle.raanDeg * Math.PI) / 180 + d_raan_dt * deltaMinutes
  const argp = (tle.argPerigeeDeg * Math.PI) / 180 + d_argp_dt * deltaMinutes
  const meanAnomaly = ((tle.meanAnomalyDeg * Math.PI) / 180 + n0_rad_min * deltaMinutes) % (2 * Math.PI)

  // Solve Kepler's equation M = E - e*sin(E) via Newton-Raphson
  let E = meanAnomaly
  for (let iter = 0; iter < 10; iter++) {
    const f = E - tle.eccentricity * Math.sin(E) - meanAnomaly
    const f_prime = 1 - tle.eccentricity * Math.cos(E)
    const dE = f / f_prime
    E -= dE
    if (Math.abs(dE) < 1e-8) break
  }

  // True Anomaly nu
  const sin_nu = (Math.sqrt(1 - tle.eccentricity * tle.eccentricity) * Math.sin(E)) / (1 - tle.eccentricity * Math.cos(E))
  const cos_nu = (Math.cos(E) - tle.eccentricity) / (1 - tle.eccentricity * Math.cos(E))
  const nu = Math.atan2(sin_nu, cos_nu)

  // Orbital Radius r (km)
  const r = (a0 * (1 - tle.eccentricity * tle.eccentricity)) / (1 + tle.eccentricity * Math.cos(nu))

  // Position in Orbital Plane (Perifocal P-Q coordinates)
  const u = argp + nu // Argument of latitude
  const x_pq = r * Math.cos(u)
  const y_pq = r * Math.sin(u)

  // Rotate to ECI J2000 Coordinates
  const cos_raan = Math.cos(raan)
  const sin_raan = Math.sin(raan)

  const x_eci = x_pq * cos_raan - y_pq * cos_i * sin_raan
  const y_eci = x_pq * sin_raan + y_pq * cos_i * cos_raan
  const z_eci = y_pq * sin_i

  // Velocity components in km/s
  const speedKms = Math.sqrt(MU_EARTH * (2 / r - 1 / a0))
  const vx_eci = -speedKms * Math.sin(u) * cos_raan
  const vy_eci = -speedKms * Math.sin(u) * sin_raan
  const vz_eci = speedKms * Math.cos(u) * sin_i

  // Sub-satellite Geodetic Latitude and Longitude
  const lat = (Math.asin(z_eci / r) * 180) / Math.PI
  // Account for Earth rotation (15 deg/hour = 0.25 deg/min)
  const gmst_deg = ((tle.epochDay * 360 + deltaMinutes * 0.25) % 360)
  let lon = (Math.atan2(y_eci, x_eci) * 180) / Math.PI - gmst_deg
  lon = ((((lon + 180) % 360) + 360) % 360) - 180 // wrap to [-180, 180]

  const altKm = r - R_EARTH
  const periodMin = (2 * Math.PI) / n0_rad_min

  return {
    r: [x_eci, y_eci, z_eci],
    v: [vx_eci, vy_eci, vz_eci],
    lat,
    lon,
    altKm,
    speedKms,
    periodMin
  }
}
