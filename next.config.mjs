/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configuration pour autoriser les requêtes cross-origin en développement
    // depuis l'environnement Cloud Workstation.
    experimental: {
        allowedDevOrigins: [
            "https://*.cloudworkstations.dev",
        ]
    }
};

export default nextConfig;
