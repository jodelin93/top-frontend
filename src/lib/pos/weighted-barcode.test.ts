import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ean13CheckDigit, parseWeightedBarcode, scannedQuantity, type WeightedBarcodeSettings } from './weighted-barcode';

const FRONTEND_COPY = path.resolve(__dirname, 'weighted-barcode.ts');
const BACKEND_SOURCE = path.resolve(__dirname, '../../../../top-backend/src/products/weighted-barcode.ts');

// Only the leading /** ... */ header may differ: re-copy the backend body verbatim
const withoutHeader = (file: string): string => readFileSync(file, 'utf8').replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');

describe('weighted-barcode copy', () => {
  it('is identical to the backend parser apart from the header comment', () => {
    expect(withoutHeader(FRONTEND_COPY)).toBe(withoutHeader(BACKEND_SOURCE));
  });
});

const WEIGHT: WeightedBarcodeSettings = {
  prefixes: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
  layout: 'weight',
  itemCodeLength: 5,
  valueDecimals: 3,
};
const ean = (body: string) => `${body}${ean13CheckDigit(body)}`;

describe('parseWeightedBarcode (offline scans)', () => {
  it('reads the PLU and the weight', () => {
    expect(parseWeightedBarcode(ean('210123401250'), WEIGHT)).toMatchObject({ ok: true, plu: '1234', value: 1.25 });
  });

  it('reads an embedded price and turns it into a quantity', () => {
    const scan = parseWeightedBarcode(ean('200123400499'), { ...WEIGHT, layout: 'price', valueDecimals: 2 });
    expect(scan).toMatchObject({ ok: true, value: 4.99 });
    if (!scan?.ok) throw new Error('expected a scan');
    expect(scannedQuantity(scan, 3.99, 3)).toEqual({ quantity: 1.251, amount: 4.99 });
  });

  it('flags a wrong check digit and ignores ordinary codes', () => {
    const good = ean('210123401250');
    const bad = `${good.slice(0, 12)}${(Number(good[12]) + 1) % 10}`;
    expect(parseWeightedBarcode(bad, WEIGHT)).toEqual({ ok: false, error: 'check_digit' });
    expect(parseWeightedBarcode('5012345678900', WEIGHT)).toBeNull();
    expect(parseWeightedBarcode(good, { ...WEIGHT, prefixes: [] })).toBeNull();
  });
});
