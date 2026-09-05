import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@dating/types'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
