import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude the legacy dashboard from Next.js compilation
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
