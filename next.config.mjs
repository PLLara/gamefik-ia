/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'manager.gamefik.com',
      },
    ],
  },
}

export default nextConfig
