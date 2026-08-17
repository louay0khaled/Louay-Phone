import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    sizes: [256, 384, 640, 750, 828, 1080, 1200, 1536, 1920],
    qualities: [50, 65, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gmpogiiqydoxoclxcvwh.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
