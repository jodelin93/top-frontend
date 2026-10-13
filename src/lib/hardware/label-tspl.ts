/**
 * Product labels for a label printer (TSPL commands, 203 dpi): one small label per
 * product with the name, the price and a Code 128 barcode of the code. Sent as they
 * are to the printer through the JodaPrint agent, without the browser print dialog.
 *
 * Labels are 1 x 1 inch. The printer's own fonts are used (plain ASCII: accents are
 * written without their mark).
 */
import type { Label } from '@/lib/api/products';

// The label roll: width, height and the gap between two labels, in inches
export const LABEL_SIZE = { widthIn: 1, heightIn: 1, gapIn: 0.12 };
const DPI = 203;
export const LABEL_DOTS = Math.round(LABEL_SIZE.widthIn * DPI);
// Nothing is printed closer than this to the edge (2 mm)
const MARGIN_DOTS = 16;
const USABLE_DOTS = LABEL_DOTS - MARGIN_DOTS * 2;

// The printer's fonts: name in TSPL, width and height of one character in dots
const FONT = {
  small: { id: '1', width: 8, height: 12 },
  medium: { id: '2', width: 12, height: 20 },
  large: { id: '3', width: 16, height: 24 },
} as const;
type Font = (typeof FONT)[keyof typeof FONT];

const fits = (font: Font) => Math.floor(USABLE_DOTS / font.width);

/** Text the printer's fonts can show: no accents, no symbols outside ASCII, no quotes */
export function labelText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[   ]/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words wrapped on at most `lines` lines of `width` characters; the rest is cut */
export function wrapLabelText(value: string, width: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= width) {
      line = next;
      continue;
    }
    if (out.length === lines - 1) {
      // Last line: what fits of the rest
      line = next.slice(0, width);
      break;
    }
    if (line) out.push(line);
    line = word.slice(0, width);
  }
  if (line) out.push(line);
  return out.slice(0, lines);
}

// Width of the Code 128 barcode in bars of 1 dot. Digits go in pairs (an odd one costs
// a change of set and a symbol of its own); other codes take one symbol per character.
function barcodeModules(code: string): number {
  const digits = /^\d+$/.test(code);
  const symbols = !digits ? code.length : code.length % 2 === 0 ? code.length / 2 : (code.length - 1) / 2 + 2;
  return 11 * (symbols + 2) + 13;
}

/**
 * Width of a bar of the Code 128 barcode, in dots: 2 when the code fits the label
 * that way, else 1, else null (no barcode: the code is only written).
 */
export function labelBarcodeWidth(code: string): 2 | 1 | null {
  const modules = barcodeModules(code);
  if (modules * 2 <= USABLE_DOTS) return 2;
  return modules <= USABLE_DOTS ? 1 : null;
}

const centered = (width: number) => Math.max(0, Math.round((LABEL_DOTS - width) / 2));

function text(y: number, font: Font, value: string): string {
  const shown = value.slice(0, fits(font));
  return `TEXT ${centered(shown.length * font.width)},${y},"${font.id}",0,1,1,"${shown}"`;
}

/** The commands of one label (without the roll set-up), printed `copies` times */
export function labelCommands(label: Label, priceText: string, copies = 1): string[] {
  const name = labelText(label.name);
  const variant = labelText(label.variantName ?? '');
  // Bigger letters when the name fits them; a variant takes the second line
  const font = (variant ? name.length : Math.ceil(name.length / 2)) <= fits(FONT.medium) ? FONT.medium : FONT.small;
  const lines = variant
    ? [name.slice(0, fits(font)), variant.slice(0, fits(font))]
    : wrapLabelText(name, fits(font), 2);
  const price = labelText(priceText);
  const code = labelText(label.code);
  const bar = labelBarcodeWidth(code);

  const commands = ['CLS'];
  const top = lines.length > 1 ? 12 : 22;
  lines.forEach((line, index) => commands.push(text(top + index * (font.height + 2), font, line)));
  commands.push(text(62, price.length <= fits(FONT.large) ? FONT.large : FONT.medium, price));
  if (bar) {
    commands.push(`BARCODE ${centered(barcodeModules(code) * bar)},96,"128",56,0,0,${bar},${bar},"${code}"`);
    commands.push(text(158, FONT.small, code));
  } else {
    commands.push(text(118, code.length <= fits(FONT.medium) ? FONT.medium : FONT.small, code));
  }
  commands.push(`PRINT 1,${Math.max(1, Math.floor(copies))}`);
  return commands;
}

/**
 * All the labels as one print job. Copies of the same product that follow each other
 * are printed by the printer itself (one drawing, n copies).
 */
export function labelsToTspl(labels: Label[], formatPrice: (price: number) => string): Uint8Array {
  const commands = [
    `SIZE ${LABEL_SIZE.widthIn},${LABEL_SIZE.heightIn}`,
    `GAP ${LABEL_SIZE.gapIn},0`,
    'DIRECTION 1',
    'REFERENCE 0,0',
  ];
  for (let i = 0; i < labels.length; ) {
    let copies = 1;
    while (i + copies < labels.length && labels[i + copies].variantId === labels[i].variantId) copies += 1;
    commands.push(...labelCommands(labels[i], formatPrice(labels[i].price), copies));
    i += copies;
  }
  return new TextEncoder().encode(commands.join('\r\n') + '\r\n');
}

/** A label to check the printer and how the roll is set */
export function testLabelTspl(storeName: string): Uint8Array {
  return labelsToTspl(
    [{ variantId: 'test', name: storeName || 'Test', variantName: null, sku: '123456', code: '123456', price: 0 }],
    () => 'TEST 1 x 1'
  );
}
