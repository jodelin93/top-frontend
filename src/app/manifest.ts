import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Modern POS',
    short_name: 'POS',
    description: 'Point of Sale System',
    start_url: '/pos',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#2563eb',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
