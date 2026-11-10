export function getDiscountPercentage(sellingPrice: number, listPrice?: number): number | null {
  if (listPrice == null
    || !Number.isFinite(sellingPrice)
    || !Number.isFinite(listPrice)
    || sellingPrice < 0
    || listPrice <= sellingPrice) return null;

  return Math.round((1 - sellingPrice / listPrice) * 100);
}
