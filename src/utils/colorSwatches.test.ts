import { describe, expect, it } from 'vitest';
import {
  canonicalizeColorCombination,
  formatColorLabel,
  getColorSwatch,
  normalizeColorCombination,
  parseColorComponents,
  toggleColorComponent,
  uniqueColorCombinations,
  uniqueColorComponents,
} from './colorSwatches';

describe('homepage and navigation color swatches', () => {
  it.each([
    ['Dark Teak/Black', 'conic-gradient(#704214 0% 50%, #111111 50% 100%)'],
    ['GunMetal', 'linear-gradient(135deg, #62686d 0%, #c0c4c7 48%, #767d83 100%)'],
    ['Havana', 'repeating-linear-gradient(45deg, #552a13 0 2px, #a85b23 2px 4px, #2d160e 4px 6px)'],
    ['Black', '#111111'],
    ['Red', '#dc2626'],
  ])('maps %s to its swatch', (color, swatch) => {
    expect(getColorSwatch(color)).toBe(swatch);
  });

  it.each([
    ['RED', '#dc2626'],
    ['BLACK', '#111111'],
    ['RED/BLACK', 'conic-gradient(#dc2626 0% 50%, #111111 50% 100%)'],
    ['BLACK/GOLD', 'conic-gradient(#111111 0% 50%, #c59b45 50% 100%)'],
    ['BLUE/WHITE', 'conic-gradient(#2563eb 0% 50%, #ffffff 50% 100%)'],
    ['RED/BLACK/GOLD', 'conic-gradient(#dc2626 0% 33.3333%, #111111 33.3333% 66.6667%, #c59b45 66.6667% 100%)'],
    ['RED/BLACK/GOLD/WHITE', 'conic-gradient(#dc2626 0% 25%, #111111 25% 50%, #c59b45 50% 75%, #ffffff 75% 100%)'],
  ])('renders %s with balanced colour sections', (color, swatch) => {
    expect(getColorSwatch(color)).toBe(swatch);
  });

  it('parses common separators, normalizes duplicates, and preserves multi-word colour names', () => {
    expect(parseColorComponents(' RED / black & Red, Navy Blue and #ffffff '))
      .toEqual(['RED', 'black', 'Navy Blue', '#ffffff']);
    expect(canonicalizeColorCombination('RED / black & Red')).toBe('RED/black');
    expect(normalizeColorCombination('Red / BLACK')).toBe('red/black');
    expect(formatColorLabel('RED/BLACK')).toBe('Red/Black');
    expect(uniqueColorCombinations(['RED/BLACK', 'red / black', 'BLACK/RED']))
      .toEqual(['RED/BLACK', 'BLACK/RED']);
    expect(uniqueColorComponents(['RED/BLACK', 'red', 'Navy Blue']))
      .toEqual(['BLACK', 'Navy Blue', 'RED']);
  });

  it('adds and removes palette colours without allowing duplicate components', () => {
    expect(toggleColorComponent('RED', 'red', true)).toBe('RED');
    expect(toggleColorComponent('RED', 'BLACK', true)).toBe('RED/BLACK');
    expect(toggleColorComponent('RED/BLACK', 'red', false)).toBe('BLACK');
    expect(toggleColorComponent('BLACK', 'black', false)).toBeNull();
  });
});
