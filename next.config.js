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
};

module.exports = nextConfig;
