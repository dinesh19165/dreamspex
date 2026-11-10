export type PendingProductAction = {
  productId: string;
  variantId: string;
  action: 'ADD_TO_CART' | 'BUY_NOW';
  quantity: number;
  returnPath: string;
  createdAt: number;
};

const STORAGE_KEY = 'dream-spex-pending-product-action';
const MAX_AGE_MS = 30 * 60 * 1000;

export function savePendingProductAction(
  action: Omit<PendingProductAction, 'createdAt'>,
  storage: Pick<Storage, 'setItem'> = window.sessionStorage,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...action, createdAt: Date.now() }));
}

export function readPendingProductAction(
  storage: Pick<Storage, 'getItem' | 'removeItem'> = window.sessionStorage,
): PendingProductAction | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PendingProductAction>;
    const valid = typeof value.productId === 'string' && value.productId.length > 0
      && typeof value.variantId === 'string' && value.variantId.length > 0
      && (value.action === 'ADD_TO_CART' || value.action === 'BUY_NOW')
      && Number.isInteger(value.quantity) && (value.quantity ?? 0) > 0
      && typeof value.returnPath === 'string'
      && (value.returnPath.startsWith('/product/') || value.returnPath.startsWith('/products/'))
      && !value.returnPath.startsWith('//')
      && typeof value.createdAt === 'number'
      && Date.now() - value.createdAt <= MAX_AGE_MS;
    if (!valid) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return value as PendingProductAction;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function takePendingProductAction(
  productId: string,
  storage: Pick<Storage, 'getItem' | 'removeItem'> = window.sessionStorage,
): PendingProductAction | null {
  const action = readPendingProductAction(storage);
  if (!action || action.productId !== productId) return null;
  storage.removeItem(STORAGE_KEY);
  return action;
}

export function pendingProductActionPath(
  storage: Pick<Storage, 'getItem' | 'removeItem'> = window.sessionStorage,
): string | null {
  return readPendingProductAction(storage)?.returnPath ?? null;
}

export function clearPendingProductAction(
  storage: Pick<Storage, 'removeItem'> = window.sessionStorage,
) {
  storage.removeItem(STORAGE_KEY);
}
