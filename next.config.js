/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions est maintenant activé par défaut, la clé peut être supprimée.
  },
  // Ajout pour autoriser les requêtes depuis l'environnement de développement cloud
  allowedDevOrigins: [
    "https://3000-firebase-studio-1761127865714.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
    "https://6000-firebase-studio-1761127865714.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https' ,
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;
