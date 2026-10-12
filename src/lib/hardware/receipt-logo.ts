/**
 * The store logo on receipts printed straight to the thermal printer (JodaPrint agent,
 * print bridge). The browser receipt shows the logo as an <img>; a thermal printer
 * needs it as a 1-bit raster: the image is loaded once, scaled to fit the paper, turned
 * to black and white dots (dithered, so coloured and grey logos keep their shape) and
 * centred on the paper width.
 */
import type { PaperWidth, RasterImage } from './escpos';

// Printable dots per line (203 dpi): 384 on 58 mm paper, 576 on 80 mm
export const PAPER_DOTS: Record<PaperWidth, number> = { 58: 384, 80: 576 };
// The logo takes at most this share of the paper width and this many dots in height
const MAX_WIDTH_SHARE = 0.6;
const MAX_HEIGHT_DOTS = 180;
// Small images are enlarged at most this much (more looks blocky)
const MAX_ENLARGE = 2;
// How long a print waits for the logo before going out without it
const LOAD_TIMEOUT_MS = 2500;

export type LogoImage = ImageBitmap | HTMLImageElement;

/** Size and position of the logo on the paper, in dots */
export function logoPlacement(width: number, height: number, paper: PaperWidth) {
  const paperDots = PAPER_DOTS[paper];
  const scale = Math.min(MAX_ENLARGE, (paperDots * MAX_WIDTH_SHARE) / width, MAX_HEIGHT_DOTS / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  return { paperDots, width: w, height: h, x: Math.floor((paperDots - w) / 2) };
}

/**
 * RGBA pixels → 1-bit raster with Floyd–Steinberg dithering (dark dots print).
 * Transparent pixels are white paper.
 */
export function ditherToRaster(rgba: Uint8ClampedArray, width: number, height: number): RasterImage {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const alpha = rgba[i * 4 + 3] / 255;
    gray[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) * alpha + 255 * (1 - alpha);
  }
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const dark = gray[i] < 128;
      if (dark) data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      const error = gray[i] - (dark ? 0 : 255);
      if (x + 1 < width) gray[i + 1] += (error * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) gray[i + width - 1] += (error * 3) / 16;
        gray[i + width] += (error * 5) / 16;
        if (x + 1 < width) gray[i + width + 1] += error / 16;
      }
    }
  }
  return { widthDots: width, heightDots: height, data };
}

// ---------------------------------------------------------------------------
// Loading (once per logo URL)

const images = new Map<string, Promise<LogoImage | null>>();
const rasters = new Map<string, RasterImage | null>();

/**
 * A file stored by the app is loaded through this site's own address: the saved URL
 * names the public address of the store, which is not always the one the till is
 * opened on (a LAN address, a copy of the store on another site).
 */
export function logoSource(url: string, pageUrl: string, apiBase = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'): string {
  try {
    const target = new URL(url, pageUrl);
    const sameSiteApi = apiBase.startsWith('/') && target.pathname.startsWith(`${apiBase.replace(/\/+$/, '')}/storage/`);
    if (sameSiteApi && target.origin !== new URL(pageUrl).origin) return target.pathname + target.search;
  } catch {
    /* not a URL: tried as it is */
  }
  return url;
}

// Loaded as an image, like the receipt on screen (so the same addresses are allowed);
// reading its pixels needs the same origin or a server that allows it (CORS)
async function fetchImage(url: string): Promise<LogoImage | null> {
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.src = logoSource(url, window.location.href);
    await image.decode();
    return image.naturalWidth > 0 ? image : null;
  } catch {
    // Unreachable, offline, not an image: the receipt prints without it
    return null;
  }
}

/**
 * The logo, decoded (cached; null when it can't be loaded). Never rejects, and gives
 * up after a moment so a slow network does not hold a receipt back.
 */
export function loadReceiptLogo(url: string | null | undefined): Promise<LogoImage | null> {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  let pending = images.get(url);
  if (!pending) {
    pending = fetchImage(url);
    images.set(url, pending);
    // A failed load is tried again on the next receipt
    void pending.then((image) => {
      if (!image) images.delete(url);
    });
  }
  return Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS))]);
}

/** The loaded logo as printer dots for this paper, centred on the paper width */
export function logoRaster(url: string, image: LogoImage, paper: PaperWidth): RasterImage | null {
  const key = `${paper}:${url}`;
  if (rasters.has(key)) return rasters.get(key) ?? null;
  let raster: RasterImage | null = null;
  try {
    const width = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const height = 'naturalHeight' in image ? image.naturalHeight : image.height;
    const place = logoPlacement(width, height, paper);
    const canvas = document.createElement('canvas');
    canvas.width = place.paperDots;
    canvas.height = place.height;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, place.x, 0, place.width, place.height);
      raster = ditherToRaster(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    }
  } catch {
    raster = null;
  }
  rasters.set(key, raster);
  return raster;
}
