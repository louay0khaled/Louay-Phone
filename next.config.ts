import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: 'https', hostname: 'gmpogiiqydoxoclxcvwh.supabase.co' },
    ],
  },
};

export default nextConfig;
