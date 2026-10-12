import { describe, expect, it } from 'vitest';
import { ditherToRaster, logoPlacement, logoSource, PAPER_DOTS } from './receipt-logo';

const pixels = (width: number, height: number, color: (x: number, y: number) => [number, number, number, number]) => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set(color(x, y), (y * width + x) * 4);
  return rgba;
};
const darkDots = (data: Uint8Array) => data.reduce((n, byte) => n + byte.toString(2).split('1').length - 1, 0);

describe('receipt logo', () => {
  it('fits a wide logo in 60% of the paper width, centred', () => {
    const place = logoPlacement(1200, 300, 80);
    expect(place).toEqual({ paperDots: 576, width: 346, height: 86, x: 115 });
    expect(place.x * 2 + place.width).toBeLessThanOrEqual(PAPER_DOTS[80]);
  });

  it('limits a tall logo by its height and uses the 58 mm width', () => {
    const place = logoPlacement(400, 800, 58);
    expect(place.height).toBe(180);
    expect(place.width).toBe(90);
    expect(place.paperDots).toBe(384);
  });

  it('enlarges a small logo at most twice', () => {
    expect(logoPlacement(60, 40, 80)).toMatchObject({ width: 120, height: 80 });
  });

  it('prints dark pixels, leaves white and transparent ones blank', () => {
    const black = ditherToRaster(pixels(16, 2, () => [0, 0, 0, 255]), 16, 2);
    expect(black).toMatchObject({ widthDots: 16, heightDots: 2 });
    expect([...black.data]).toEqual([255, 255, 255, 255]);
    expect(darkDots(ditherToRaster(pixels(16, 2, () => [255, 255, 255, 255]), 16, 2).data)).toBe(0);
    expect(darkDots(ditherToRaster(pixels(16, 2, () => [0, 0, 0, 0]), 16, 2).data)).toBe(0);
  });

  it('keeps a mid-tone logo visible by dithering (about half the dots)', () => {
    const grey = ditherToRaster(pixels(64, 64, () => [128, 128, 128, 255]), 64, 64);
    const share = darkDots(grey.data) / (64 * 64);
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it('pads rows to whole bytes', () => {
    const raster = ditherToRaster(pixels(10, 3, () => [0, 0, 0, 255]), 10, 3);
    expect(raster.data.length).toBe(2 * 3);
    expect([...raster.data.slice(0, 2)]).toEqual([0b11111111, 0b11000000]);
  });

  it("loads the app's stored files through the address the till is opened on", () => {
    const stored = 'https://pos.example.com/api/v1/storage/files/logos/t1/logo.jpg';
    // Same site: unchanged
    expect(logoSource(stored, 'https://pos.example.com/pos', '/api/v1')).toBe(stored);
    // Till opened on a LAN address, or a copy of the store on another site
    expect(logoSource(stored, 'http://192.168.0.105:3001/pos', '/api/v1')).toBe('/api/v1/storage/files/logos/t1/logo.jpg');
    // A logo on a CDN is not ours to redirect
    expect(logoSource('https://cdn.example.com/logo.png', 'https://pos.example.com/pos', '/api/v1')).toBe('https://cdn.example.com/logo.png');
  });
});
