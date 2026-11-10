import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LensSelection, Product } from '../types';
import { couponService, type CouponResult } from '../services/couponService';
import { getCartItemKey, withoutCartItem } from '../utils/cart';
import { cartService, type CartResponse } from '../services/cartService';
import { useAuth } from './useAuth';

export type CartItem = Product & {
  quantity: number;
  configuredId?: string;
  backendItemId?: string;
  backendProductId?: string;
  backendVariantId?: string;
  backendUnitPrice?: number;
  prescriptionId?: string;
  lensSelection?: LensSelection;
};

type ShopContextValue = {
  wishlist: Product[];
  cart: CartItem[];
  isInWishlist: (productId: number) => boolean;
  isInCart: (productId: number) => boolean;
  toggleWishlist: (product: Product) => void;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  addConfiguredToCart: (product: Product, lensSelection: LensSelection, prescriptionId: string) => Promise<void>;
  removeFromWishlist: (productId: number) => void;
  removeFromCart: (itemKey: string) => Promise<void>;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  cartLoading: boolean;
  cartReady: boolean;
  cartError: string;
  cartNotice: string;
  appliedCoupon: CouponResult | null;
  applyCoupon: (code: string) => Promise<CouponResult | null>;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  total: number;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

function mapCart(response: CartResponse): CartItem[] {
  return response.items.map((item, index) => ({
    id: index + 1,
    variantId: item.variantId,
    name: item.productName,
    category: 'Cart item',
    price: item.unitPrice - item.lensAdditionalPrice,
    image: item.imageUrl ?? '',
    rating: 0,
    reviews: 0,
    stock: item.availableQuantity > 0 ? 'In Stock' : 'Out of Stock',
    description: `SKU: ${item.sku}`,
    colors: [],
    sizes: [],
    material: '',
    brand: '',
    quantity: item.quantity,
    configuredId: item.id,
    backendItemId: item.id,
    backendProductId: item.productId,
    backendVariantId: item.variantId,
    backendUnitPrice: item.unitPrice,
    prescriptionId: item.prescriptionId ?? undefined,
    lensSelection: item.selectedLensCodes.length ? {
      type: item.selectedLensCodes[0],
      material: '',
      coatings: item.selectedLensCodes.slice(1),
      additionalPrice: item.lensAdditionalPrice,
      codes: item.selectedLensCodes,
    } : undefined,
  }));
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dream-spex-wishlist') ?? '[]') as Product[];
    } catch {
      return [];
    }
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return (JSON.parse(localStorage.getItem('dream-spex-cart') ?? '[]') as CartItem[])
        .map((item) => item.configuredId ? item : { ...item, configuredId: `product-${item.id}` });
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(() => {
    try {
      const savedCode = localStorage.getItem('dream-spex-coupon');
      return savedCode ? { code: savedCode, discount: 0 } : null;
    } catch {
      return null;
    }
  });
  const [cartLoading, setCartLoading] = useState(role === 'CUSTOMER' && Boolean(user?.accessToken));
  const [cartLoadedToken, setCartLoadedToken] = useState<string | null>(null);
  const [cartError, setCartError] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const [backendSubtotal, setBackendSubtotal] = useState<number | null>(null);

  const subtotal = backendSubtotal ?? cart.reduce((sum, item) => sum + (item.backendUnitPrice ?? item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity, 0);
  const discount = appliedCoupon?.discount ?? 0;
  const total = subtotal - discount;
  const cartReady = role !== 'CUSTOMER' || !user?.accessToken || cartLoadedToken === user.accessToken;
  const couponValidationSequence = useRef(0);
  const pendingCartRemovals = useRef(new Set<string>());

  useEffect(() => {
    localStorage.setItem('dream-spex-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (role !== 'CUSTOMER') localStorage.setItem('dream-spex-cart', JSON.stringify(cart));
  }, [cart, role]);

  const applyCartResponse = useCallback((response: CartResponse) => {
    setCart(mapCart(response));
    setBackendSubtotal(response.subtotal);
  }, []);

  const loadBackendCart = useCallback(async () => {
    if (role !== 'CUSTOMER' || !user?.accessToken) return;
    setCartLoading(true);
    setCartError('');
    try {
      applyCartResponse(await cartService.get(user.accessToken));
    } catch (reason) {
      setCartError(reason instanceof Error ? reason.message : 'Unable to load your cart.');
    } finally {
      setCartLoadedToken(user.accessToken);
      setCartLoading(false);
    }
  }, [applyCartResponse, role, user?.accessToken]);

  useEffect(() => {
    void loadBackendCart();
  }, [loadBackendCart]);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem('dream-spex-coupon', appliedCoupon.code);
    else localStorage.removeItem('dream-spex-coupon');
  }, [appliedCoupon]);

  useEffect(() => {
    if (!appliedCoupon?.code || role !== 'CUSTOMER' || !user?.accessToken) return undefined;
    const sequence = ++couponValidationSequence.current;
    void couponService.validate(user.accessToken, appliedCoupon.code)
      .then((result) => {
        if (sequence === couponValidationSequence.current) setAppliedCoupon(result);
      })
      .catch(() => {
        if (sequence === couponValidationSequence.current) setAppliedCoupon(null);
      });
    return () => {
      couponValidationSequence.current += 1;
    };
  }, [appliedCoupon?.code, backendSubtotal, cart, role, user?.accessToken]);

  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((current) => {
      const exists = current.some((item) => item.id === product.id);
      return exists ? current.filter((item) => item.id !== product.id) : [...current, product];
    });
  }, []);

  const mutateCart = useCallback(async (operation: (accessToken: string) => Promise<CartResponse | void>, successMessage: string) => {
    if (role !== 'CUSTOMER' || !user?.accessToken) throw new Error('Please sign in to use your cart.');
    setCartLoading(true);
    setCartError('');
    setCartNotice('');
    try {
      const response = await operation(user.accessToken);
      if (response) applyCartResponse(response);
      setCartNotice(successMessage);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to update your cart.';
      setCartError(message);
      throw reason;
    } finally {
      setCartLoading(false);
    }
  }, [applyCartResponse, role, user?.accessToken]);

  const addToCart = useCallback(async (product: Product, quantity = 1) => {
    if (!product.variantId) throw new Error('This product is not linked to an available backend variant.');
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be at least 1.');
    await mutateCart((accessToken) => cartService.add(accessToken, product.variantId!, quantity), 'Product added to cart.');
  }, [mutateCart]);

  const addConfiguredToCart = useCallback(async (product: Product, lensSelection: LensSelection, prescriptionId: string) => {
    if (!product.variantId) throw new Error('This product is not linked to an available backend variant.');
    if (!lensSelection.codes?.length) throw new Error('Select one available lens type before adding this frame.');
    await mutateCart((accessToken) => cartService.add(accessToken, product.variantId!, 1, prescriptionId, lensSelection.codes), 'Prescription lenses added to cart.');
  }, [mutateCart]);

  const removeFromWishlist = useCallback((productId: number) => {
    setWishlist((current) => current.filter((item) => item.id !== productId));
  }, []);

  const removeFromCart = useCallback(async (itemKey: string) => {
    const item = cart.find((value) => getCartItemKey(value) === itemKey);
    if (!item?.backendItemId) throw new Error('Cart item is not available in the backend cart.');
    if (role !== 'CUSTOMER' || !user?.accessToken) throw new Error('Please sign in to use your cart.');
    if (pendingCartRemovals.current.has(itemKey)) return;

    pendingCartRemovals.current.add(itemKey);
    const itemIndex = cart.findIndex((value) => getCartItemKey(value) === itemKey);
    const lineTotal = (item.backendUnitPrice ?? item.price + (item.lensSelection?.additionalPrice ?? 0))
      * item.quantity;
    setCartError('');
    setCartNotice('');
    setCart((current) => withoutCartItem(current, itemKey));
    setBackendSubtotal((current) => current === null ? null : Math.max(0, current - lineTotal));
    setCartLoading(true);

    try {
      await cartService.remove(user.accessToken, item.backendItemId);
      setCartNotice('Product removed from cart.');
      try {
        applyCartResponse(await cartService.get(user.accessToken));
      } catch (reason) {
        setCartError(reason instanceof Error
          ? `Product removed, but the cart could not be refreshed: ${reason.message}`
          : 'Product removed, but the cart could not be refreshed.');
      }
    } catch (reason) {
      setCart((current) => current.some((value) => getCartItemKey(value) === itemKey)
        ? current
        : [...current.slice(0, itemIndex), item, ...current.slice(itemIndex)]);
      setBackendSubtotal((current) => current === null ? null : current + lineTotal);
      const message = reason instanceof Error ? reason.message : 'Unable to remove the product from your cart.';
      setCartError(message);
      throw reason;
    } finally {
      pendingCartRemovals.current.delete(itemKey);
      setCartLoading(false);
    }
  }, [applyCartResponse, cart, role, user?.accessToken]);

  const updateQuantity = useCallback(async (itemKey: string, quantity: number) => {
    const item = cart.find((value) => getCartItemKey(value) === itemKey);
    if (!item?.backendItemId) throw new Error('Cart item is not available in the backend cart.');
    if (quantity < 1) return removeFromCart(itemKey);
    await mutateCart((accessToken) => cartService.update(accessToken, item.backendItemId!, quantity), 'Cart quantity updated.');
  }, [cart, mutateCart, removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);
  const applyCoupon = useCallback(async (code: string) => {
    if (!user?.accessToken) throw new Error('Please sign in to validate a coupon.');
    const result = await couponService.validate(user.accessToken, code);
    setAppliedCoupon(result);
    return result;
  }, [user?.accessToken]);
  const removeCoupon = () => setAppliedCoupon(null);

  const value = useMemo<ShopContextValue>(
    () => ({
      wishlist,
      cart,
      cartLoading,
      cartReady,
      cartError,
      cartNotice,
      isInWishlist: (productId: number) => wishlist.some((item) => item.id === productId),
      isInCart: (productId: number) => cart.some((item) => item.id === productId),
      toggleWishlist,
      addToCart,
      addConfiguredToCart,
      removeFromWishlist,
      removeFromCart,
      updateQuantity,
      clearCart,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      subtotal,
      discount,
      total,
    }),
    [wishlist, cart, appliedCoupon, subtotal, discount, total, applyCoupon, cartLoading, cartReady, cartError, cartNotice, addToCart, addConfiguredToCart, removeFromCart, updateQuantity, removeFromWishlist, clearCart, toggleWishlist]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
