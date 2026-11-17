const colorSwatches: Record<string, string> = {
  'dark teak/black': 'linear-gradient(135deg, #5b3524 0 48%, #111111 52% 100%)',
  gunmetal: 'linear-gradient(135deg, #62686d 0%, #c0c4c7 48%, #767d83 100%)',
  havana: 'repeating-linear-gradient(45deg, #552a13 0 2px, #a85b23 2px 4px, #2d160e 4px 6px)',
  black: '#111111',
  red: '#dc2626',
  midnight: '#1f2937',
  titanium: 'linear-gradient(135deg, #777d82 0%, #d2d5d7 48%, #878d92 100%)',
  golden: '#c59b45',
  slate: '#64748b',
  blue: '#2563eb',
  ivory: '#f4efe3',
  onyx: '#292524',
  silver: 'linear-gradient(135deg, #777d82 0%, #d2d5d7 48%, #878d92 100%)',
  grey: '#808080',
  gray: '#808080',
  brown: '#704214',
  green: '#2f6d3a',
  white: '#ffffff',
  'rose gold': '#b76e79',
};

export function getColorSwatch(color: string) {
  const normalized = color.trim().toLowerCase().replace(/\s+/g, ' ');
  const mapped = colorSwatches[normalized];
  if (mapped) return mapped;
  if (typeof CSS !== 'undefined' && CSS.supports('color', color)) return color;
  if (/(havana|tortoise)/.test(normalized)) return colorSwatches.havana;
  if (/gun\s*metal/.test(normalized)) return colorSwatches.gunmetal;
  if (/teak/.test(normalized) && /black/.test(normalized)) return colorSwatches['dark teak/black'];
  if (/metal|titanium|steel|silver|grey|gray/.test(normalized)) return colorSwatches.gunmetal;
  if (/black|onyx|midnight/.test(normalized)) return colorSwatches.black;
  if (/red|burgundy|wine/.test(normalized)) return colorSwatches.red;
  if (/gold|champagne/.test(normalized)) return colorSwatches.golden;
  if (/brown|teak|coffee/.test(normalized)) return colorSwatches.brown;
  if (/blue|navy/.test(normalized)) return colorSwatches.blue;
  if (/green/.test(normalized)) return colorSwatches.green;
  if (/white|ivory/.test(normalized)) return colorSwatches.white;
  return 'transparent';
}
