import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Louay Phone',
    short_name: 'Louay Phone',
    description: 'متجر Louay Phone للهواتف الذكية',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111113',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    categories: ['shopping', 'electronics'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'الهواتف', short_name: 'الهواتف', url: '/products', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'الصفحة الرئيسية', short_name: 'الرئيسية', url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
