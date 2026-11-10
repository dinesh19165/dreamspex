import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';
import { getCartItemKey } from '../utils/cart';
import { formatINR } from '../utils/currency';
import { useAuth } from '../context/useAuth';
import { addressService, type CustomerAddress, type CustomerAddressRequest } from '../services/addressService';
import { orderService, OrderApiError, type CheckoutQuoteResponse } from '../services/orderService';
import {
  LoyaltyApiError,
  loyaltyService,
  parseLoyaltyPointsInput,
  validateLoyaltyRedemption,
  type LoyaltySettings,
  type RedemptionPreview,
} from '../services/loyaltyService';
import { paymentService } from '../services/paymentService';
import CustomerLocationPicker from '../components/addresses/CustomerLocationPicker';
import { isValidCoordinates, normalizeCoordinates, type Coordinates } from '../utils/deliveryNavigation';
import { addressChanged } from '../utils/checkoutAddress';
import { mergeReverseGeocodedAddress, reverseGeocodeCoordinates } from '../services/reverseGeocodeService';
import GstBreakdown from '../components/ui/GstBreakdown';
import { toGstBreakdown } from '../utils/gst';

const NEW_ADDRESS_VALUE = '__new_address__';

function emptyAddressDraft(): CustomerAddressRequest {
  return {
    label: '', recipientName: '', phone: '', line1: '', line2: '', city: '', state: '',
    postalCode: '', countryCode: 'IN', defaultAddress: false, latitude: null, longitude: null,
  };
}

function addressDraftFrom(address: CustomerAddress): CustomerAddressRequest {
  return {
    label: address.label ?? '',
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    defaultAddress: address.defaultAddress,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { cart, cartLoading, appliedCoupon, applyCoupon, removeCoupon, subtotal, discount } = useShop();
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [addressDraft, setAddressDraft] = useState<CustomerAddressRequest>(emptyAddressDraft);
  const [locationDraft, setLocationDraft] = useState<Coordinates | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [shippingOption, setShippingOption] = useState('standard');
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [loyaltyAvailablePoints, setLoyaltyAvailablePoints] = useState<number | null>(null);
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState('');
  const [redemptionPreview, setRedemptionPreview] = useState<{
    value: RedemptionPreview;
    eligibleAmount: number;
  } | null>(null);
  const [redemptionPreviewError, setRedemptionPreviewError] = useState('');
  const [redemptionPreviewLoading, setRedemptionPreviewLoading] = useState(false);
  const [redemptionPreviewRetry, setRedemptionPreviewRetry] = useState(0);
  const [loyaltySettingsError, setLoyaltySettingsError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const checkoutGst = toGstBreakdown(checkoutQuote?.gstSnapshot);

  useEffect(() => {
    if (!user?.accessToken) return;
    addressService.list(user.accessToken).then((items) => {
      setAddresses(items);
      const selected = items.find((item) => item.defaultAddress) ?? items[0];
      setAddressId(selected?.id ?? '');
      if (selected) {
        setAddressDraft(addressDraftFrom(selected));
      } else {
        setAddressDraft(emptyAddressDraft());
      }
    }).catch(() => setPaymentError('Unable to load your saved addresses.'));
  }, [user?.accessToken]);

  const selectedAddress = addresses.find((address) => address.id === addressId) ?? null;
  const savedAddressCoordinates = useMemo(
    () => normalizeCoordinates(selectedAddress),
    [selectedAddress],
  );

  useEffect(() => {
    if (!user?.accessToken) {
      setLoyaltySettings(null);
      setLoyaltyAvailablePoints(null);
      setLoyaltySettingsError('');
      return;
    }

    let active = true;
    setLoyaltySettingsError('');
    const loadLoyaltySettings = async () => {
      try {
        let token = user.accessToken!;
        try {
          const dashboard = await loyaltyService.dashboard(token);
          if (active) {
            setLoyaltySettings(dashboard.settings);
            setLoyaltyAvailablePoints(dashboard.availablePoints);
          }
        } catch (reason) {
          if (!(reason instanceof LoyaltyApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
          const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
          token = stored.accessToken ?? token;
          const dashboard = await loyaltyService.dashboard(token);
          if (active) {
            setLoyaltySettings(dashboard.settings);
            setLoyaltyAvailablePoints(dashboard.availablePoints);
          }
        }
      } catch (reason) {
        if (active) setLoyaltySettingsError(reason instanceof Error ? reason.message : 'Unable to load loyalty settings.');
      }
    };

    void loadLoyaltySettings();
    return () => { active = false; };
  }, [refreshSession, user?.accessToken]);
  const selectedLocationIsSaved = selectedAddress !== null
    && !addressChanged(selectedAddress, addressDraft, locationDraft ?? savedAddressCoordinates);

  useEffect(() => {
    setAddressDraft(selectedAddress ? addressDraftFrom(selectedAddress) : emptyAddressDraft());
    setLocationDraft(selectedAddress?.latitude != null && selectedAddress.longitude != null
      ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
      : null);
    setLocationError('');
    setLocationNotice('');
  }, [addressId, addresses, selectedAddress, selectedAddress?.latitude, selectedAddress?.longitude]);

  const selectAddress = (id: string) => {
    setAddressId(id);
    setCheckoutQuote(null);
  };

  const updateAddressField = (field: Exclude<keyof CustomerAddressRequest, 'defaultAddress' | 'latitude' | 'longitude'>, value: string) => {
    setAddressDraft((current) => ({ ...current, [field]: value }));
    setCheckoutQuote(null);
    setLocationError('');
    setLocationNotice('');
  };

  const handleCurrentLocation = async (coordinates: Coordinates) => {
    setReverseGeocoding(true);
    setLocationError('');
    setLocationNotice('');
    try {
      const found = await reverseGeocodeCoordinates(coordinates);
      setAddressDraft((current) => mergeReverseGeocodedAddress(current, found));
      setLocationNotice('Location selected. Review and edit the address details before saving.');
    } catch (reason) {
      setLocationError(reason instanceof Error
        ? `${reason.message} Coordinates are selected; enter or edit the address manually.`
        : 'Address lookup failed. Coordinates are selected; enter or edit the address manually.');
    } finally {
      setReverseGeocoding(false);
    }
  };

  const saveDeliveryLocation = async () => {
    if (!user?.accessToken) {
      setLocationError('Your session has expired. Please sign in again.');
      return;
    }
    if (['recipientName', 'phone', 'line1', 'city', 'state', 'postalCode', 'countryCode']
      .some((field) => !String(addressDraft[field as keyof CustomerAddressRequest]).trim())) {
      setLocationError('Enter the recipient, phone, street address, city, state, postal code, and country code.');
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(addressDraft.phone)) {
      setLocationError('Phone must use international format, for example +919876543210.');
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(addressDraft.countryCode)) {
      setLocationError('Country code must be two letters.');
      return;
    }
    const coordinatesToSave = locationDraft ?? savedAddressCoordinates;
    if (coordinatesToSave && !isValidCoordinates(coordinatesToSave.latitude, coordinatesToSave.longitude)) {
      setLocationError('The selected map coordinates are invalid. Choose another location or clear the pin.');
      return;
    }
    if (selectedAddress?.defaultAddress && addressChanged(selectedAddress, addressDraft, coordinatesToSave)
      && !window.confirm('This will update your saved default delivery address and its location. Continue?')) return;

    setLocationSaving(true);
    setLocationError('');
    setLocationNotice('');
    try {
      let accessToken = user.accessToken;
      const payload: CustomerAddressRequest = {
        ...addressDraft,
        label: addressDraft.label.trim(),
        recipientName: addressDraft.recipientName.trim(),
        phone: addressDraft.phone.trim(),
        line1: addressDraft.line1.trim(),
        line2: addressDraft.line2.trim(),
        city: addressDraft.city.trim(),
        state: addressDraft.state.trim(),
        postalCode: addressDraft.postalCode.trim(),
        countryCode: addressDraft.countryCode.trim().toUpperCase(),
        defaultAddress: selectedAddress ? selectedAddress.defaultAddress : addresses.length === 0,
        latitude: coordinatesToSave?.latitude ?? null,
        longitude: coordinatesToSave?.longitude ?? null,
      };
      const save = () => selectedAddress
        ? addressService.update(accessToken, selectedAddress.id, payload)
        : addressService.create(accessToken, payload);
      let updated: CustomerAddress;
      try {
        updated = await save();
      } catch (reason) {
        if (!(reason instanceof Error) || !reason.message.includes('401') || !(await refreshSession())) throw reason;
        const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        updated = await save();
      }
      setAddresses((current) => current.some((address) => address.id === updated.id)
        ? current.map((address) => address.id === updated.id ? updated : address)
        : [updated, ...current]);
      setAddressId(updated.id);
      setAddressDraft(addressDraftFrom(updated));
      setCheckoutQuote(null);
      setLocationDraft(updated.latitude !== null && updated.longitude !== null
        ? { latitude: updated.latitude, longitude: updated.longitude }
        : null);
      setLocationNotice('Delivery address and location saved.');
    } catch (reason) {
      setLocationError(reason instanceof Error ? reason.message : 'Unable to save the delivery location.');
    } finally {
      setLocationSaving(false);
    }
  };

  useEffect(() => {
    if (!user?.accessToken || !addressId || !selectedLocationIsSaved || cartLoading || cart.length === 0) {
      setCheckoutQuote(null);
      setQuoteLoading(false);
      setQuoteError('');
      return;
    }

    let active = true;
    setCheckoutQuote(null);
    setQuoteLoading(true);
    setQuoteError('');

    const loadQuote = async () => {
      try {
        let accessToken = user.accessToken!;
        try {
          const quote = await orderService.quote(accessToken, addressId, appliedCoupon?.code ?? null);
          if (active) setCheckoutQuote(quote);
        } catch (reason) {
          if (!(reason instanceof OrderApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
          const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
          accessToken = stored.accessToken ?? accessToken;
          const quote = await orderService.quote(accessToken, addressId, appliedCoupon?.code ?? null);
          if (active) setCheckoutQuote(quote);
        }
      } catch (reason) {
        if (active) setQuoteError(reason instanceof Error ? reason.message : 'Unable to calculate checkout total.');
      } finally {
        if (active) setQuoteLoading(false);
      }
    };

    void loadQuote();
    return () => { active = false; };
  }, [addressDraft, addressId, appliedCoupon?.code, cart, cart.length, cartLoading, locationDraft, refreshSession, savedAddressCoordinates, selectedAddress, selectedLocationIsSaved, shippingOption, user?.accessToken]);

  const parsedLoyaltyPoints = parseLoyaltyPointsInput(loyaltyPointsInput);
  const availableLoyaltyPoints = loyaltyAvailablePoints ?? checkoutQuote?.loyaltyPointsAvailable ?? 0;
  const maximumRedeemablePoints = checkoutQuote?.loyaltyPointsMaxRedeemable ?? 0;
  const baseOrderTotal = checkoutQuote?.total ?? 0;
  const loyaltyValidation = validateLoyaltyRedemption(
    loyaltyPointsInput,
    loyaltySettings,
    availableLoyaltyPoints,
    maximumRedeemablePoints,
    baseOrderTotal,
  );
  const currentRedemptionPreview = parsedLoyaltyPoints && redemptionPreview?.value.requestedPoints === parsedLoyaltyPoints
    && redemptionPreview.eligibleAmount === baseOrderTotal
    ? redemptionPreview.value
    : null;
  const loyaltyDiscount = currentRedemptionPreview?.discount ?? loyaltyValidation.discount;
  const payableTotal = Math.max(0, baseOrderTotal - loyaltyDiscount);

  useEffect(() => {
    const points = parseLoyaltyPointsInput(loyaltyPointsInput);
    if (!points || loyaltyValidation.error || !checkoutQuote || !user?.accessToken) {
      setRedemptionPreview(null);
      setRedemptionPreviewError('');
      setRedemptionPreviewLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setRedemptionPreviewLoading(true);
      setRedemptionPreviewError('');
      try {
        let token = user.accessToken!;
        let preview: RedemptionPreview;
        try {
          preview = await loyaltyService.previewRedemption(token, points, baseOrderTotal);
        } catch (reason) {
          if (!(reason instanceof LoyaltyApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
          const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
          token = stored.accessToken ?? token;
          preview = await loyaltyService.previewRedemption(token, points, baseOrderTotal);
        }
        if (active) setRedemptionPreview({ value: preview, eligibleAmount: baseOrderTotal });
      } catch (reason) {
        if (active) {
          setRedemptionPreview(null);
          setRedemptionPreviewError(reason instanceof Error ? reason.message : 'Unable to validate loyalty redemption.');
        }
      } finally {
        if (active) setRedemptionPreviewLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [baseOrderTotal, checkoutQuote, loyaltyPointsInput, loyaltyValidation.error, redemptionPreviewRetry, refreshSession, user?.accessToken]);

  const handleApplyCoupon = async () => {
    setCouponLoading(true);
    setCouponError('');
    try {
      if (!await applyCoupon(couponCode)) setCouponError('Invalid coupon code or your cart does not meet its conditions.');
    } catch (reason) {
      setCouponError(reason instanceof Error ? reason.message : 'Coupon validation failed.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loyaltyValidation.error) {
      setPaymentError(loyaltyValidation.error);
      return;
    }
    if (loyaltyValidation.points > 0
      && (redemptionPreviewLoading || redemptionPreviewError || !currentRedemptionPreview)) {
      setPaymentError(redemptionPreviewError || 'Wait for loyalty points to be validated before continuing.');
      return;
    }

    if (!checkoutQuote?.deliveryAvailability.available) {
      setPaymentError(checkoutQuote?.deliveryAvailability.message
        ?? 'Save your delivery address and select a valid map location before continuing.');
      return;
    }

    if (!user?.accessToken || !addressId || paymentLoading) return;
    setPaymentLoading(true);
    setPaymentError('');
    setPaymentState('');
    try {
      let accessToken = user.accessToken;
      const idempotencyKey = crypto.randomUUID();
      const createOrder = async () => orderService.create(
        accessToken,
        addressId,
        appliedCoupon?.code ?? null,
        idempotencyKey,
        loyaltyValidation.points,
      );
      let order;
      try { order = await createOrder(); } catch (reason) {
        if (!(reason instanceof Error) || !reason.message.includes('401') || !(await refreshSession())) throw reason;
        const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        order = await createOrder();
      }
      const intent = await paymentService.create(accessToken, order.id);
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.');
      const razorpay = new window.Razorpay({
        key: intent.keyId,
        amount: Math.round(intent.payment.amount * 100),
        currency: intent.payment.currency,
        name: 'Dream Spex',
        description: `Order ${order.orderNumber}`,
        order_id: intent.payment.providerOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await paymentService.verify(accessToken, order.id, {
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            navigate(`/orders/success?orderId=${encodeURIComponent(order.id)}`);
          } catch (reason) {
            setPaymentError(reason instanceof Error ? reason.message : 'Payment verification failed.');
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: { ondismiss: () => {
          void paymentService.failed(accessToken, order.id, { providerOrderId: intent.payment.providerOrderId })
            .catch(() => undefined);
          setPaymentState('Payment cancelled. Your order remains unpaid.');
          setPaymentLoading(false);
        } },
      });
      razorpay.open();
    } catch (reason) {
      setPaymentError(reason instanceof Error ? reason.message : 'Unable to start payment.');
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Secure checkout" title="Review delivery details" description="Pay securely using Razorpay test mode." />

        {cart.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Your bag is empty.</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Add a few signature frames to proceed through checkout.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Checkout preview</p>
                  <h2 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Review your delivery details</h2>
                </div>
                <Link to="/cart" className="text-sm font-semibold text-cyan-300">Back to cart</Link>
              </div>
              <form id="checkout-form" onSubmit={handleSubmit} className="mt-8 space-y-6">
                <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <span>Delivery address</span>
                  <select value={addressId || NEW_ADDRESS_VALUE} onChange={(event) => {
                    if (event.target.value === NEW_ADDRESS_VALUE) {
                      setAddressId('');
                      setAddressDraft(emptyAddressDraft());
                      setLocationDraft(null);
                      setCheckoutQuote(null);
                      setLocationError('');
                      setLocationNotice('');
                      return;
                    }
                    selectAddress(event.target.value);
                  }} className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    {addresses.map((address) => <option key={address.id} value={address.id}>
                      {address.label || address.recipientName}{address.defaultAddress ? ' · Default' : ''} · {address.city}
                    </option>)}
                    <option value={NEW_ADDRESS_VALUE}>{addresses.length ? 'Enter a new address' : 'Enter delivery address'}</option>
                  </select>
                </label>
                {selectedAddress ? <p className="rounded-xl bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
                  Selected {selectedAddress.defaultAddress ? 'default ' : ''}address: {selectedAddress.line1}
                  {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}
                  {savedAddressCoordinates
                    ? ` · Saved location ${savedAddressCoordinates.latitude.toFixed(6)}, ${savedAddressCoordinates.longitude.toFixed(6)}`
                    : ' · No saved GPS location'}
                </p> : <p className="text-sm text-[var(--text-secondary)]">Enter a new delivery address below. GPS is optional.</p>}
                <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <CustomerLocationPicker value={locationDraft} onChange={(coordinates) => {
                    setLocationDraft(coordinates);
                    setCheckoutQuote(null);
                    setLocationError('');
                    setLocationNotice('');
                  }} onCurrentLocation={(coordinates) => void handleCurrentLocation(coordinates)} />
                  {reverseGeocoding ? <p className="text-sm text-[var(--text-secondary)]" role="status">Looking up the address for your selected location…</p> : null}
                  <p className="text-xs text-[var(--text-secondary)]">Your browser location is requested only when you tap Use Current Location. Address lookup uses OpenStreetMap.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-[var(--text-secondary)]"><span>Address label</span><input value={addressDraft.label} onChange={(event) => updateAddressField('label', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Home" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>Recipient name</span><input required value={addressDraft.recipientName} onChange={(event) => updateAddressField('recipientName', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>Phone (international format)</span><input required value={addressDraft.phone} onChange={(event) => updateAddressField('phone', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="+919876543210" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>Street address</span><input required value={addressDraft.line1} onChange={(event) => updateAddressField('line1', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>Area / apartment / landmark</span><input value={addressDraft.line2} onChange={(event) => updateAddressField('line2', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>City</span><input required value={addressDraft.city} onChange={(event) => updateAddressField('city', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>State</span><input required value={addressDraft.state} onChange={(event) => updateAddressField('state', event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>PIN / postal code</span><input required value={addressDraft.postalCode} onChange={(event) => {
                      updateAddressField('postalCode', event.target.value);
                    }} inputMode="numeric" autoComplete="postal-code" className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" /></label>
                    <label className="text-sm text-[var(--text-secondary)]"><span>Country code</span><input required maxLength={2} value={addressDraft.countryCode} onChange={(event) => updateAddressField('countryCode', event.target.value.toUpperCase())} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm uppercase text-[var(--text-primary)]" /></label>
                  </div>
                  <button type="button" disabled={locationSaving || reverseGeocoding} onClick={() => void saveDeliveryLocation()}
                    className="rounded-full bg-[#7CBF00] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50">
                    {locationSaving ? 'Saving…' : selectedAddress ? 'Save address and location' : 'Save new address and location'}
                  </button>
                  {locationError ? <p className="text-sm text-rose-300" role="alert">{locationError}</p> : null}
                  {locationNotice ? <p className="text-sm text-emerald-300" role="status">{locationNotice}</p> : null}
                </section>

                <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4" aria-live="polite">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Delivery availability</p>
                  {quoteLoading ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Checking straight-line distance from an active store…</p>
                    : quoteError ? <p className="mt-2 text-sm text-rose-300" role="alert">{quoteError}</p>
                      : checkoutQuote ? <p className={`mt-2 text-sm ${checkoutQuote.deliveryAvailability.available ? 'text-emerald-300' : 'text-amber-300'}`} role="status">
                        {checkoutQuote.deliveryAvailability.message}
                        {checkoutQuote.deliveryAvailability.radiusKm !== null
                          ? <span className="block mt-1 text-xs text-[var(--text-secondary)]">
                            Delivery radius: {checkoutQuote.deliveryAvailability.radiusKm} km
                            {checkoutQuote.deliveryAvailability.storeName ? ` · ${checkoutQuote.deliveryAvailability.storeName}` : ''}
                          </span>
                          : null}
                      </p>
                        : selectedLocationIsSaved
                          ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Delivery availability is not available yet. Try again shortly.</p>
                          : <p className="mt-2 text-sm text-[var(--text-secondary)]">Save your address and select a valid map location to check delivery availability. PIN codes are not used to estimate distance.</p>}
                </div>

                {paymentError ? <p className="text-sm text-rose-300" role="alert">{paymentError}</p> : null}
                {paymentState ? <p className="text-sm text-amber-300" role="status">{paymentState}</p> : null}
                <button
                  type="submit"
                  disabled={!checkoutQuote?.deliveryAvailability.available || !addressId || paymentLoading || quoteLoading || !selectedLocationIsSaved
                    || Boolean(loyaltyValidation.error) || redemptionPreviewLoading || Boolean(redemptionPreviewError)
                    || (loyaltyValidation.points > 0 && !currentRedemptionPreview)}
                  className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paymentLoading ? 'Opening Razorpay...' : 'Pay securely with Razorpay'}
                </button>
              </form>
            </div>
            <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 text-[var(--text-secondary)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Order summary</p>
              <div className="mt-6 grid gap-4">
                {cart.map((item) => (
                  <div key={getCartItemKey(item)} className="grid gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-[auto_1fr] lg:items-center">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-[20px] object-cover" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{item.quantity} × {formatINR(item.price + (item.lensSelection?.additionalPrice ?? 0))}</p>
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">{item.category}</p>
                      {item.lensSelection ? <p className="mt-2 text-xs text-cyan-200">{item.lensSelection.type} · Prescription attached</p> : null}
                    </div>
                    <span className="self-center justify-self-end text-lg font-semibold text-[var(--text-primary)]">{formatINR((item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Loyalty points</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {availableLoyaltyPoints} points available
                    </p>
                  </div>
                  <button type="button" disabled={quoteLoading || !loyaltySettings || !loyaltySettings.enabled
                    || maximumRedeemablePoints < (loyaltySettings?.minimumRedemptionPoints ?? 1)}
                    onClick={() => {
                      setLoyaltyPointsInput(String(maximumRedeemablePoints));
                      setPaymentError('');
                    }}
                    className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50">
                    Use maximum
                  </button>
                </div>
                <label htmlFor="loyalty-points" className="mt-4 block text-xs text-[var(--text-secondary)]">Points to redeem</label>
                <input id="loyalty-points" type="text" inputMode="numeric" pattern="[0-9]*"
                  value={loyaltyPointsInput}
                  onChange={(event) => {
                    setLoyaltyPointsInput(event.target.value);
                    setPaymentError('');
                  }}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
                {loyaltyPointsInput ? <button type="button" onClick={() => {
                  setLoyaltyPointsInput('');
                  setPaymentError('');
                }} className="mt-2 text-xs text-cyan-200 underline">Remove points</button> : null}
                {loyaltyValidation.error ? <p className="mt-2 text-xs text-rose-300" role="alert">{loyaltyValidation.error}</p> : null}
                {loyaltySettingsError && loyaltyPointsInput ? <p className="mt-2 text-xs text-rose-300" role="alert">{loyaltySettingsError}</p> : null}
                {redemptionPreviewLoading ? <p className="mt-2 text-xs text-[var(--text-secondary)]" role="status">Validating points...</p> : null}
                {redemptionPreviewError ? <div className="mt-2 flex items-center justify-between gap-3 text-xs text-rose-300" role="alert">
                  <span>{redemptionPreviewError}</span>
                  <button type="button" onClick={() => setRedemptionPreviewRetry((attempt) => attempt + 1)} className="underline">Retry</button>
                </div> : null}
                {loyaltyValidation.points > 0 && !loyaltyValidation.error && loyaltyDiscount > 0
                  ? <p className="mt-2 text-xs text-emerald-300">
                    {currentRedemptionPreview ? 'Loyalty discount' : 'Estimated loyalty discount'}: {formatINR(loyaltyDiscount)}
                  </p> : null}
              </div>
              <div className="mt-6 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <label htmlFor="checkout-coupon" className="text-sm text-[var(--text-secondary)]">Have a coupon code?</label>
                <div className="mt-3 flex gap-2"><input id="checkout-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon} className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? 'Applying...' : 'Apply'}</button></div>
                {couponError ? <p className="mt-2 text-xs text-rose-300" role="alert">{couponError}</p> : null}
                {appliedCoupon ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cyan-200"><span>✓ Coupon {appliedCoupon.code} applied · You saved {formatINR(checkoutQuote?.discount ?? discount)}</span><button type="button" onClick={removeCoupon} className="text-cyan-300 underline">Remove</button></div> : null}
              </div>
              <div className="mt-6 grid gap-3 border-t border-[var(--border-subtle)] pt-5 text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal</span><span>{formatINR(checkoutQuote?.subtotal ?? subtotal)}</span></div>
                {checkoutQuote?.couponDiscount ? <div className="flex justify-between text-cyan-200"><span>{appliedCoupon?.code ?? 'Coupon'} discount</span><span>-{formatINR(checkoutQuote.couponDiscount)}</span></div> : null}
                {checkoutQuote?.membershipDiscount ? <div className="flex justify-between text-cyan-200"><span>Membership discount</span><span>-{formatINR(checkoutQuote.membershipDiscount)}</span></div> : null}
                {loyaltyDiscount > 0 ? <div className="flex justify-between text-emerald-300"><span>Loyalty points ({loyaltyValidation.points})</span><span>-{formatINR(loyaltyDiscount)}</span></div> : null}
                <div className="border-t border-[var(--border-subtle)] pt-3"><GstBreakdown breakdown={checkoutGst} /></div>
                <div className="flex justify-between text-[var(--text-secondary)]"><span>Shipping</span><span>{checkoutQuote ? checkoutQuote.shipping === 0 ? 'FREE' : formatINR(checkoutQuote.shipping) : quoteLoading ? 'Calculating...' : '—'}</span></div>
                <div className="flex justify-between border-t border-[var(--border-subtle)] pt-3 text-lg font-semibold text-[var(--text-primary)]"><span>Total</span><span>{checkoutQuote ? formatINR(payableTotal) : quoteLoading ? 'Calculating...' : '—'}</span></div>
                {quoteError ? <p className="text-xs text-rose-300" role="alert">{quoteError}</p> : null}
              </div>
              <div className="mt-6 grid gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <label className="text-sm text-[var(--text-secondary)]">
                  <span className="block text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Shipping option</span>
                  <select value={shippingOption} onChange={(event) => setShippingOption(event.target.value)} className="mt-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
                    <option value="standard">Standard delivery</option>
                    <option value="express">Express delivery</option>
                    <option value="priority">Priority member dispatch</option>
                  </select>
                </label>
                <label className="text-sm text-[var(--text-secondary)]">
                  <span className="block text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Payment method</span>
                  <select className="mt-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
                    <option>Credit card</option>
                    <option>Apple Pay</option>
                    <option>PayPal</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
                  <p className="text-sm text-[var(--text-secondary)]">Secure checkout with premium order protection.</p>
                </div>
              </div>
              <button type="submit" form="checkout-form" disabled={!checkoutQuote?.deliveryAvailability.available || !addressId || paymentLoading || quoteLoading || !selectedLocationIsSaved} className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{paymentLoading ? 'Opening Razorpay...' : 'Pay securely with Razorpay'}</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
