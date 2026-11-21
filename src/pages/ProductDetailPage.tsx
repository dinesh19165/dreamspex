import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Glasses, Heart, Minus, Plus, ShieldCheck, Star, Truck, X, ZoomIn } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { catalogService, toProduct, type CatalogProduct } from '../services/catalogService';
import { formatINR } from '../utils/currency';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { productGstInformation } from '../utils/gst';
import { getDiscountPercentage } from '../utils/pricing';
import { getPrimaryGalleryImageIndex, getProductGalleryImages, getSwipeGalleryIndex } from '../utils/productGallery';
import { useAuth } from '../context/useAuth';
import { readPendingProductAction, savePendingProductAction, takePendingProductAction } from '../utils/pendingProductAction';
import { reviewService, type ProductReviewFeed } from '../services/reviewService';
import ProductCard from '../components/ui/ProductCard';
import type { Product } from '../types';
import { useFranchiseLocation } from '../context/FranchiseLocationContext';
import { getColorSwatch } from '../utils/colorSwatches';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const { selectedLocationId } = useFranchiseLocation();
  const { cart, cartLoading: sharedCartLoading, cartReady, toggleWishlist, isInWishlist, addToCart } = useShop();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const [cartLoading, setCartLoading] = useState(false);
  const [catalogProduct, setCatalogProduct] = useState<CatalogProduct | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [reviewFeed, setReviewFeed] = useState<ProductReviewFeed | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedError, setRelatedError] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const cartTimerRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (cartTimerRef.current) window.clearTimeout(cartTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (!imageZoomOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImageZoomOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [imageZoomOpen]);
  useEffect(() => {
    if (!id) return;
    setCatalogProduct(null);
    setCatalogError('');
    catalogService.get(id, selectedLocationId || undefined).then((value) => {
      setCatalogProduct(value);
      setQuantity(1);
      setSelectedImageIndex(getPrimaryGalleryImageIndex(getProductGalleryImages(value.images, value.imageUrl ?? '')));
      const pendingAction = readPendingProductAction();
      const pendingVariant = pendingAction?.productId === value.id
        ? value.variants.find((variant) => variant.id === pendingAction.variantId
          && variant.status.toUpperCase() === 'ACTIVE' && variant.availableQuantity > 0)
        : undefined;
      setSelectedVariantId(pendingVariant?.id
        ?? value.variants.find((variant) => variant.status.toUpperCase() === 'ACTIVE' && variant.availableQuantity > 0)?.id
        ?? value.variants.find((variant) => variant.status.toUpperCase() === 'ACTIVE')?.id
        ?? value.variants[0]?.id
        ?? '');
    }).catch((reason) => setCatalogError(reason instanceof Error ? reason.message : 'Unable to load this product.'));
  }, [id, selectedLocationId]);

  useEffect(() => {
    if (!catalogProduct) return;
    let active = true;
    setRelatedProducts([]);
    setRelatedError('');
    const category = catalogProduct.categories[0]?.slug;
    const params = new URLSearchParams({ page: '0', pageSize: '8', sort: 'newest' });
    if (selectedLocationId) params.set('franchiseId', selectedLocationId);
    if (category) params.set('category', category);
    else params.set('brand', catalogProduct.brand);
    catalogService.search(params).then((result) => {
      if (active) setRelatedProducts(result.items
        .filter((item) => item.id !== catalogProduct.id)
        .slice(0, 4)
        .map(toProduct));
    }).catch((reason) => {
      if (active) setRelatedError(reason instanceof Error ? reason.message : 'Unable to load related products.');
    });
    return () => { active = false; };
  }, [catalogProduct, selectedLocationId]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setReviewFeed(null);
    setReviewError('');
    reviewService.product(id).then((value) => {
      if (active) setReviewFeed(value);
    }).catch((reason) => {
      if (active) setReviewError(reason instanceof Error ? reason.message : 'Unable to load product reviews.');
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!catalogProduct || role !== 'CUSTOMER' || !cartReady || sharedCartLoading) return;
    const pendingAction = takePendingProductAction(catalogProduct.id);
    if (!pendingAction) return;

    const variant = catalogProduct.variants.find((item) => item.id === pendingAction.variantId
      && item.status.toUpperCase() === 'ACTIVE' && item.availableQuantity >= pendingAction.quantity);
    if (!variant) {
      setCartError('The selected product option is no longer available. Please choose another option.');
      return;
    }

    setCartLoading(true);
    setCartError('');
    const productWithVariant = { ...toProduct(catalogProduct), variantId: variant.id };
    const alreadyInCart = cart.some((item) => item.backendVariantId === variant.id);
    void (async () => {
      try {
        if (!alreadyInCart) await addToCart(productWithVariant, pendingAction.quantity);
        navigate(pendingAction.action === 'BUY_NOW' ? '/checkout' : '/cart', { replace: true });
      } catch (reason) {
        setCartError(reason instanceof Error ? reason.message : 'Unable to add this product to your cart.');
      } finally {
        setCartLoading(false);
      }
    })();
  }, [addToCart, cart, cartReady, catalogProduct, navigate, role, sharedCartLoading]);
  const product = catalogProduct ? toProduct(catalogProduct) : null;
  if (catalogError) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-24 text-center"><p className="text-sm text-red-600" role="alert">{catalogError}</p><Link to="/shop" className="mt-6 inline-flex rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold">Back to shop</Link></main><Footer /></div>;
  if (!product || !catalogProduct) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-24 text-center"><p className="text-sm text-[var(--text-secondary)]">Loading product...</p></main><Footer /></div>;

  const ratingSummary = reviewFeed?.summary ?? catalogProduct.ratingSummary;
  const supportsPrescription = product.category !== 'Contact Lenses';
  const galleryImages = getProductGalleryImages(catalogProduct.images, product.image);
  const selectedImage = galleryImages[selectedImageIndex] ?? galleryImages[0];
  const changeImage = (index: number) => {
    if (!galleryImages.length) return;
    setSelectedImageIndex((index + galleryImages.length) % galleryImages.length);
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    changeImage(getSwipeGalleryIndex(selectedImageIndex, galleryImages.length, deltaX));
  };
  const isWishlisted = isInWishlist(product.id);
  const selectedVariant = catalogProduct.variants.find((variant) => variant.id === selectedVariantId);
  const colorOptions = [...new Set(catalogProduct.variants.map((variant) => variant.color).filter((color): color is string => Boolean(color)))];
  const sizeOptions = [...new Set(catalogProduct.variants.map((variant) => variant.size).filter((size): size is string => Boolean(size)))];
  const lensTypeOptions = [...new Set(catalogProduct.variants.map((variant) => variant.lensType).filter((lensType): lensType is string => Boolean(lensType)))];
  const isAvailableVariant = (variant: typeof selectedVariant) => Boolean(
    variant && variant.status.toUpperCase() === 'ACTIVE' && variant.availableQuantity > 0,
  );
  const selectVariantOption = (key: 'color' | 'size' | 'lensType', value: string) => {
    const currentVariant = selectedVariant;
    const candidates = catalogProduct.variants.filter((variant) => variant[key] === value && isAvailableVariant(variant));
    const optionKeys = ['color', 'size', 'lensType'] as const;
    const nextVariant = candidates.find((variant) => optionKeys.every((optionKey) =>
      optionKey === key || variant[optionKey] === currentVariant?.[optionKey]))
      ?? candidates[0];
    if (nextVariant) {
      setSelectedVariantId(nextVariant.id);
      setQuantity(1);
    }
  };
  const unavailable = !selectedVariant
    || selectedVariant.status.toUpperCase() !== 'ACTIVE'
    || selectedVariant.availableQuantity < 1;
  const selectedVariantPrice = product.price + (selectedVariant?.additionalPrice ?? 0);
  const selectedVariantOldPrice = product.oldPrice == null
    ? undefined
    : product.oldPrice + (selectedVariant?.additionalPrice ?? 0);

  const productForCart = { ...product, variantId: selectedVariant?.id };
  const requireCustomer = (action: 'ADD_TO_CART' | 'BUY_NOW') => {
    if (role === 'CUSTOMER') return false;
    if (selectedVariant) {
      savePendingProductAction({
        productId: catalogProduct.id,
        variantId: selectedVariant.id,
        action,
        quantity,
        returnPath: location.pathname,
      });
    }
    navigate('/login', {
      state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } },
    });
    return true;
  };
  const handleBuyNow = async () => {
    if (unavailable) return;
    if (requireCustomer('BUY_NOW')) return;
    if (!cart.some((item) => item.backendVariantId === selectedVariant?.id)) {
      setCartLoading(true);
      setCartError('');
      try {
        await addToCart(productForCart, quantity);
      } catch (reason) {
        setCartError(reason instanceof Error ? reason.message : 'Unable to add this product to your cart.');
        setCartLoading(false);
        return;
      }
      setCartLoading(false);
    }
    navigate('/checkout');
  };

  const handleAddToCart = async () => {
    if (unavailable) return;
    if (requireCustomer('ADD_TO_CART')) return;
    if (cart.some((item) => item.backendVariantId === selectedVariant?.id)) return;
    setCartLoading(true);
    setCartError('');
    try {
      await addToCart(productForCart, quantity);
    } catch (reason) {
      setCartError(reason instanceof Error ? reason.message : 'Unable to add this product to your cart.');
      setCartLoading(false);
      return;
    }
    setCartLoading(false);
    setAddedToCart(true);
    if (cartTimerRef.current) window.clearTimeout(cartTimerRef.current);
    cartTimerRef.current = window.setTimeout(() => setAddedToCart(false), 1400);
  };

  const discountPercentage = getDiscountPercentage(selectedVariantPrice, selectedVariantOldPrice);
  const productDetails = [
    { label: 'Brand', value: product.brand },
    { label: 'SKU', value: selectedVariant?.sku || catalogProduct.sku },
    { label: 'Category', value: product.category },
    ...(product.gender ? [{ label: 'Audience', value: product.gender }] : []),
  ];
  const frameDetails = [
    { label: 'Material', value: product.material },
    { label: 'Shape', value: product.frameShape },
    { label: 'Frame type', value: product.frameType },
  ].filter((detail) => Boolean(detail.value));
  const actionButtonBase = 'h-auto min-h-10 rounded-full px-2 py-2 text-xs font-semibold leading-tight transition-all duration-200 sm:min-h-11 sm:px-3 sm:text-sm';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link to="/shop" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--brand-green-dark)]">
          <ChevronLeft className="h-4 w-4" /> Back to eyewear
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} aria-label="Product image gallery">
            <div className="relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-white p-1 sm:p-3 lg:aspect-[5/4]"
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {selectedImage ? <img src={selectedImage.imageUrl} alt={selectedImage.altText || product.name} fetchPriority="high"
                className="h-full w-full cursor-zoom-in object-contain transition-transform duration-500 hover:scale-[1.025]"
                onClick={() => setImageZoomOpen(true)} /> : null}
              {galleryImages.length > 1 ? <>
                <button type="button" aria-label="Previous product image" onClick={() => changeImage(selectedImageIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-white/95 p-2.5 text-[var(--text-primary)] shadow-sm transition hover:bg-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next product image" onClick={() => changeImage(selectedImageIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-white/95 p-2.5 text-[var(--text-primary)] shadow-sm transition hover:bg-white">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </> : null}
              {selectedImage ? <button type="button" aria-label="Zoom product image" onClick={() => setImageZoomOpen(true)}
                className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white/95 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-white">
                <ZoomIn className="h-4 w-4" /> View larger
              </button> : null}
            </div>
            {galleryImages.length > 1 ? <div className="mt-4 flex justify-center gap-3 overflow-x-auto pb-1" aria-label="Product images">
              {galleryImages.map((image, index) => <button key={image.id} type="button"
                aria-label={`View product image ${index + 1}`} aria-pressed={index === selectedImageIndex}
                onClick={() => changeImage(index)}
                className={`h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1.5 transition ${index === selectedImageIndex ? 'border-[var(--brand-green)] shadow-[0_0_0_3px_rgba(120,190,32,0.12)]' : 'border-[var(--border-subtle)] hover:border-[var(--brand-green)]'}`}>
                <img src={image.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>)}
            </div> : null}
            <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">Swipe or use the arrows to view product images</p>
            <div className="mt-6 grid gap-6 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
              <article aria-labelledby="product-specifications">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">At a glance</p>
                <h2 id="product-specifications" className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Specifications</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {productDetails.map((detail) => <div key={detail.label} className="border-t border-[var(--border-subtle)] py-3">
                    <dt className="text-xs text-[var(--text-secondary)]">{detail.label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">{detail.value}</dd>
                  </div>)}
                </dl>
              </article>
              <article className="sm:border-l sm:border-[var(--border-subtle)] sm:pl-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">Fit &amp; finish</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Frame information</h2>
                {frameDetails.length ? <dl className="mt-4 grid grid-cols-2 gap-3">
                  {frameDetails.map((detail) => <div key={detail.label} className="border-t border-[var(--border-subtle)] py-3">
                    <dt className="text-xs text-[var(--text-secondary)]">{detail.label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">{detail.value}</dd>
                  </div>)}
                </dl> : null}
                {selectedVariant?.size ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Selected frame size: <strong className="text-[var(--text-primary)]">{selectedVariant.size}</strong></p> : null}
              </article>
            </div>
          </motion.section>

          <motion.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="min-w-0 lg:sticky lg:top-28">
            <section>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-green-dark)]">{product.brand}</p>
                <span className="text-[var(--border-subtle)]" aria-hidden="true">/</span>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">{product.category}</p>
                {catalogProduct.badge ? <span className="rounded-full bg-[var(--brand-green)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-green-dark)]">{catalogProduct.badge}</span> : null}
              </div>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-[2.4rem]">{product.name}</h1>
              <a href="#customer-reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--brand-green-dark)]"
                aria-label={`${ratingSummary.averageRating.toFixed(1)} out of 5 from ${ratingSummary.totalReviews} verified reviews`}>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <strong className="text-[var(--text-primary)]">{ratingSummary.averageRating.toFixed(1)}</strong>
                <span>{ratingSummary.totalReviews} verified reviews</span>
              </a>
            </section>

            <section className="mt-5 border-t border-[var(--border-subtle)] pt-5" aria-label="Pricing">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{formatINR(selectedVariantPrice)}</p>
                {selectedVariantOldPrice != null ? <p className="pb-1 text-base text-[var(--text-secondary)] line-through">{formatINR(selectedVariantOldPrice)}</p> : null}
                {discountPercentage != null ? <span className="mb-1 rounded-full bg-[var(--brand-green)]/12 px-3 py-1 text-xs font-bold tracking-wide text-[var(--brand-green-dark)]">{discountPercentage}% OFF</span> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Inclusive of applicable taxes</p>
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-xs leading-5 text-[var(--text-secondary)]" aria-label="Product GST information">{productGstInformation(catalogProduct)}</p>
                {catalogProduct.hsnCode ? <p className="mt-1 text-xs text-[var(--text-secondary)]">HSN {catalogProduct.hsnCode}</p> : null}
              </div>
            </section>

            <section className="mt-5 border-t border-[var(--border-subtle)] pt-5">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Choose your frame</h2>
              {colorOptions.length ? <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Frame colour</p>
                  {selectedVariant?.color ? <p className="text-xs text-[var(--text-secondary)]">{selectedVariant.color}</p> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {colorOptions.map((color) => {
                    const optionAvailable = catalogProduct.variants.some((variant) => variant.color === color && isAvailableVariant(variant));
                    const selected = selectedVariant?.color === color;
                    return <button key={color} type="button" aria-label={`${color}${optionAvailable ? '' : ', unavailable'}`}
                      aria-pressed={selected} disabled={!optionAvailable} title={color}
                      onClick={() => selectVariantOption('color', color)}
                      className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition ${selected ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/8 text-[var(--text-primary)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'} ${optionAvailable ? 'hover:border-[var(--brand-green)]' : 'cursor-not-allowed opacity-50'}`}>
                      <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: getColorSwatch(color) }} />
                      <span className="break-words">{color}</span>
                    </button>;
                  })}
                </div>
              </div> : null}
              {sizeOptions.length ? <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Frame size</p>
                  {selectedVariant?.size ? <p className="text-xs text-[var(--text-secondary)]">{selectedVariant.size}</p> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const optionAvailable = catalogProduct.variants.some((variant) => variant.size === size && isAvailableVariant(variant));
                    const selected = selectedVariant?.size === size;
                    return <button key={size} type="button" aria-pressed={selected} disabled={!optionAvailable}
                      onClick={() => selectVariantOption('size', size)}
                      className={`min-w-20 rounded-xl border px-3 py-2 text-sm transition ${selected ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/8 font-semibold text-[var(--text-primary)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'} ${optionAvailable ? 'hover:border-[var(--brand-green)]' : 'cursor-not-allowed opacity-50'}`}>
                      {size}
                    </button>;
                  })}
                </div>
              </div> : null}
              {lensTypeOptions.length ? <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">Lens type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lensTypeOptions.map((lensType) => {
                    const optionAvailable = catalogProduct.variants.some((variant) => variant.lensType === lensType && isAvailableVariant(variant));
                    const selected = selectedVariant?.lensType === lensType;
                    return <button key={lensType} type="button" aria-pressed={selected} disabled={!optionAvailable}
                      onClick={() => selectVariantOption('lensType', lensType)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${selected ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/8 font-semibold text-[var(--brand-green-dark)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'} ${optionAvailable ? 'hover:border-[var(--brand-green)]' : 'cursor-not-allowed opacity-50'}`}>
                      {lensType}
                    </button>;
                  })}
                </div>
              </div> : null}
              <p className="mt-4 text-xs text-[var(--text-secondary)]">SKU: {selectedVariant?.sku || catalogProduct.sku}</p>
            </section>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
              <p className="text-sm font-medium text-[var(--text-primary)]">Quantity</p>
              <div className="flex h-11 items-center rounded-full border border-[var(--border-subtle)] bg-white">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-full w-11 items-center justify-center text-[var(--text-primary)] disabled:opacity-40">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Increase quantity" disabled={Boolean(selectedVariant && quantity >= selectedVariant.availableQuantity)}
                  onClick={() => setQuantity((current) => Math.min(selectedVariant?.availableQuantity ?? 1, current + 1))}
                  className="flex h-full w-11 items-center justify-center text-[var(--text-primary)] disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
              <Button type="button" className={`${actionButtonBase} w-full min-w-0 rounded-full bg-[var(--brand-green)] text-[var(--text-primary)] hover:bg-[var(--brand-green-light)]`}
                onClick={handleAddToCart} disabled={unavailable || cartLoading || sharedCartLoading}>
                {unavailable ? 'Out of stock' : cartLoading ? 'Adding...' : addedToCart ? 'Added to Cart' : 'Add to Cart'}
              </Button>
              <Button type="button" className={`${actionButtonBase} w-full min-w-0 rounded-full bg-[var(--brand-black)] text-white hover:bg-[var(--brand-charcoal)]`}
                onClick={handleBuyNow} disabled={unavailable || cartLoading || sharedCartLoading}>Buy Now</Button>
              <Button type="button" variant="ghost"
                className={`${actionButtonBase} col-span-2 w-full border border-[var(--border-subtle)] ${isWishlisted ? 'border-[var(--brand-green)]/60 bg-[var(--brand-green)]/10 text-[var(--brand-green-dark)]' : ''}`}
                onClick={() => toggleWishlist(product)} aria-pressed={isWishlisted}>
                <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                {isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
              </Button>
            </div>

            {supportsPrescription ? <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Button variant="secondary" className={`${actionButtonBase} w-full`}
                onClick={() => navigate(`/virtual-try-on?productId=${encodeURIComponent(product.backendId ?? String(product.id))}`)}>
                <Glasses className="mr-2 h-4 w-4" /> Virtual Try-On
              </Button>
              <Button variant="secondary" className={`${actionButtonBase} w-full`}
                onClick={() => navigate(`/prescription/${catalogProduct.id}?variantId=${encodeURIComponent(selectedVariantId)}`)}>
                Add Prescription &amp; Choose Lenses
              </Button>
            </div> : null}

            {unavailable ? <p role="status" className="text-sm font-medium text-[var(--text-secondary)]">{selectedVariant ? 'This variant is currently unavailable. Choose another option.' : 'No active variant is currently available for this product.'}</p> : null}
            {addedToCart ? <p role="status" className="text-sm font-medium text-[var(--brand-green-dark)]">{product.name} was added to your cart.</p> : null}
            {cartError ? <p role="alert" className="text-sm font-medium text-red-600">{cartError}</p> : null}

            <div className="mt-5 grid gap-4 border-t border-[var(--border-subtle)] pt-5 min-[480px]:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><ShieldCheck className="h-4 w-4 text-[var(--brand-green-dark)]" /> Product availability</div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{unavailable ? 'Unavailable' : `${selectedVariant?.availableQuantity ?? 0} available`}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"><Truck className="h-4 w-4 text-[var(--brand-green-dark)]" /> Delivery details</div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Options are confirmed during checkout.</p>
              </div>
            </div>
            <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs leading-5 text-[var(--text-secondary)]">
              Delivery availability is calculated at checkout from your saved map location and the nearest configured store. PIN codes are not used to estimate delivery distance.
            </p>
          </motion.aside>
        </div>

        <section className="mt-10 grid gap-8 border-t border-[var(--border-subtle)] pt-8 md:grid-cols-2" aria-label="Product information">
          <article id="product-details" className="md:border-r md:border-[var(--border-subtle)] md:pr-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">About this frame</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Product details</h2>
            {product.description ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--text-secondary)]">{product.description}</p> : null}
          </article>
          <article>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">Personalise your vision</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Lens information</h2>
            {lensTypeOptions.length ? <>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Lens types available for this product:</p>
              <div className="mt-3 flex flex-wrap gap-2">{lensTypeOptions.map((lensType) =>
                <span key={lensType} className="rounded-full bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">{lensType}</span>)}</div>
            </> : <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Lens choices are available in the guided prescription flow.</p>}
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Available coatings and lens materials are shown in the existing prescription flow for your selection.</p>
            {supportsPrescription ? <Link to={`/prescription/${catalogProduct.id}?variantId=${encodeURIComponent(selectedVariantId)}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-green)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--brand-green-light)]">
              Choose lenses <ArrowRight className="h-4 w-4" />
            </Link> : null}
          </article>
        </section>

        <section id="customer-reviews" className="mt-12 border-t border-[var(--border-subtle)] pt-8" aria-labelledby="customer-reviews-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-green-dark)]">Verified purchases</p>
              <h2 id="customer-reviews-heading" className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Customer reviews</h2>
            </div>
            <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong className="text-[var(--text-primary)]">{ratingSummary.averageRating.toFixed(1)}</strong> average · {ratingSummary.totalReviews} verified reviews</p>
          </div>
          {reviewError ? <p className="mt-5 text-sm text-red-600" role="alert">{reviewError}</p>
            : !reviewFeed ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading verified reviews...</p>
              : <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(220px,.7fr)_1.3fr]">
                <aside className="border-b border-[var(--border-subtle)] pb-6 lg:border-b-0 lg:border-r lg:pr-6">
                  <p className="text-4xl font-semibold text-[var(--text-primary)]">{ratingSummary.averageRating.toFixed(1)}<span className="ml-1 text-lg text-[var(--text-secondary)]">/ 5</span></p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Based on {ratingSummary.totalReviews} verified purchase{ratingSummary.totalReviews === 1 ? '' : 's'}</p>
                  <div className="mt-5 space-y-2">{[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingSummary.distribution[String(stars)] ?? 0;
                    const percentage = ratingSummary.totalReviews ? count / ratingSummary.totalReviews * 100 : 0;
                    return <div key={stars} className="grid grid-cols-[36px_1fr_30px] items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span>{stars} star</span><span className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} /></span><span className="text-right">{count}</span>
                    </div>;
                  })}</div>
                </aside>
                <div className="space-y-4">
                  {reviewFeed.reviews.length ? reviewFeed.reviews.map((review) => <article key={review.id}
                    className="border-b border-[var(--border-subtle)] pb-6 last:border-b-0">
                    <p className="flex items-center gap-1 text-amber-400" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => <Star key={index}
                        className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'text-[var(--text-secondary)]'}`} />)}
                    </p>
                    <h3 className="mt-3 font-semibold text-[var(--text-primary)]">{review.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{review.content}</p>
                    {review.imageUrls.length ? <div className="mt-4 flex flex-wrap gap-3">{review.imageUrls.map((url) =>
                      <img key={url} src={url} alt="Customer shared product" loading="lazy" className="h-20 w-20 rounded-xl object-cover" />)}</div> : null}
                    <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{review.customerName}</span>
                      <span className="inline-flex items-center gap-1 text-[var(--brand-green-dark)]"><ShieldCheck className="h-3.5 w-3.5" />Verified Purchase</span>
                      <time dateTime={review.submittedAt}>{new Date(review.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</time>
                    </p>
                  </article>) : <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
                    <p className="font-semibold text-[var(--text-primary)]">No public reviews yet</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Approved verified reviews will appear here.</p>
                  </div>}
                </div>
              </div>}
        </section>

        <section className="mt-12" aria-labelledby="related-products-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">More to explore</p>
              <h2 id="related-products-heading" className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Related products</h2>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)] transition hover:text-[var(--brand-green)]">Discover more <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {relatedError ? <p className="mt-5 text-sm text-red-600" role="alert">{relatedError}</p>
            : relatedProducts.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((item) => <ProductCard key={item.backendId ?? item.id} product={item} />)}
            </div> : null}
        </section>
      </main>
      {imageZoomOpen && selectedImage ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-8"
        role="dialog" aria-modal="true" aria-label={`Image zoom: ${product.name}`} onClick={() => setImageZoomOpen(false)}>
        <div className="relative flex h-full max-h-[900px] w-full max-w-6xl items-center justify-center"
          onClick={(event) => event.stopPropagation()}>
          <img src={selectedImage.imageUrl} alt={selectedImage.altText || product.name}
            className="max-h-full max-w-full object-contain" />
          <button type="button" aria-label="Close image zoom" onClick={() => setImageZoomOpen(false)}
            className="absolute right-0 top-0 rounded-full bg-white/95 p-3 text-[var(--text-primary)] shadow-lg transition hover:bg-white">
            <X className="h-5 w-5" />
          </button>
          {galleryImages.length > 1 ? <>
            <button type="button" aria-label="Previous product image" onClick={() => changeImage(selectedImageIndex - 1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 text-[var(--text-primary)] shadow-lg transition hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next product image" onClick={() => changeImage(selectedImageIndex + 1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 text-[var(--text-primary)] shadow-lg transition hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </> : null}
        </div>
      </motion.div> : null}
      <Footer />
    </div>
  );
}
