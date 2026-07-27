/** @type {import('next').NextConfig} */
const nextConfig = {
  // O Next ainda chama a API JavaScript removida no TypeScript 7.
  // O script `build` executa o typecheck nativo antes do build.
  typescript: {
    ignoreBuildErrors: true,
  },
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
