/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuration CORS pour Cloud Workstations
  allowedDevOrigins: [
    "3000-firebase-studio-1767977208539.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev",
    "localhost:3000"
  ],
  
  images: {
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: 'res.cloudinary.com',
      },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  // Configuration Webpack optimisée
  webpack: (config, { isServer, dev }) => {
    // Configuration WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Ignorer spécifiquement l'erreur WASM de Prisma (c'est juste un warning)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { 
        module: /node_modules\/\.prisma\/client/,
        message: /async\/await/,
      },
    ];

    // Fallbacks pour éviter les erreurs côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        crypto: false,
      };
    }

    return config;
  },

  // Désactiver temporairement pour le développement
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;