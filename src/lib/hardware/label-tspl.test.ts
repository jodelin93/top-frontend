import { describe, expect, it } from 'vitest';
import type { Label } from '@/lib/api/products';
import { LABEL_DOTS, labelBarcodeWidth, labelCommands, labelText, labelsToTspl, wrapLabelText } from './label-tspl';

const label = (over: Partial<Label> = {}): Label => ({
  variantId: 'v1',
  name: 'Tableau PCV 13x19 + imp',
  variantName: null,
  sku: 'TOP-01',
  code: 'TOP-01',
  price: 2000,
  ...over,
});

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes).split('\r\n');
// Where a text starts and ends on the label, from its command
const span = (command: string) => {
  const [, x, , font, value] = /^TEXT (\d+),(\d+),"(\d)",0,1,1,"(.*)"$/.exec(command)!;
  const width = { '1': 8, '2': 12, '3': 16 }[font]! * value.length;
  return { from: Number(x), to: Number(x) + width };
};

describe('product labels for the label printer (1 x 1 inch)', () => {
  it('sets the roll once: 1 x 1 inch labels with their gap', () => {
    const lines = decode(labelsToTspl([label()], () => 'HTG 2,000'));
    expect(lines.slice(0, 4)).toEqual(['SIZE 1,1', 'GAP 0.12,0', 'DIRECTION 1', 'REFERENCE 0,0']);
    expect(lines.filter((line) => line.startsWith('SIZE'))).toHaveLength(1);
  });

  it('prints the name on two lines, the price, the barcode and the code, all inside the label', () => {
    const commands = labelCommands(label(), 'HTG 2,000');
    expect(commands[0]).toBe('CLS');
    expect(commands).toContain('TEXT 36,12,"2",0,1,1,"Tableau PCV"');
    expect(commands).toContain('TEXT 36,34,"2",0,1,1,"13x19 + imp"');
    expect(commands).toContain('TEXT 30,62,"3",0,1,1,"HTG 2,000"');
    expect(commands).toContain('BARCODE 51,96,"128",56,0,0,1,1,"TOP-01"');
    expect(commands.at(-1)).toBe('PRINT 1,1');
    for (const command of commands.filter((c) => c.startsWith('TEXT'))) {
      expect(span(command).from).toBeGreaterThanOrEqual(16);
      expect(span(command).to).toBeLessThanOrEqual(LABEL_DOTS - 16);
    }
  });

  it('keeps long names, prices and codes inside the label', () => {
    const commands = labelCommands(
      label({ name: 'Impression grand format sur bâche publicitaire extérieure', code: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123' }),
      'HTG 1,234,567.89'
    );
    for (const command of commands.filter((c) => c.startsWith('TEXT'))) {
      expect(span(command).from).toBeGreaterThanOrEqual(16);
      expect(span(command).to).toBeLessThanOrEqual(LABEL_DOTS - 16);
    }
    // Too long for a barcode on this label: the code is only written
    expect(commands.some((c) => c.startsWith('BARCODE'))).toBe(false);
  });

  it('puts the variant on the second line', () => {
    const commands = labelCommands(label({ name: 'T-shirt', variantName: 'Rouge / L' }), '$5');
    expect(commands).toContain('TEXT 60,12,"2",0,1,1,"T-shirt"');
    expect(commands).toContain('TEXT 48,34,"2",0,1,1,"Rouge / L"');
  });

  it('uses thicker bars when the code leaves room for them', () => {
    expect(labelBarcodeWidth('123456')).toBe(2);
    expect(labelBarcodeWidth('TOP-01')).toBe(1);
    expect(labelBarcodeWidth('7501031311309')).toBe(1);
    expect(labelBarcodeWidth('A'.repeat(20))).toBeNull();
  });

  it('lets the printer repeat the copies of one product', () => {
    const lines = decode(
      labelsToTspl([label(), label(), label(), label({ variantId: 'v2', name: 'Cadre' })], (price) => String(price))
    );
    expect(lines.filter((line) => line === 'CLS')).toHaveLength(2);
    expect(lines.filter((line) => line.startsWith('PRINT'))).toEqual(['PRINT 1,3', 'PRINT 1,1']);
  });

  it('writes text the printer fonts can show', () => {
    expect(labelText('Étiquette  “crème” 5 €')).toBe('Etiquette creme 5');
    expect(labelText('2 000,00 HTG')).toBe('2 000,00 HTG');
    expect(labelText('Cadre 8" x 10"')).toBe("Cadre 8' x 10'");
    expect(wrapLabelText('Tableau PCV 13x19 + imp', 14, 2)).toEqual(['Tableau PCV', '13x19 + imp']);
    expect(wrapLabelText('Un nom beaucoup trop long pour deux lignes', 14, 2)).toEqual(['Un nom', 'beaucoup trop ']);
  });
});
