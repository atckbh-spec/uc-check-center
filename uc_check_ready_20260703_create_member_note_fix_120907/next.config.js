/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb"
    }
  }
};

module.exports = nextConfig;
