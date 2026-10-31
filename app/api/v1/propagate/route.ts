import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      epoch_utc = "2026-10-31T00:00:00Z",
      semi_major_axis_km = 6928.137,
      eccentricity = 0.001,
      inclination_deg = 51.64,
      raan_deg = 142.3,
      duration_hours = 24,
      step_size_sec = 60,
      frame = "J2000_ECI"
    } = body

    const rEarthKm = 6378.137
    const mu = 398600.4418
    const j2 = 0.00108263

    const a = Number(semi_major_axis_km)
    const e = Number(eccentricity)
    const incRad = (Number(inclination_deg) * Math.PI) / 180

    // Orbital period
    const n = Math.sqrt(mu / Math.pow(a, 3)) // rad/s
    const periodSec = (2 * Math.PI) / n
    const periodMin = periodSec / 60

    // J2 Nodal Precession (dOmega/dt)
    const p = a * (1 - e * e)
    const dRaanDtRadS = -1.5 * ((j2 * Math.sqrt(mu) * Math.pow(rEarthKm, 2)) / Math.pow(p, 3.5)) * Math.cos(incRad)
    const dRaanDtDegDay = (dRaanDtRadS * 86400 * 180) / Math.PI

    // Sample discrete trajectory points
    const totalSteps = Math.min(1440, Math.floor((Number(duration_hours) * 3600) / Number(step_size_sec)))
    const trajectoryPoints = []
    const omegaEarthRadS = 7.2921159e-5

    for (let i = 0; i < Math.min(10, totalSteps); i++) {
      const tSec = i * Number(step_size_sec)
      const M = (n * tSec) % (2 * Math.PI)
      // Circularized lat/lon approximation for response payload
      const latRad = Math.asin(Math.sin(incRad) * Math.sin(M))
      const latDeg = (latRad * 180) / Math.PI
      const lonRad = (Math.atan2(Math.cos(incRad) * Math.sin(M), Math.cos(M)) - omegaEarthRadS * tSec) % (2 * Math.PI)
      let lonDeg = (lonRad * 180) / Math.PI
      if (lonDeg > 180) lonDeg -= 360
      if (lonDeg < -180) lonDeg += 360

      trajectoryPoints.push({
        t_sec: tSec,
        lat_deg: Math.round(latDeg * 100) / 100,
        lon_deg: Math.round(lonDeg * 100) / 100,
        alt_km: Math.round((a - rEarthKm) * 10) / 10
      })
    }

    return NextResponse.json({
      status: "SUCCESS",
      coordinate_frame: frame,
      epoch_utc,
      orbit_period_min: Math.round(periodMin * 100) / 100,
      mean_motion_rev_day: Math.round((86400 / periodSec) * 1000) / 1000,
      nodal_precession_deg_day: Math.round(dRaanDtDegDay * 100) / 100,
      ephemeris_points_count: totalSteps,
      sample_sub_satellite_points: trajectoryPoints
    })
  } catch (err: any) {
    return NextResponse.json({ status: "ERROR", message: err.message }, { status: 400 })
  }
}
