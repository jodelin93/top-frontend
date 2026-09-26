import { describe, expect, it } from 'vitest';
import { checkBarcode, gs1CheckDigit, MAX_TAG_LENGTH, MAX_TAGS, normalizeBarcode, normalizeTags } from './products';

describe('normalizeBarcode', () => {
  it('trims and removes inner whitespace', () => {
    expect(normalizeBarcode('  501 2345\t678900 ')).toBe('5012345678900');
  });

  it('keeps leading zeros of numeric codes', () => {
    expect(normalizeBarcode('036000291452')).toBe('036000291452');
    expect(normalizeBarcode('0001')).toBe('0001');
  });

  it('upper-cases codes with letters', () => {
    expect(normalizeBarcode('abc-12')).toBe('ABC-12');
  });

  it('turns empty values into null', () => {
    expect(normalizeBarcode('   ')).toBeNull();
    expect(normalizeBarcode('')).toBeNull();
    expect(normalizeBarcode(null)).toBeNull();
    expect(normalizeBarcode(undefined)).toBeNull();
  });
});

describe('checkBarcode', () => {
  it('accepts valid GS1 check digits', () => {
    expect(checkBarcode('5012345678900')).toEqual({
      barcode: '5012345678900',
      format: 'ean13',
      checkDigitValid: true,
      warning: null,
    });
    expect(checkBarcode('036000291452')).toMatchObject({ format: 'upca', checkDigitValid: true });
    expect(checkBarcode('96385074')).toMatchObject({ format: 'ean8', checkDigitValid: true });
    expect(checkBarcode('15012345678907')).toMatchObject({ format: 'gtin14', checkDigitValid: true });
  });

  it('warns (without rejecting) on a wrong check digit', () => {
    const result = checkBarcode('5012345678901');
    expect(result.barcode).toBe('5012345678901');
    expect(result.checkDigitValid).toBe(false);
    expect(result.warning).toBe('The check digit of this EAN13 barcode is wrong: check it for a typo');
  });

  it('normalizes before checking', () => {
    expect(checkBarcode(' 5012 3456 78900 ')).toMatchObject({ barcode: '5012345678900', checkDigitValid: true });
  });

  it('has no check digit for other formats', () => {
    expect(checkBarcode('12345')).toEqual({ barcode: '12345', format: 'other', checkDigitValid: null, warning: null });
    expect(checkBarcode('abc123')).toEqual({ barcode: 'ABC123', format: 'other', checkDigitValid: null, warning: null });
    expect(checkBarcode('')).toEqual({ barcode: null, format: 'other', checkDigitValid: null, warning: null });
  });

  it('computes the GS1 mod-10 digit', () => {
    expect(gs1CheckDigit('501234567890')).toBe(0);
    expect(gs1CheckDigit('03600029145')).toBe(2);
    expect(gs1CheckDigit('9638507')).toBe(4);
  });
});

describe('normalizeTags', () => {
  it('trims, collapses spaces, lower-cases and removes duplicates', () => {
    expect(normalizeTags(['  Summer  Sale ', 'summer sale', 'NEW', '', '   '])).toEqual(['summer sale', 'new']);
  });

  it('splits a comma-separated string', () => {
    expect(normalizeTags('Rice, beans ,, RICE')).toEqual(['rice', 'beans']);
  });

  it('caps the number and length of tags', () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `tag ${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS);
    expect(normalizeTags(['x'.repeat(80)])[0]).toHaveLength(MAX_TAG_LENGTH);
  });

  it('handles empty input', () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags('')).toEqual([]);
  });
});
