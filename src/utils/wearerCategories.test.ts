import { describe, expect, it } from 'vitest';
import { deduplicateWearerCards, formatWearerTitle, normalizeWearerCategory, uniqueWearerValues, wearerLifestyleImage } from './wearerCategories';

describe('wearer categories', () => {
  it('trims and de-duplicates values without regard to case while preserving the first API value', () => {
    expect(uniqueWearerValues([' Unisex ', 'UNISEX', 'Women', 'WOMEN', '  Men  ']))
      .toEqual(['Unisex', 'Women', 'Men']);
    expect(normalizeWearerCategory('  Eye   Care  ')).toBe('eye care');
  });

  it('keeps only the Women category when Women and Female are both available', () => {
    expect(uniqueWearerValues(['Female', 'Men', 'Women'])).toEqual(['Women', 'Men']);
    expect(uniqueWearerValues(['Female'])).toEqual(['Female']);
  });

  it('keeps the original category record and prefers a duplicate with an uploaded image', () => {
    const cards = [
      { id: 'without-image', destinationValue: ' Women ', imageUrl: null },
      { id: 'with-image', destinationValue: 'WOMEN', imageUrl: '/media/women.webp' },
      { id: 'unisex', destinationValue: 'Unisex', imageUrl: null },
    ];

    expect(deduplicateWearerCards(cards)).toEqual([
      cards[1],
      cards[2],
    ]);
  });

  it('prefers the Women destination over Female when both API cards are present', () => {
    const female = { id: 'female', destinationValue: 'Female', imageUrl: '/media/female.webp' };
    const women = { id: 'women', destinationValue: 'Women', imageUrl: null };
    expect(deduplicateWearerCards([female, women])).toEqual([women]);
  });

  it('formats category labels without changing their API values', () => {
    expect(formatWearerTitle('  UNISEX  ')).toBe('Unisex');
    expect(formatWearerTitle('navy blue')).toBe('Navy Blue');
  });

  it('maps category aliases to local lifestyle photos and defaults to the unisex photo', () => {
    expect(wearerLifestyleImage(' WOMEN ')).toBe('/assets/wearer-women.jfif');
    expect(wearerLifestyleImage('Female')).toBe('/assets/wearer-female.jfif');
    expect(wearerLifestyleImage('Men')).toBe('/assets/wearer-men.jfif');
    expect(wearerLifestyleImage('Unisex')).toBe('/assets/wearer-unisex.jfif');
    expect(wearerLifestyleImage('Children / Kids')).toBe('/assets/wearer-children.jpg');
    expect(wearerLifestyleImage('Something else')).toBe('/assets/wearer-unisex.jfif');
  });
});
