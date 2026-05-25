import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ignored: /functions/,
    };
    return config;
  },
};

export default nextConfig;