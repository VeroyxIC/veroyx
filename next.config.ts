import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/rf', destination: '/link', permanent: true },
      { source: '/payload', destination: '/optical-payload', permanent: true },
      { source: '/optical', destination: '/optical-payload', permanent: true },
      { source: '/radiation', destination: '/rad', permanent: true },
      { source: '/passes', destination: '/pass-schedule', permanent: true },
      { source: '/ground-stations', destination: '/ground-station', permanent: true },
      { source: '/propulsion', destination: '/prop-tank', permanent: true },
      { source: '/delta-v', destination: '/trajectory', permanent: true },
      { source: '/deorbit', destination: '/decay', permanent: true },
      { source: '/reentry', destination: '/reentry-footprint', permanent: true },
    ]
  }
};

export default nextConfig;
