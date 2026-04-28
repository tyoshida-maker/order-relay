/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 
        '@react-pdf/renderer',
        'canvas'
      ]
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
}
module.exports = nextConfig
