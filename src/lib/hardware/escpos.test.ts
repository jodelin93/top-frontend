import { describe, expect, it } from 'vitest';
import type { Sale } from '@/lib/api/sales';
import { CMD, columns, encodeCp858, EscPosBuilder, rasterize, toBase64, wrap } from './escpos';
import { receiptToEscPos } from './receipt-escpos';

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
