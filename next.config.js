// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Augmenter les timeouts
  experimental: {
    serverComponentsExternalPackages: ['@tldraw/tldraw'],
    // serverActions: {
    //   bodySizeLimit: '8mb',
    // },
  },
  
  // Optimisations de performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Timeouts étendus pour Firebase Workstations et les actions serveur
  staticPageGenerationTimeout: 300,

  // Configuration existante des images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' }
    ],
  },
  
  // Optimisations WebRTC
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
