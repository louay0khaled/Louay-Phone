import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Louay Phone',
    short_name: 'Louay Phone',
    description: 'متجر Louay Phone للهواتف الذكية',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111113',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    categories: ['shopping', 'electronics'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'الهواتف', short_name: 'الهواتف', url: '/products', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
      { name: 'الصفحة الرئيسية', short_name: 'الرئيسية', url: '/', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] },
    ],
  };
}
