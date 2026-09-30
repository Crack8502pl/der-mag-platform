import { describe, expect, it } from 'vitest';

import { materialToCameraBreakdown, normalizeQuantity } from '../TaskConfigurationStep';
import type { ResolvedMaterial } from '../../types/wizard.types';

const material = (name: string, quantity: number | string): ResolvedMaterial =>
  ({
    id: 1,
    materialName: name,
    quantity,
    unit: 'szt',
    quantitySource: 'FIXED',
    groupName: 'Kamery',
    requiresIp: true,
    isSelected: true
  }) as unknown as ResolvedMaterial;

describe('camera quantity normalization', () => {
  it('parses decimal strings', () => {
    expect(normalizeQuantity('2.00')).toBe(2);
    expect(normalizeQuantity(1)).toBe(1);
    expect(normalizeQuantity('abc')).toBe(0);
    expect(normalizeQuantity(null)).toBe(0);
  });

  it('keeps string quantities in camera breakdown', () => {
    expect(materialToCameraBreakdown(material('Kamera LPR', '2.00'))).toEqual({
      total: 2, ogolna: 0, lpr: 2, skp: 0
    });
  });

  it('sums 2 crossings (2 general + 2 LPR) and 2 SKP to 10 cameras', () => {
    const parts = [
      materialToCameraBreakdown(material('Kamera ogólna', '2.00')),
      materialToCameraBreakdown(material('Kamera LPR', '2.00')),
      materialToCameraBreakdown(material('Kamera ogólna', '2.00')),
      materialToCameraBreakdown(material('Kamera LPR', '2.00')),
      materialToCameraBreakdown(material('Kamera SKP', 1)),
      materialToCameraBreakdown(material('Kamera SKP', 1))
    ];
    const sum = parts.reduce(
      (a, p) => ({ total: a.total + p.total, ogolna: a.ogolna + p.ogolna, lpr: a.lpr + p.lpr, skp: a.skp + p.skp }),
      { total: 0, ogolna: 0, lpr: 0, skp: 0 }
    );
    expect(sum).toEqual({ total: 10, ogolna: 4, lpr: 4, skp: 2 });
  });
});
