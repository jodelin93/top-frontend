import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Joda POS',
    short_name: 'Joda POS',
    description: 'Point of Sale System',
    start_url: '/pos',
    display: 'standalone',
    background_color: '#f6f7f5',
    theme_color: '#172235',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
