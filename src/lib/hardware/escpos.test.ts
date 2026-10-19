import { describe, expect, it } from 'vitest';
import type { Sale } from '@/lib/api/sales';
import { CMD, EscPosBuilder, barcodeModuleWidth, columns, encodeCp858, rasterize, toBase64, wrap } from './escpos';
import { receiptToEscPos, repeatReceipt } from './receipt-escpos';

const has = (haystack: Uint8Array, needle: readonly number[]) => {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
};
const latin = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe('ESC/POS encoder', () => {
  it('starts with init and code page 858', () => {
    const bytes = new EscPosBuilder(80).bytes();
    expect([...bytes]).toEqual([0x1b, 0x40, 0x1b, 0x74, 19]);
  });

  it('encodes bold, cut and a CODE128 barcode (GS k)', () => {
    const bytes = new EscPosBuilder(80).bold().text('Hi').bold(false).barcode('S-0001').cut().bytes();
    expect(has(bytes, [0x1b, 0x45, 1])).toBe(true);
    expect(has(bytes, [0x1b, 0x45, 0])).toBe(true);
    // GS k 73 len {B S-0001
    expect(has(bytes, [0x1d, 0x6b, 73, 8, 0x7b, 0x42, 0x53, 0x2d, 0x30, 0x30, 0x30, 0x31])).toBe(true);
    expect(has(bytes, CMD.cut)).toBe(true);
    expect(has(bytes, [0x1d, 0x48, 2])).toBe(true); // number printed below
  });

  it('writes accented text in CP858', () => {
    expect(encodeCp858('é')).toEqual([0x82]);
    expect(encodeCp858('à ç ô É')).toEqual([0x85, 0x20, 0x87, 0x20, 0x93, 0x20, 0x90]);
    expect(encodeCp858('€')).toEqual([0xd5]);
    expect(encodeCp858('ñ Ñ')).toEqual([0xa4, 0x20, 0xa5]);
    // Not in CP858: accent dropped, or '?'
    expect(encodeCp858('ŝ')).toEqual([0x73]);
    expect(encodeCp858('漢')).toEqual([0x3f]);
    expect(encodeCp858('l’été')).toEqual([0x6c, 0x27, 0x82, 0x74, 0x82]);
  });

  it('wraps to 32 columns on 58 mm and 48 on 80 mm', () => {
    const long = 'Chocolat noir 70% cacao équitable en tablette de 100 grammes';
    for (const line of wrap(long, 32)) expect(line.length).toBeLessThanOrEqual(32);
    expect(wrap(long, 48).length).toBeLessThan(wrap(long, 32).length);
    expect(wrap('A'.repeat(70), 32)).toEqual(['A'.repeat(32), 'A'.repeat(32), 'A'.repeat(6)]);
    expect(new EscPosBuilder(58).width).toBe(32);
    expect(new EscPosBuilder(80).width).toBe(48);
  });

  it('lays out label/value rows to the full width', () => {
    expect(columns('TOTAL', '$9.99', 20)).toEqual(['TOTAL          $9.99']);
    const rows = columns('A very long product name that wraps', '$1,234.00', 20);
    expect(rows.every((r) => r.length <= 20)).toBe(true);
    expect(rows[rows.length - 1].endsWith('$1,234.00')).toBe(true);
  });

  it('rasterizes a logo to 1 bit per dot', () => {
    // 8×1: black, white, black, white...
    const rgba = new Uint8ClampedArray(8 * 4);
    for (let x = 0; x < 8; x++) rgba.set(x % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255], x * 4);
    expect([...rasterize(rgba, 8, 1).data]).toEqual([0b10101010]);
    expect(toBase64(Uint8Array.from([0x1b, 0x40]))).toBe('G0A=');
  });
});

const sale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 's1',
    saleNumber: 'S-000123',
    saleDate: '2026-09-24T10:15:00.000Z',
    subtotal: 30,
    discountAmount: 0,
    taxAmount: 3,
    total: 33,
    amountPaid: 40,
    changeAmount: 7,
    currencyCode: 'USD',
    status: 'completed',
    items: [
      { id: 'i1', variantId: 'v', sku: 'CAF', productName: 'Café crème très onctueux au lait entier', variantName: null, quantity: 2, unitPrice: 15, subtotal: 30, discountAmount: 0, taxAmount: 3, total: 33, lineNumber: 1 },
    ],
    payments: [],
    documentSnapshot: null,
    ...overrides,
  }) as Sale;

describe('receipt as ESC/POS', () => {
  it('prints the store, lines, totals, barcode and cut, never a drawer kick', () => {
    const bytes = receiptToEscPos(sale(), { storeName: 'Épicerie', receiptFormat: '80mm' } as never, { paper: 80 });
    const text = latin(bytes);
    expect(text).toContain('S-000123');
    expect(has(bytes, encodeCp858('Épicerie'))).toBe(true);
    expect(has(bytes, [0x1d, 0x6b, 73])).toBe(true);
    expect(has(bytes, CMD.cut)).toBe(true);
    expect(has(bytes, CMD.drawerPulse)).toBe(false);
    expect(has(bytes, [0x1b, 0x70])).toBe(false);
  });

  it('labels copies', () => {
    const original = latin(receiptToEscPos(sale(), undefined, { paper: 58 }));
    const copy = latin(receiptToEscPos(sale(), undefined, { paper: 58, copyNumber: 2 }));
    expect(original).not.toContain('COPY');
    expect(copy).toContain('*** COPY #2');
  });

  it('keeps every text line within the paper width', () => {
    const bytes = receiptToEscPos(sale(), undefined, { paper: 58 });
    // Lines between line feeds, without the control sequences
    const lines = latin(bytes)
      .replace(/\x1b[\x40]|\x1b[\x45\x61\x74\x64].|\x1d\x21.|\x1d[\x68\x77\x48].|\x1d\x6b\x49.[^\n]*|\x1d\x56\x42\x00/g, '')
      .split('\n');
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(32);
  });
});

describe('images and barcodes that printers accept', () => {
  // GS v 0 commands in the output: [bytes per row, rows]
  const strips = (bytes: Uint8Array) => {
    const found: [number, number][] = [];
    for (let i = 0; i + 8 <= bytes.length; i++) {
      if (bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30 && bytes[i + 3] === 0) {
        const perRow = bytes[i + 4] | (bytes[i + 5] << 8);
        const rows = bytes[i + 6] | (bytes[i + 7] << 8);
        found.push([perRow, rows]);
        i += 7 + perRow * rows;
      }
    }
    return found;
  };

  it('sends an image as strips of 24 rows, like receipt printer drivers do', () => {
    // 576 dots wide, 127 rows: 5 full strips and one of 7 rows, nothing lost
    const data = Uint8Array.from({ length: 72 * 127 }, (_, i) => (i % 251) + 1);
    const bytes = new EscPosBuilder(80).image({ widthDots: 576, heightDots: 127, data }).bytes();
    expect(strips(bytes)).toEqual([[72, 24], [72, 24], [72, 24], [72, 24], [72, 24], [72, 7]]);
    const start = bytes.length - (72 * 127 + 6 * 8);
    const image: number[] = [];
    for (let i = start; i < bytes.length; ) {
      const rows = bytes[i + 6] | (bytes[i + 7] << 8);
      image.push(...bytes.subarray(i + 8, i + 8 + 72 * rows));
      i += 8 + 72 * rows;
    }
    expect(Uint8Array.from(image)).toEqual(data);
  });

  it('never sends a strip taller than 24 rows', () => {
    const data = new Uint8Array(48 * 180).fill(0xff);
    const all = strips(new EscPosBuilder(58).image({ widthDots: 384, heightDots: 180, data }).bytes());
    expect(all).toHaveLength(8);
    expect(Math.max(...all.map(([, rows]) => rows))).toBe(24);
    expect(all.reduce((sum, [, rows]) => sum + rows, 0)).toBe(180);
  });

  it('uses the widest bars that fit the paper', () => {
    // Short number: 3-dot bars. A long one (TOPPRINTING-000006, 18 characters) needs
    // 2-dot bars on 80 mm paper: at 3 dots it is wider than the paper and prints nothing
    expect(barcodeModuleWidth('S-000123'.length, 80)).toBe(3);
    expect(barcodeModuleWidth('TOPPRINTING-000006'.length, 80)).toBe(2);
    expect(barcodeModuleWidth('S-000123'.length, 58)).toBe(2);
    expect(barcodeModuleWidth('TOPPRINTING-000006'.length, 58)).toBeNull();
  });

  it('prints a long sale number with 2-dot bars and leaves out one that cannot fit', () => {
    const widthCommand = (bytes: Uint8Array) => {
      const at = bytes.findIndex((b, i) => b === 0x1d && bytes[i + 1] === 0x77);
      return at < 0 ? null : bytes[at + 2];
    };
    expect(widthCommand(new EscPosBuilder(80).barcode('TOPPRINTING-000006').bytes())).toBe(2);
    expect(widthCommand(new EscPosBuilder(80).barcode('S-000123').bytes())).toBe(3);
    // 58 mm: no barcode command at all (the number is on the receipt as text)
    const narrow = new EscPosBuilder(58).barcode('TOPPRINTING-000006').bytes();
    expect(widthCommand(narrow)).toBeNull();
    expect([...narrow].some((b, i) => b === 0x1d && narrow[i + 1] === 0x6b)).toBe(false);
  });
});

describe('copies per sale', () => {
  const cuts = (bytes: Uint8Array) => {
    let n = 0;
    for (let i = 0; i + 3 < bytes.length; i++) if (bytes[i] === CMD.cut[0] && bytes[i + 1] === CMD.cut[1] && bytes[i + 2] === CMD.cut[2]) n++;
    return n;
  };
  const one = new EscPosBuilder(80).text('Receipt').cut().bytes();

  it('cuts after each copy: printed, cut, then the next one', () => {
    const two = repeatReceipt(one, 2);
    expect(two.length).toBe(one.length * 2);
    expect(cuts(two)).toBe(2);
    // The second copy starts right after the first cut
    expect([...two.subarray(one.length, one.length + 4)]).toEqual([...one.subarray(0, 4)]);
  });

  it('prints one copy for 1, and never more than 3', () => {
    expect(repeatReceipt(one, 1)).toBe(one);
    expect(cuts(repeatReceipt(one, 9))).toBe(3);
  });
});
