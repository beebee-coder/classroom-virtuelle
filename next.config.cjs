/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 300,
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' }
    ],
  },
  
  devIndicators: {
    allowedDevOrigins: [
      "https://3000-firebase-studio-1761127865714.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
      "https://6000-firebase-studio-1761127865714.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev"
    ],
  },

  // CONFIGURATION WEBPACK CRITIQUE
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignorer canvas côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        encoding: false,
      };
    }

    // Ignorer les warnings canvas
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /canvas/ },
      { file: /node_modules\/konva/ },
    ];

    return config;
  },
};

module.exports = nextConfig;
