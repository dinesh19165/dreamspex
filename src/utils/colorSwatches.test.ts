import { describe, expect, it } from 'vitest';
import { getColorSwatch } from './colorSwatches';

describe('homepage and navigation color swatches', () => {
  it.each([
    ['Dark Teak/Black', 'linear-gradient(135deg, #5b3524 0 48%, #111111 52% 100%)'],
    ['GunMetal', 'linear-gradient(135deg, #62686d 0%, #c0c4c7 48%, #767d83 100%)'],
    ['Havana', 'repeating-linear-gradient(45deg, #552a13 0 2px, #a85b23 2px 4px, #2d160e 4px 6px)'],
    ['Black', '#111111'],
    ['Red', '#dc2626'],
  ])('maps %s to its swatch', (color, swatch) => {
    expect(getColorSwatch(color)).toBe(swatch);
  });
});
