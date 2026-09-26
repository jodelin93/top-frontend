import { t } from '@/i18n';

/**
 * Code 128 (set B) barcode as inline SVG, so receipts can carry a scannable sale
 * number without an extra library. Handheld scanners read it back into the
 * returns screen's receipt-number field.
 */

// Bar/space widths for symbol values 0–106 (106 = stop, which has a final bar)
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

function encode(text: string): number[] {
  const values = [...text].map((char) => {
    const code = char.charCodeAt(0);
    // Set B covers printable ASCII; anything else becomes '?'
    return code >= 32 && code <= 126 ? code - 32 : 31;
  });
  const checksum = values.reduce((sum, value, i) => sum + value * (i + 1), START_B) % 103;
  return [START_B, ...values, checksum, STOP];
}

export function Barcode({ value, height = 40, className }: { value: string; height?: number; className?: string }) {
  const widths = encode(value).flatMap((symbol) => [...PATTERNS[symbol]].map(Number));
  // 10-module quiet zone on each side
  const quiet = 10;
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  let x = quiet;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return (
    <svg
      viewBox={`0 0 ${total} ${height}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={t('Barcode {value}', { value })}
      style={{ width: '100%', height }}
    >
      <rect width={total} height={height} fill="#fff" />
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}
