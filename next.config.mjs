/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Cela peut être nécessaire pour certains environnements de développement
    // pour éviter les avertissements de cross-origin, mais nous allons
    // le laisser commenté pour l'instant car le middleware gère le cas principal.
    // allowedDevOrigins: [],
  },
};

export default nextConfig;
