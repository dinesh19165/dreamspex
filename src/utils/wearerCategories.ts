import { WEARER_IMAGES } from '../config/wearerImages';

export function normalizeWearerCategory(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function wearerCategoryKey(value: string): string {
  const normalized = normalizeWearerCategory(value);
  return ['women', 'woman', 'female'].includes(normalized) ? 'women' : normalized;
}

export function wearerLifestyleImage(value: string): string {
  const categories = value.split(/[/,&|]+/).map(normalizeWearerCategory);

  if (categories.includes('female')) return WEARER_IMAGES.female;
  if (categories.some((category) => ['women', 'woman'].includes(category))) return WEARER_IMAGES.women;
  if (categories.some((category) => ['men', 'man', 'male'].includes(category))) return WEARER_IMAGES.men;
  if (categories.some((category) => ['children', 'child', 'kids', 'kid'].includes(category))) return WEARER_IMAGES.children;
  if (categories.includes('unisex')) return WEARER_IMAGES.unisex;
  return WEARER_IMAGES.fallback;
}

export function uniqueWearerValues(values: Array<string | null | undefined>): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const displayValue = value?.trim().replace(/\s+/g, ' ');
    if (!displayValue) continue;
    const key = wearerCategoryKey(displayValue);
    const current = unique.get(key);
    if (!current || (key === 'women'
      && normalizeWearerCategory(displayValue) === 'women'
      && normalizeWearerCategory(current) !== 'women')) {
      unique.set(key, displayValue);
    }
  }
  return [...unique.values()];
}

type WearerCard = {
  id: string;
  destinationValue: string;
  imageUrl: string | null;
};

export function deduplicateWearerCards<T extends WearerCard>(cards: T[]): T[] {
  const unique = new Map<string, T>();
  for (const card of cards) {
    const key = wearerCategoryKey(card.destinationValue);
    if (!key) continue;
    const current = unique.get(key);
    const preferWomenCategory = key === 'women'
      && normalizeWearerCategory(card.destinationValue) === 'women'
      && normalizeWearerCategory(current?.destinationValue ?? '') !== 'women';
    const preferDuplicateImage = current
      && normalizeWearerCategory(current.destinationValue) === normalizeWearerCategory(card.destinationValue)
      && !current.imageUrl
      && card.imageUrl;
    if (!current || preferWomenCategory || preferDuplicateImage) unique.set(key, card);
  }
  return [...unique.values()];
}

export function formatWearerTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (_match, separator: string, letter: string) =>
      `${separator}${letter.toUpperCase()}`);
}
