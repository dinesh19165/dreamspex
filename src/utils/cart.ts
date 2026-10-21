export function getCartItemKey(item: { id: number; configuredId?: string }): string {
  return item.configuredId ?? `product-${item.id}`;
}
