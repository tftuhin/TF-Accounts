/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Keep essential optimizations only
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
