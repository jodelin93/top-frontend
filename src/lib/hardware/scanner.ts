'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Barcode scanners in keyboard mode (spec §15): they "type" the code very fast and
 * usually end with Enter. Per-till settings (localStorage) tell a scan from typing:
 *
 * - terminator: key the scanner sends after the code (Enter, Tab, or none: the end
 *   of the fast burst ends the scan)
 * - minLength: shorter fast bursts are not scans
 * - maxInterKeyDelayMs: keys closer than this belong to one scan (people type slower)
 * - duplicateWindowMs: the same code scanned again within this time is ignored
 *   (double reads), a deliberate second scan after it adds the item again
 */
export interface ScannerConfig {
  terminator: 'enter' | 'tab' | 'none';
  minLength: number;
  maxInterKeyDelayMs: number;
  duplicateWindowMs: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  terminator: 'enter',
  minLength: 4,
  maxInterKeyDelayMs: 50,
  duplicateWindowMs: 1000,
};

const STORAGE_KEY = 'pos_scanner_config';

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

export function normalizeScannerConfig(input: Partial<ScannerConfig> | null | undefined): ScannerConfig {
  const d = DEFAULT_SCANNER_CONFIG;
  return {
    terminator: input?.terminator === 'tab' || input?.terminator === 'none' ? input.terminator : 'enter',
    minLength: clamp(input?.minLength, 1, 64, d.minLength),
    maxInterKeyDelayMs: clamp(input?.maxInterKeyDelayMs, 5, 500, d.maxInterKeyDelayMs),
    duplicateWindowMs: clamp(input?.duplicateWindowMs, 0, 10_000, d.duplicateWindowMs),
  };
}

export function loadScannerConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeScannerConfig(raw ? (JSON.parse(raw) as Partial<ScannerConfig>) : null);
  } catch {
    return DEFAULT_SCANNER_CONFIG;
  }
}

export function saveScannerConfig(config: ScannerConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeScannerConfig(config)));
}

/** Gaps between keystrokes and whether they look like a scanner */
export function analyzeKeystrokes(times: number[], config: ScannerConfig) {
  const gaps = times.slice(1).map((time, i) => Math.round(time - times[i]));
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
  const isScan = times.length >= Math.max(2, config.minLength) && gaps.every((g) => g <= config.maxInterKeyDelayMs);
  return { gaps, maxGap, avgGap, isScan };
}

export type ScanVerdict = { isScan: boolean; accept: boolean; reason?: 'duplicate' };

/**
 * Keeps the timing of the current fast run of keys. A pause longer than
 * maxInterKeyDelayMs starts a new run, so typing a few letters and then scanning
 * still counts as a scan.
 */
export class ScanDetector {
  private times: number[] = [];
  private lastScan: { code: string; at: number } | null = null;

  constructor(
    public config: ScannerConfig,
    private now: () => number = () => performance.now()
  ) {}

  /** A printable key was typed */
  key(at = this.now()) {
    const last = this.times[this.times.length - 1];
    if (last !== undefined && at - last > this.config.maxInterKeyDelayMs) this.times = [];
    this.times.push(at);
  }

  get burst() {
    return analyzeKeystrokes(this.times, this.config);
  }

  isTerminator(key: string) {
    return (this.config.terminator === 'enter' && key === 'Enter') || (this.config.terminator === 'tab' && key === 'Tab');
  }

  /** The input was submitted with `code`: was it a scan, and should it be used? */
  finish(code: string, at = this.now()): ScanVerdict {
    const isScan = this.burst.isScan;
    this.times = [];
    if (!isScan) return { isScan: false, accept: true };
    const duplicate = this.lastScan && this.lastScan.code === code && at - this.lastScan.at <= this.config.duplicateWindowMs;
    this.lastScan = { code, at };
    return duplicate ? { isScan: true, accept: false, reason: 'duplicate' } : { isScan: true, accept: true };
  }
}

/**
 * Scanner handling for a search box. `onKeyDown` goes on the input; the submit
 * handler calls `accept(code)` first and drops the input when it returns false
 * (a double read). With Tab or no terminator the scan submits the input's form
 * (or calls `onScan` when given).
 */
export function useScannerInput(onScan?: () => void) {
  const [config, setConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const detector = useRef<ScanDetector | null>(null);
  const onScanRef = useRef(onScan);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const load = () => setConfig(loadScannerConfig());
    load();
    // Saved on the Hardware page in another tab
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('storage', load);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (detector.current) detector.current.config = config;
    else detector.current = new ScanDetector(config);
  }, [config]);

  const get = () => (detector.current ??= new ScanDetector(config));
  const submit = () => {
    if (onScanRef.current) onScanRef.current();
    else input.current?.form?.requestSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const d = get();
    input.current = event.currentTarget;
    if (event.key.length === 1) {
      d.key();
      if (config.terminator === 'none') {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
          if (get().burst.isScan) submit();
        }, Math.max(80, config.maxInterKeyDelayMs * 3));
      }
      return;
    }
    if (event.key === 'Tab' && d.isTerminator('Tab') && d.burst.isScan) {
      event.preventDefault();
      submit();
    }
  };

  return { config, onKeyDown, accept: (code: string) => get().finish(code).accept };
}
