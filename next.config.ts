import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  async rewrites() {
    return [
      { source: '/', destination: '/home.html' },
    ];
  },
};

export default nextConfig;
