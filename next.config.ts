import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude the legacy dashboard from Next.js compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      { source: '/property/:id', destination: '/properties/:id', permanent: true },
      { source: '/tenant/:id', destination: '/tenants/:id', permanent: true },
      { source: '/settings/team', destination: '/settings/users', permanent: true },
    ]
  },
}

export default nextConfig
