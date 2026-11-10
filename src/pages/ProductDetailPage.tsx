import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Glasses, Heart, ShieldCheck, Star, Truck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { reviews } from '../data/mockData';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { catalogService, toProduct, type CatalogProduct } from '../services/catalogService';
import { formatINR } from '../utils/currency';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productGstInformation } from '../utils/gst';
import { getDiscountPercentage } from '../utils/pricing';
import { getPrimaryGalleryImageIndex, getProductGalleryImages, getSwipeGalleryIndex } from '../utils/productGallery';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist, addToCart, isInCart } = useShop();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const [cartLoading, setCartLoading] = useState(false);
  const [catalogProduct, setCatalogProduct] = useState<CatalogProduct | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const cartTimerRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (cartTimerRef.current) window.clearTimeout(cartTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    setCatalogProduct(null);
    setCatalogError('');
    catalogService.get(id).then((value) => {
      setCatalogProduct(value);
      setSelectedImageIndex(getPrimaryGalleryImageIndex(getProductGalleryImages(value.images, value.imageUrl ?? '')));
      setSelectedVariantId(value.variants.find((variant) => variant.status.toUpperCase() === 'ACTIVE' && variant.availableQuantity > 0)?.id ?? '');
    }).catch((reason) => setCatalogError(reason instanceof Error ? reason.message : 'Unable to load this product.'));
  }, [id]);
  const product = catalogProduct ? toProduct(catalogProduct) : null;
  if (catalogError) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-24 text-center"><p className="text-sm text-red-600" role="alert">{catalogError}</p><Link to="/shop" className="mt-6 inline-flex rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold">Back to shop</Link></main><Footer /></div>;
  if (!product || !catalogProduct) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-24 text-center"><p className="text-sm text-[var(--text-secondary)]">Loading product...</p></main><Footer /></div>;

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
  const unavailable = !selectedVariant
    || selectedVariant.status.toUpperCase() !== 'ACTIVE'
    || selectedVariant.availableQuantity < 1;

  const productForCart = { ...product, variantId: selectedVariant?.id };
  const handleBuyNow = async () => {
    if (unavailable) return;
    if (!isInCart(product.id)) {
      setCartLoading(true);
      setCartError('');
      try {
        await addToCart(productForCart);
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
    if (isInCart(product.id)) return;
    setCartLoading(true);
    setCartError('');
    try {
      await addToCart(productForCart);
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

  const discountPercentage = getDiscountPercentage(product.price, product.oldPrice);
  const actionButtonBase = 'h-[48px] min-h-[48px] rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 sm:h-[52px] sm:min-h-[52px] sm:px-4';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 backdrop-blur-xl sm:p-5">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] bg-[var(--bg-secondary)] p-3 sm:p-5 lg:aspect-[4/3]"
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {selectedImage ? <img src={selectedImage.imageUrl} alt={selectedImage.altText || product.name} fetchPriority="high" className="h-full w-full object-contain" /> : null}
              {galleryImages.length > 1 ? <>
                <button type="button" aria-label="Previous product image" onClick={() => changeImage(selectedImageIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white shadow hover:bg-black/75">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next product image" onClick={() => changeImage(selectedImageIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white shadow hover:bg-black/75">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </> : null}
            </div>
            {galleryImages.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
              {galleryImages.map((image, index) => <button key={image.id} type="button"
                aria-label={`View product image ${index + 1}`} aria-pressed={index === selectedImageIndex}
                onClick={() => changeImage(index)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[var(--bg-secondary)] p-1 ${index === selectedImageIndex ? 'border-[var(--brand-green)]' : 'border-[var(--border-subtle)]'}`}>
                <img src={image.imageUrl} alt="" className="h-full w-full object-contain" />
              </button>)}
            </div> : null}
          </motion.div>
          <section className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 backdrop-blur-xl sm:p-8" aria-labelledby="product-specifications">
            <p id="product-specifications" className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Specifications</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {([
                ['Category', product.category],
                ...(product.gender ? [['Audience', product.gender]] : []),
                ...(product.frameShape ? [['Frame shape', product.frameShape]] : []),
                ...(product.frameType ? [['Frame type', product.frameType]] : []),
                ['Material', product.material],
                ['Brand', product.brand],
                ['Available colours', product.colors.join(', ')],
                ['Available sizes', product.sizes.join(', ')],
                ['Availability', product.stock],
              ] as Array<[string, string]>).map(([label, value]) => (
                <div key={String(label)} className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">{String(label)}</p>
                  <p className="mt-2 font-semibold text-[var(--text-primary)]">{String(value)}</p>
                </div>
              ))}
            </div>
          </section>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">{product.brand}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
              <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{product.name}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]" aria-label={`Sample catalogue rating ${product.rating} out of 5`}><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong className="text-[var(--text-primary)]">{product.rating.toFixed(1)}</strong><span>sample catalogue rating · {product.reviews} demo ratings</span></p>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{product.description}</p>
            </div>
            <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Price</p><p className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">{formatINR(product.price)}</p></div>
                {product.oldPrice ? <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">List price</p><p className="mt-1 text-lg text-[var(--text-secondary)] line-through">{formatINR(product.oldPrice)}</p></div> : null}
                {discountPercentage != null ? <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-[var(--brand-green)]/15 px-3 py-1.5 text-sm font-bold tracking-wide text-[var(--brand-green-dark)]">{discountPercentage}% OFF</span> : null}
              </div>
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-sm leading-6 text-[var(--text-secondary)]" aria-label="Product GST information">
                  {productGstInformation(catalogProduct)}
                </p>
                {catalogProduct.hsnCode ? <p className="mt-2 text-xs text-[var(--text-secondary)]">HSN {catalogProduct.hsnCode}</p> : null}
              </div>
              {catalogProduct.variants.length ? <label className="mt-4 block text-sm text-[var(--text-secondary)]"><span>Variant</span><select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]">{catalogProduct.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.status !== 'ACTIVE' || variant.availableQuantity < 1}>{[variant.color, variant.size, variant.lensType].filter(Boolean).join(' · ') || variant.sku} · {variant.availableQuantity} available</option>)}</select></label> : null}
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Available options</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">Frame color</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.colors.map((color) => <span key={color} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">{color}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.sizes.map((size) => <span key={size} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">{size}</span>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              {supportsPrescription ? (
                <Button variant="secondary" className={`${actionButtonBase} flex-1 w-full`} onClick={() => navigate(`/virtual-try-on?productId=${encodeURIComponent(product.backendId ?? String(product.id))}`)}>
                  <Glasses className="mr-2 h-4 w-4" />Virtual Try-On
                </Button>
              ) : null}

              {supportsPrescription ? (
                <Button variant="secondary" className={`${actionButtonBase} flex-1 w-full`} onClick={() => navigate(`/prescription/${catalogProduct.id}?variantId=${encodeURIComponent(selectedVariantId)}`)}>
                  Add Prescription &amp; Choose Lenses
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_170px]">
              <Button
                type="button"
                className={`${actionButtonBase} w-full bg-[var(--brand-green)] text-[var(--text-primary)] shadow-[0_12px_28px_-18px_rgba(120,190,32,0.8)] hover:bg-[var(--brand-green-light)]`}
                onClick={handleAddToCart}
                disabled={unavailable || cartLoading}
              >
                {unavailable ? 'Out of stock' : cartLoading ? 'Adding...' : addedToCart ? 'Added to Cart' : 'Add to Cart'}
              </Button>

              <Button
                type="button"
                className={`${actionButtonBase} w-full bg-[var(--brand-green)] text-[var(--text-primary)] shadow-[0_12px_28px_-18px_rgba(120,190,32,0.8)] hover:bg-[var(--brand-green-light)]`}
                onClick={handleBuyNow}
                disabled={unavailable || cartLoading}
              >
                Buy Now
              </Button>

              <Button
                type="button"
                variant="ghost"
                className={`${actionButtonBase} w-full xl:w-auto ${isWishlisted ? 'border-[var(--brand-green)]/60 bg-[var(--brand-green)]/10 text-[var(--brand-green-dark)]' : ''}`}
                onClick={() => toggleWishlist(product)}
                aria-pressed={isWishlisted}
              >
                <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                {isWishlisted ? 'Saved' : 'Add to Wishlist'}
              </Button>
            </div>

            {unavailable ? <p role="status" className="text-sm font-medium text-[var(--text-secondary)]">No active variant is currently available for this product.</p> : null}
            {addedToCart ? <p role="status" className="text-sm font-medium text-[var(--brand-green-dark)]">{product.name} was added to your cart.</p> : null}
            {cartError ? <p role="alert" className="text-sm font-medium text-red-600">{cartError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-[var(--text-primary)]"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Product availability</div><p className="mt-2 text-sm text-[var(--text-secondary)]">{product.stock}</p></div>
              <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-[var(--text-primary)]"><Truck className="h-4 w-4 text-cyan-400" /> Delivery details</div><p className="mt-2 text-sm text-[var(--text-secondary)]">Delivery options are shown during checkout.</p></div>
            </div>
            <p className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">
              Delivery availability is calculated at checkout from your saved map location and the nearest configured store. PIN codes are not used to estimate delivery distance.
            </p>
            <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Lens selection</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Make it yours</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Review the available lens options and enter your prescription in the guided order flow.</p>
              {supportsPrescription ? <Link to={`/prescription/${catalogProduct.id}?variantId=${encodeURIComponent(selectedVariantId)}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">Choose lenses <ArrowRight className="h-4 w-4" /></Link> : <p className="mt-5 text-sm text-[var(--text-secondary)]">Lens selection is not available for this item.</p>}
            </div>
          </motion.div>
        </div>

        <section className="mt-16 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl" aria-labelledby="customer-reviews">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Sample review data</p>
              <h2 id="customer-reviews" className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Review UI preview</h2>
            </div>
            <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong className="text-[var(--text-primary)]">{product.rating.toFixed(1)}</strong> sample rating · {product.reviews} demo ratings</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">The entries below are frontend mock data only; they are not verified customer reviews.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <p className="flex items-center gap-1 text-amber-400" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: review.rating }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                </p>
                <h3 className="mt-3 font-semibold text-[var(--text-primary)]">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{review.content}</p>
                <p className="mt-4 text-xs font-semibold text-[var(--text-secondary)]">{review.name}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Related products</h2>
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">Discover more <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
