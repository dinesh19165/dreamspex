export function getCartItemKey(item: { id: number; configuredId?: string }): string {
  return item.configuredId ?? `product-${item.id}`;
}

export function withoutCartItem<T extends { id: number; configuredId?: string }>(
  items: T[],
  itemKey: string,
): T[] {
  return items.filter((item) => getCartItemKey(item) !== itemKey);
}
