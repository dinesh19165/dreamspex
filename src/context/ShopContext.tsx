import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LensSelection, Prescription, Product } from '../types';
import { calculateCoupon, findCoupon, type CouponResult } from '../services/couponService';
import { getCartItemKey } from '../utils/cart';

export const DEMO_SERVICEABLE_PIN_CODES = new Set(['500001', '500032', '560001', '110001', '400001']);

export function validateDemoDeliveryPin(pin: string) {
  const normalizedPin = pin.replace(/\D/g, '').slice(0, 6);

  if (!/^\d{6}$/.test(normalizedPin)) {
    return {
      normalizedPin,
      isValid: false,
      message: 'Enter a valid 6-digit Indian PIN code.',
    };
  }

  if (!DEMO_SERVICEABLE_PIN_CODES.has(normalizedPin)) {
    return {
      normalizedPin,
      isValid: false,
      message: 'Delivery is not available for this PIN code yet. Please try another serviceable area.',
    };
  }

  return {
    normalizedPin,
    isValid: true,
    message: 'Delivery available for this PIN code.',
  };
}

export type CartItem = Product & { quantity: number; configuredId?: string; prescription?: Prescription; lensSelection?: LensSelection };

type ShopContextValue = {
  wishlist: Product[];
  cart: CartItem[];
  deliveryPin: string;
  isDeliveryPinValidated: boolean;
  setDeliveryPin: (pin: string) => void;
  validateDeliveryPin: (pin: string) => { normalizedPin: string; isValid: boolean; message: string };
  clearDeliveryPin: () => void;
  isInWishlist: (productId: number) => boolean;
  isInCart: (productId: number) => boolean;
  toggleWishlist: (product: Product) => void;
  addToCart: (product: Product) => void;
  addConfiguredToCart: (product: Product, prescription: Prescription, lensSelection: LensSelection) => void;
  removeFromWishlist: (productId: number) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: CouponResult | null;
  applyCoupon: (code: string) => CouponResult | null;
  removeCoupon: () => void;
  subtotal: number;
  discount: number;
  total: number;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
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
  const [deliveryPin, setDeliveryPinState] = useState<string>(() => {
    try {
      return localStorage.getItem('dream-spex-delivery-pin') ?? '';
    } catch {
      return '';
    }
  });
  const [isDeliveryPinValidated, setIsDeliveryPinValidated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dream-spex-delivery-pin-validated') === 'true';
    } catch {
      return false;
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(() => {
    try {
      const savedCode = localStorage.getItem('dream-spex-coupon');
      return savedCode ? calculateCoupon(savedCode, 0) : null;
    } catch {
      return null;
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity, 0);
  const recalculatedCoupon = appliedCoupon ? calculateCoupon(appliedCoupon.code, subtotal) : null;
  const discount = recalculatedCoupon?.discountAmount ?? 0;
  const total = subtotal - discount;

  useEffect(() => {
    localStorage.setItem('dream-spex-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('dream-spex-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (deliveryPin) localStorage.setItem('dream-spex-delivery-pin', deliveryPin);
    else localStorage.removeItem('dream-spex-delivery-pin');
  }, [deliveryPin]);

  useEffect(() => {
    if (isDeliveryPinValidated) localStorage.setItem('dream-spex-delivery-pin-validated', 'true');
    else localStorage.removeItem('dream-spex-delivery-pin-validated');
  }, [isDeliveryPinValidated]);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem('dream-spex-coupon', appliedCoupon.code);
    else localStorage.removeItem('dream-spex-coupon');
  }, [appliedCoupon]);

  const setDeliveryPin = useCallback((value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(0, 6);
    setDeliveryPinState(nextValue);
    setIsDeliveryPinValidated(false);
  }, []);

  const validateDeliveryPin = useCallback((value: string) => {
    const result = validateDemoDeliveryPin(value);
    setDeliveryPinState(result.normalizedPin);
    setIsDeliveryPinValidated(result.isValid);
    return result;
  }, []);

  const clearDeliveryPin = useCallback(() => {
    setDeliveryPinState('');
    setIsDeliveryPinValidated(false);
  }, []);

  const toggleWishlist = (product: Product) => {
    setWishlist((current) => {
      const exists = current.some((item) => item.id === product.id);
      return exists ? current.filter((item) => item.id !== product.id) : [...current, product];
    });
  };

  const addToCart = (product: Product) => {
    setCart((current) => {
      const itemKey = `product-${product.id}`;
      const existing = current.find((item) => getCartItemKey(item) === itemKey);
      if (existing) {
        return current.map((item) => (getCartItemKey(item) === itemKey ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1, configuredId: itemKey }];
    });
  };

  const addConfiguredToCart = (product: Product, prescription: Prescription, lensSelection: LensSelection) => {
    const configuredId = `configured-${product.id}-${encodeURIComponent(JSON.stringify({ prescription, lensSelection }))}`;
    setCart((current) => {
      const existing = current.find((item) => getCartItemKey(item) === configuredId);
      if (existing) return current.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { ...product, quantity: 1, prescription, lensSelection, configuredId }];
    });
  };

  const removeFromWishlist = (productId: number) => {
    setWishlist((current) => current.filter((item) => item.id !== productId));
  };

  const removeFromCart = (itemKey: string) => {
    setCart((current) => current.filter((item) => getCartItemKey(item) !== itemKey));
  };

  const updateQuantity = (itemKey: string, quantity: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (getCartItemKey(item) !== itemKey) {
          return [item];
        }
        return quantity > 0 ? [{ ...item, quantity }] : [];
      })
    );
  };

  const clearCart = () => setCart([]);
  const applyCoupon = useCallback((code: string) => {
    const result = findCoupon(code) ? calculateCoupon(code, subtotal) : null;
    if (result) setAppliedCoupon(result);
    return result;
  }, [subtotal]);
  const removeCoupon = () => setAppliedCoupon(null);

  const value = useMemo<ShopContextValue>(
    () => ({
      wishlist,
      cart,
      deliveryPin,
      isDeliveryPinValidated,
      setDeliveryPin,
      validateDeliveryPin,
      clearDeliveryPin,
      isInWishlist: (productId: number) => wishlist.some((item) => item.id === productId),
      isInCart: (productId: number) => cart.some((item) => item.id === productId),
      toggleWishlist,
      addToCart,
      addConfiguredToCart,
      removeFromWishlist,
      removeFromCart,
      updateQuantity,
      clearCart,
      appliedCoupon: recalculatedCoupon,
      applyCoupon,
      removeCoupon,
      subtotal,
      discount,
      total,
    }),
    [wishlist, cart, deliveryPin, isDeliveryPinValidated, setDeliveryPin, validateDeliveryPin, clearDeliveryPin, recalculatedCoupon, subtotal, discount, total, applyCoupon]
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
