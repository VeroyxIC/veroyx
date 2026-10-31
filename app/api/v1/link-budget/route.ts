import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      carrier_frequency_ghz = 8.45,
      orbit_altitude_km = 550,
      min_elevation_deg = 5.0,
      tx_power_watts = 10.0,
      tx_antenna_diameter_m = 0.3,
      rx_antenna_diameter_m = 11.3,
      bitrate_mbps = 350.0,
      target_ber = 1e-6
    } = body

    const fHz = Number(carrier_frequency_ghz) * 1e9
    const altKm = Number(orbit_altitude_km)
    const elDeg = Number(min_elevation_deg)
    const elRad = (elDeg * Math.PI) / 180
    const rEarthKm = 6378.137

    // Maximum slant range at mask elevation
    const slantRangeKm = rEarthKm * (Math.sqrt(Math.pow((altKm + rEarthKm) / rEarthKm, 2) - Math.pow(Math.cos(elRad), 2)) - Math.sin(elRad))
    const slantRangeM = slantRangeKm * 1000

    // Free space path loss (FSPL) = 20*log10(4*pi*d/lambda)
    const c = 299792458
    const lambda = c / fHz
    const fsplDb = 20 * Math.log10((4 * Math.PI * slantRangeM) / lambda)

    // Antenna Gains (assuming 55% aperture efficiency)
    const txGainDbi = 10 * Math.log10(0.55 * Math.pow((Math.PI * Number(tx_antenna_diameter_m)) / lambda, 2))
    const rxGainDbi = 10 * Math.log10(0.55 * Math.pow((Math.PI * Number(rx_antenna_diameter_m)) / lambda, 2))

    // Transmit Power in dBW
    const txPowerDbw = 10 * Math.log10(Number(tx_power_watts))

    // EIRP
    const eirpDbw = txPowerDbw + txGainDbi

    // Thermal noise density (T_sys assumed 135 K for X-band cryogenic/cooled ground station)
    const kDbw = -228.6 // Boltzmann constant in dBW/K/Hz
    const tSysK = 135
    const tSysDbk = 10 * Math.log10(tSysK)

    // Received Eb/N0
    const bitRateDbHz = 10 * Math.log10(Number(bitrate_mbps) * 1e6)
    const atmosphericLossDb = 0.8
    const pointingLossDb = 0.6

    const prDbw = eirpDbw - fsplDb - atmosphericLossDb - pointingLossDb + rxGainDbi
    const ebN0ReceivedDb = prDbw - kDbw - tSysDbk - bitRateDbHz

    // Required Eb/N0 for QPSK with DVB-S2 LDPC rate 3/4 at 1e-6 BER ~ 5.5 dB + 3 dB standard margin = 8.5 dB
    const ebN0RequiredDb = 10.5
    const linkMarginDb = Math.round((ebN0ReceivedDb - ebN0RequiredDb) * 10) / 10

    return NextResponse.json({
      status: linkMarginDb >= 3.0 ? "COMPLIANT" : "MARGIN_DEFICIT",
      carrier_frequency_ghz: Number(carrier_frequency_ghz),
      max_slant_range_km: Math.round(slantRangeKm),
      free_space_path_loss_db: Math.round(fsplDb * 10) / 10,
      tx_gain_dbi: Math.round(txGainDbi * 10) / 10,
      rx_gain_dbi: Math.round(rxGainDbi * 10) / 10,
      eb_n0_received_db: Math.round(ebN0ReceivedDb * 10) / 10,
      eb_n0_required_db: ebN0RequiredDb,
      link_margin_db: linkMarginDb,
      margin_status: linkMarginDb >= 3.0 ? "PASS (>= 3.0 dB Flight Margin)" : "DEFICIT (Insufficient Power/Gain)"
    })
  } catch (err: any) {
    return NextResponse.json({ status: "ERROR", message: err.message }, { status: 400 })
  }
}
