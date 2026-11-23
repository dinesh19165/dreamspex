import { getColorSwatch } from '../../utils/colorSwatches';

type ColorSwatchProps = {
  color: string;
  className: string;
};

export default function ColorSwatch({ color, className }: ColorSwatchProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ background: getColorSwatch(color) }}
    />
  );
}
