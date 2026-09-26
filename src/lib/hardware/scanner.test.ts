import { describe, expect, it } from 'vitest';
import { analyzeKeystrokes, DEFAULT_SCANNER_CONFIG, normalizeScannerConfig, ScanDetector, type ScannerConfig } from './scanner';

const config: ScannerConfig = { terminator: 'enter', minLength: 4, maxInterKeyDelayMs: 40, duplicateWindowMs: 1000 };
const typeKeys = (d: ScanDetector, start: number, count: number, gap: number) => {
  for (let i = 0; i < count; i++) d.key(start + i * gap);
};

describe('scanner timing', () => {
  it('tells a scanner burst from typing', () => {
    expect(analyzeKeystrokes([0, 8, 16, 25, 33], config)).toMatchObject({ isScan: true, maxGap: 9, avgGap: 8 });
    expect(analyzeKeystrokes([0, 120, 260, 390, 500], config).isScan).toBe(false);
    // Too short to be a code
    expect(analyzeKeystrokes([0, 5, 10], config).isScan).toBe(false);
  });

  it('counts only the last fast run (typing, then a scan)', () => {
    const d = new ScanDetector(config);
    typeKeys(d, 0, 3, 200); // a person types "abc"
    typeKeys(d, 1000, 8, 10); // then scans 8 characters
    expect(d.burst.isScan).toBe(true);
    expect(d.finish('12345678', 1100)).toEqual({ isScan: true, accept: true });
  });

  it('accepts what a person typed', () => {
    const d = new ScanDetector(config);
    typeKeys(d, 0, 6, 150);
    expect(d.finish('coffee', 900)).toEqual({ isScan: false, accept: true });
  });

  it('drops the same code scanned again within the duplicate window', () => {
    const d = new ScanDetector(config);
    typeKeys(d, 0, 8, 10);
    expect(d.finish('12345678', 100).accept).toBe(true);
    typeKeys(d, 300, 8, 10);
    expect(d.finish('12345678', 400)).toEqual({ isScan: true, accept: false, reason: 'duplicate' });
    // Later: a deliberate second scan
    typeKeys(d, 3000, 8, 10);
    expect(d.finish('12345678', 3100).accept).toBe(true);
    // Another code right away is fine
    typeKeys(d, 3200, 8, 10);
    expect(d.finish('87654321', 3300).accept).toBe(true);
  });

  it('knows its terminator', () => {
    expect(new ScanDetector(config).isTerminator('Enter')).toBe(true);
    expect(new ScanDetector({ ...config, terminator: 'tab' }).isTerminator('Tab')).toBe(true);
    expect(new ScanDetector({ ...config, terminator: 'none' }).isTerminator('Enter')).toBe(false);
  });

  it('keeps settings within sane bounds', () => {
    expect(normalizeScannerConfig({ minLength: 0, maxInterKeyDelayMs: 99999, duplicateWindowMs: -5, terminator: 'x' as never })).toEqual({
      terminator: 'enter',
      minLength: 1,
      maxInterKeyDelayMs: 500,
      duplicateWindowMs: 0,
    });
    expect(normalizeScannerConfig(null)).toEqual(DEFAULT_SCANNER_CONFIG);
  });
});
