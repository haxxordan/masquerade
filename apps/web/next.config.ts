import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dating/types', '@dating/api-client', '@dating/store'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' }
    ],
  },
};

export default nextConfig;
