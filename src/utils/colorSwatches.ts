const colorSwatches: Record<string, string> = {
  gunmetal: 'linear-gradient(135deg, #62686d 0%, #c0c4c7 48%, #767d83 100%)',
  havana: 'repeating-linear-gradient(45deg, #552a13 0 2px, #a85b23 2px 4px, #2d160e 4px 6px)',
  black: '#111111',
  'matte black': '#111111',
  red: '#dc2626',
  burgundy: '#7f1d1d',
  midnight: '#1f2937',
  titanium: 'linear-gradient(135deg, #777d82 0%, #d2d5d7 48%, #878d92 100%)',
  gold: '#c59b45',
  golden: '#c59b45',
  slate: '#64748b',
  blue: '#2563eb',
  'navy blue': '#1e3a8a',
  ivory: '#f4efe3',
  onyx: '#292524',
  silver: 'linear-gradient(135deg, #777d82 0%, #d2d5d7 48%, #878d92 100%)',
  grey: '#808080',
  gray: '#808080',
  brown: '#704214',
  green: '#2f6d3a',
  'olive green': '#556b2f',
  white: '#ffffff',
  'rose gold': '#b76e79',
  'blush pink': '#d98b9c',
};

const combinationSeparator = /\s*(?:\/|,|&|\+|\||;|\band\b)\s*/i;

export function parseColorComponents(color: string | null | undefined): string[] {
  if (!color?.trim()) return [];
  const seen = new Set<string>();
  return color.split(combinationSeparator)
    .map((component) => component.trim().replace(/\s+/g, ' '))
    .filter((component) => {
      if (!component) return false;
      const key = component.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function canonicalizeColorCombination(color: string | null | undefined): string | null {
  const components = parseColorComponents(color);
  return components.length ? components.join('/') : null;
}

export function normalizeColorCombination(color: string | null | undefined): string {
  return parseColorComponents(color).map((component) => component.toLowerCase()).join('/');
}

export function uniqueColorCombinations(colors: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return colors.flatMap((color) => {
    const key = normalizeColorCombination(color);
    const canonical = canonicalizeColorCombination(color);
    if (!key || !canonical || seen.has(key)) return [];
    seen.add(key);
    return [canonical];
  });
}

export function uniqueColorComponents(colors: Array<string | null | undefined>): string[] {
  const components = new Map<string, string>();
  colors.flatMap(parseColorComponents).forEach((component) => {
    const key = component.toLowerCase();
    if (!components.has(key)) components.set(key, component);
  });
  return [...components.values()].sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }));
}

export function toggleColorComponent(
  color: string | null | undefined,
  component: string,
  selected: boolean,
): string | null {
  const components = parseColorComponents(color);
  const key = component.trim().toLowerCase();
  const next = selected
    ? components.some((item) => item.toLowerCase() === key) ? components : [...components, component.trim()]
    : components.filter((item) => item.toLowerCase() !== key);
  return next.length ? next.join('/') : null;
}

export function formatColorLabel(color: string): string {
  return parseColorComponents(color).map((component) => {
    if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(component)) return component.toUpperCase();
    return component.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_match, separator: string, letter: string) =>
      `${separator}${letter.toUpperCase()}`);
  }).join('/');
}

export function getColorSwatch(color: string) {
  const components = parseColorComponents(color);
  if (components.length > 1) {
    const step = 100 / components.length;
    const stops = components.map((component, index) => {
      const start = index === 0 ? 0 : Number((index * step).toFixed(4));
      const end = index === components.length - 1 ? 100 : Number(((index + 1) * step).toFixed(4));
      return `${resolveSolidColor(component)} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }
  return resolveSingleColor(components[0] ?? color);
}

function resolveSingleColor(color: string) {
  const normalized = color.trim().toLowerCase().replace(/\s+/g, ' ');
  const mapped = colorSwatches[normalized];
  if (mapped) return mapped;
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(color.trim())) return color.trim();
  if (typeof CSS !== 'undefined' && CSS.supports('color', color)) return color;
  if (/(havana|tortoise)/.test(normalized)) return colorSwatches.havana;
  if (/gun\s*metal/.test(normalized)) return colorSwatches.gunmetal;
  if (/metal|titanium|steel|silver|grey|gray/.test(normalized)) return colorSwatches.gunmetal;
  if (/black|onyx|midnight/.test(normalized)) return colorSwatches.black;
  if (/red|burgundy|wine/.test(normalized)) return colorSwatches.red;
  if (/gold|champagne/.test(normalized)) return colorSwatches.golden;
  if (/brown|teak|coffee/.test(normalized)) return colorSwatches.brown;
  if (/blue|navy/.test(normalized)) return colorSwatches.blue;
  if (/green/.test(normalized)) return colorSwatches.green;
  if (/pink/.test(normalized)) return colorSwatches['blush pink'];
  if (/white|ivory/.test(normalized)) return colorSwatches.white;
  return 'transparent';
}

function resolveSolidColor(color: string) {
  const normalized = color.trim().toLowerCase();
  const swatch = resolveSingleColor(color);
  if (!swatch.includes('gradient')) return swatch;
  if (/(havana|tortoise)/.test(normalized)) return '#a85b23';
  if (/metal|titanium|steel|silver|grey|gray/.test(normalized)) return '#767d83';
  return '#9ca3af';
}
