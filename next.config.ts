import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ignored: /functions/,
    };
    return config;
  },
};

export default nextConfig;