import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/dashboard', destination: '/home', permanent: true },
      { source: '/submit', destination: '/capture', permanent: true },
      { source: '/my-updates', destination: '/me', permanent: true },
      { source: '/views', destination: '/threads', permanent: true },
      { source: '/views/:path*', destination: '/threads', permanent: true },
      { source: '/chat', destination: '/ask', permanent: true },
    ]
  },
}

export default nextConfig
