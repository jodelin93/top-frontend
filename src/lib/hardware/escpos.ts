/**
 * ESC/POS encoder (spec §15): turns text lines into the bytes a thermal receipt
 * printer understands, for the local print bridge (print-bridge/). No library.
 *
 * Text is encoded in code page 858 (CP850 + €), selected with ESC t 19, which covers
 * French, Spanish and Haitian Creole accents on most Epson-compatible printers.
 * Characters outside it lose their accent (ŝ → s) or become '?'. UTF-8 mode, which
 * only some printers have, is not used.
 */

export type PaperWidth = 58 | 80;

// Characters per line in font A (12-dot wide): 384 dots on 58 mm, 576 on 80 mm
export const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

const ESC = 0x1b;
const GS = 0x1d;

export const CMD = {
  init: [ESC, 0x40],
  codePage858: [ESC, 0x74, 19],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  alignRight: [ESC, 0x61, 2],
  sizeNormal: [GS, 0x21, 0x00],
  sizeDouble: [GS, 0x21, 0x11],
  sizeTall: [GS, 0x21, 0x01],
  // Feed to the cutter and cut (partial cut: the roll stays attached at one point)
  cut: [GS, 0x56, 0x42, 0x00],
  // Drawer kick pulse, pin 2 (only used by the bridge's /drawer, never in a receipt)
  drawerPulse: [ESC, 0x70, 0x00, 0x19, 0xfa],
} as const;

// CP858 bytes 0x80–0xFF (CP850 with € at 0xD5)
const CP858_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
const CP858 = new Map<string, number>([...CP858_HIGH].map((char, i) => [char, 0x80 + i]));

// Common typographic characters with a plain equivalent
const SUBSTITUTES: Record<string, string> = {
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  '•': '·',
  ' ': ' ',
};

/** Text → CP858 bytes */
export function encodeCp858(text: string): number[] {
  const bytes: number[] = [];
  for (const raw of text) {
    const char = SUBSTITUTES[raw] ?? raw;
    for (const c of char) {
      const code = c.charCodeAt(0);
      if (code === 0x0a || (code >= 0x20 && code < 0x7f)) bytes.push(code);
      else if (CP858.has(c)) bytes.push(CP858.get(c)!);
      else {
        // Drop the accent when the base letter exists (ŝ → s), else '?'
        const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
        const b = base.charCodeAt(0);
        bytes.push(base.length === 1 && b >= 0x20 && b < 0x7f ? b : 0x3f);
      }
    }
  }
  return bytes;
}

/** Word-wrap to `width` columns (long words are cut) */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      while (rest.length > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(rest.slice(0, width));
        rest = rest.slice(width);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= width) line += ` ${rest}`;
      else {
        lines.push(line);
        line = rest;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** "Label ........ value" on one line; the label wraps when both don't fit */
export function columns(left: string, right: string, width: number): string[] {
  if (left.length + 1 + right.length <= width) {
    return [left + ' '.repeat(width - left.length - right.length) + right];
  }
  const lines = wrap(left, width);
  const last = lines[lines.length - 1];
  if (last.length + 1 + right.length <= width) {
    lines[lines.length - 1] = last + ' '.repeat(width - last.length - right.length) + right;
  } else {
    lines.push(' '.repeat(Math.max(0, width - right.length)) + right.slice(0, width));
  }
  return lines;
}

/** Monochrome raster image (1 bit per dot, rows padded to whole bytes) */
export interface RasterImage {
  widthDots: number;
  heightDots: number;
  data: Uint8Array;
}

/**
 * Builds an ESC/POS job. Every text call wraps to the paper width.
 */
export class EscPosBuilder {
  private out: number[] = [];
  readonly width: number;

  constructor(readonly paper: PaperWidth = 80) {
    this.width = COLUMNS[paper];
    this.raw(CMD.init).raw(CMD.codePage858);
  }

  raw(bytes: readonly number[] | Uint8Array): this {
    for (const b of bytes) this.out.push(b);
    return this;
  }

  align(where: 'left' | 'center' | 'right'): this {
    return this.raw(where === 'center' ? CMD.alignCenter : where === 'right' ? CMD.alignRight : CMD.alignLeft);
  }

  bold(on = true): this {
    return this.raw(on ? CMD.boldOn : CMD.boldOff);
  }

  size(size: 'normal' | 'double' | 'tall'): this {
    return this.raw(size === 'double' ? CMD.sizeDouble : size === 'tall' ? CMD.sizeTall : CMD.sizeNormal);
  }

  /** Text wrapped to the line width (half as many columns in double width) */
  text(value: string, columnsOverride?: number): this {
    for (const line of wrap(value, columnsOverride ?? this.width)) this.raw(encodeCp858(line)).raw([0x0a]);
    return this;
  }

  row(left: string, right: string): this {
    for (const line of columns(left, right, this.width)) this.raw(encodeCp858(line)).raw([0x0a]);
    return this;
  }

  separator(char = '-'): this {
    return this.raw(encodeCp858(char.repeat(this.width))).raw([0x0a]);
  }

  feed(lines = 1): this {
    return this.raw([ESC, 0x64, Math.max(0, Math.min(lines, 255))]);
  }

  /** CODE128 (set B) barcode, number printed under it: GS h, GS w, GS H, GS k 73 */
  barcode(value: string, heightDots = 60): this {
    const data = [0x7b, 0x42, ...encodeCp858(value).filter((b) => b >= 0x20 && b < 0x7f)];
    if (data.length <= 2 || data.length > 255) return this;
    return this.raw([GS, 0x68, Math.min(255, heightDots)])
      .raw([GS, 0x77, this.paper === 58 ? 2 : 3])
      .raw([GS, 0x48, 2])
      .raw([GS, 0x6b, 73, data.length, ...data])
      .raw([0x0a]);
  }

  /** Raster bit image (GS v 0), e.g. the store logo */
  image(image: RasterImage): this {
    const bytesPerRow = Math.ceil(image.widthDots / 8);
    return this.raw([
      GS,
      0x76,
      0x30,
      0,
      bytesPerRow & 0xff,
      (bytesPerRow >> 8) & 0xff,
      image.heightDots & 0xff,
      (image.heightDots >> 8) & 0xff,
    ]).raw(image.data);
  }

  cut(): this {
    return this.feed(3).raw(CMD.cut);
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

/**
 * RGBA pixels → 1-bit raster (dark pixels print), scaled to fit `maxWidthDots`.
 * Used for the logo; the caller draws the image on a canvas first.
 */
export function rasterize(rgba: Uint8ClampedArray, width: number, height: number, threshold = 128): RasterImage {
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = rgba[i + 3] / 255;
      const luminance = (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * alpha + 255 * (1 - alpha);
      if (luminance < threshold) data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { widthDots: width, heightDots: height, data };
}

/** Bytes → base64 (what the bridge's /print expects) */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
