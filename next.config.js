// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Correction: 'allowedDevOrigins' est une option de premier niveau, pas sous 'experimental'.
  allowedDevOrigins: [
    "https://6000-firebase-studio-1761127865714.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
  ],

  // Optimisations de performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Timeouts étendus pour Firebase Workstations et les actions serveur
  staticPageGenerationTimeout: 300,

  // Configuration des images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' }
    ],
  },
  
  // Configuration Webpack pour la stabilité HMR et WebRTC
  webpack: (config, { isServer }) => {
    // Stratégie de polling pour le rechargement à chaud (HMR)
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000, // Vérifier les changements toutes les 1000ms
      aggregateTimeout: 300, // Regrouper les changements sur 300ms
    };

    // Optimisations pour WebRTC et autres dépendances côté client
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
        };
    }
    
    return config;
  },
};

module.exports = nextConfig;
