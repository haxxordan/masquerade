import type { NextConfig } from 'next';
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@dating/types', '@dating/api-client', '@dating/store'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' }
    ],
  },
  turbopack: {
    root: path.join(__dirname, '../..'), // points up to dating-monorepo/
  },
};

export default nextConfig;
