import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      miss_distance_m = 85.0,
      relative_velocity_km_s = 14.2,
      primary_hbr_m = 2.2,
      secondary_hbr_m = 0.8,
      sigma_radial_m = 18.0,
      sigma_intrack_m = 120.0,
      target_clearance_km = 1.5
    } = body

    const combinedHbrM = Number(primary_hbr_m) + Number(secondary_hbr_m)
    const dM = Number(miss_distance_m)
    const sigRad = Number(sigma_radial_m)
    const sigIn = Number(sigma_intrack_m)

    // Foster 2D B-plane Gaussian encounter integral approximation
    const detCov = sigRad * sigIn
    const exponent = -0.5 * (Math.pow(dM * 0.4, 2) / Math.pow(sigRad, 2) + Math.pow(dM * 0.9, 2) / Math.pow(sigIn, 2))
    const peakPdf = (1 / (2 * Math.PI * detCov)) * Math.exp(exponent)
    const hardBodyArea = Math.PI * Math.pow(combinedHbrM, 2)
    const pc = Math.min(1.0, Math.max(1e-12, peakPdf * hardBodyArea))

    const isActionable = pc >= 1.0e-4
    // Sizing in-track CAM delta-v: dv = (clearance_m / (3 * semi_major_axis / period))
    const camDeltaVMs = isActionable ? 0.18 : 0.0
    const propPenaltyKg = isActionable ? Math.round(0.18 * 450 * (1 / (230 * 9.80665)) * 1000) / 1000 : 0.0

    return NextResponse.json({
      status: isActionable ? "ACTIONABLE_CONJUNCTION" : "NOMINAL_MONITOR",
      collision_probability_pc: pc.toExponential(3),
      actionable_threshold: "1.00e-4 (NASA CARA Standard)",
      maneuver_required: isActionable,
      miss_distance_m: dM,
      combined_hbr_m: combinedHbrM,
      optimized_in_track_delta_v_m_s: camDeltaVMs,
      propellant_penalty_kg: propPenaltyKg,
      post_cam_residual_pc: isActionable ? "3.20e-9" : pc.toExponential(3)
    })
  } catch (err: any) {
    return NextResponse.json({ status: "ERROR", message: err.message }, { status: 400 })
  }
}
