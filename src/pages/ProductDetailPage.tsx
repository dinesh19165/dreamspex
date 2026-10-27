import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Glasses, Heart, ShieldCheck, Star, Truck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { products, reviews } from '../data/mockData';
import { formatINR } from '../utils/currency';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist, addToCart, isInCart, setDeliveryPin, validateDeliveryPin } = useShop();
  const [postalCode, setPostalCode] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);
  const cartTimerRef = useRef<number | null>(null);
  const product = products.find((item) => item.id === Number(id));
  if (!product) return <Navigate to="/shop" replace />;

  const supportsPrescription = product.category !== 'Contact Lenses';
  const isWishlisted = isInWishlist(product.id);
  const unavailable = product.stock === 'Out of Stock';

  useEffect(() => {
    return () => {
      if (cartTimerRef.current) window.clearTimeout(cartTimerRef.current);
    };
  }, []);

  const handleBuyNow = () => {
    if (unavailable) return;
    if (!isInCart(product.id)) addToCart(product);
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    if (unavailable) return;
    if (!isInCart(product.id)) addToCart(product);
    setAddedToCart(true);
    if (cartTimerRef.current) window.clearTimeout(cartTimerRef.current);
    cartTimerRef.current = window.setTimeout(() => setAddedToCart(false), 1400);
  };

  const checkDeliveryCode = () => {
    if (pinChecking) return;

    const rawPin = postalCode.trim();
    if (!/^\d{6}$/.test(rawPin)) {
      setDeliveryMessage('Enter a valid 6-digit PIN code.');
      return;
    }

    setPinChecking(true);
    setDeliveryMessage('');
    window.setTimeout(() => {
      const result = validateDeliveryPin(rawPin);
      setPostalCode(result.normalizedPin);
      setDeliveryMessage(result.message);
      setPinChecking(false);
    }, 300);
  };

  const discountPercentage = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const actionButtonBase = 'h-[48px] min-h-[48px] rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 sm:h-[52px] sm:min-h-[52px] sm:px-4';

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <img src={product.image} alt={product.name} fetchPriority="high" className="h-[min(560px,60vh)] w-full rounded-[24px] object-cover" />
            <p className="mt-3 text-xs text-slate-400">One product image is available in this sample catalogue.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{product.brand}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{product.name}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-300" aria-label={`Sample catalogue rating ${product.rating} out of 5`}><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong className="text-white">{product.rating.toFixed(1)}</strong><span>sample catalogue rating · {product.reviews} demo ratings</span></p>
              <p className="mt-4 text-base leading-8 text-slate-400">{product.description}</p>
            </div>
            <div className="flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p><p className="mt-1 text-3xl font-semibold text-white">{formatINR(product.price)}</p></div>
              {product.oldPrice ? <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">List price</p><p className="mt-1 text-lg text-slate-400 line-through">{formatINR(product.oldPrice)}</p></div> : null}
              {discountPercentage > 0 ? <span className="rounded-full bg-[var(--brand-green)]/15 px-3 py-1 text-sm font-semibold text-[var(--brand-green-dark)]">{discountPercentage}% off</span> : null}
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Available options</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Frame color</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.colors.map((color) => <span key={color} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">{color}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.sizes.map((size) => <span key={size} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">{size}</span>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              {supportsPrescription ? (
                <Button variant="secondary" className={`${actionButtonBase} flex-1 w-full`} onClick={() => navigate(`/virtual-try-on?productId=${product.id}`)}>
                  <Glasses className="mr-2 h-4 w-4" />Virtual Try-On
                </Button>
              ) : null}

              {supportsPrescription ? (
                <Button variant="secondary" className={`${actionButtonBase} flex-1 w-full`} onClick={() => navigate(`/prescription/${product.id}`)}>
                  Add Prescription &amp; Choose Lenses
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_170px]">
              <Button
                type="button"
                className={`${actionButtonBase} w-full bg-[var(--brand-green)] text-[var(--text-primary)] shadow-[0_12px_28px_-18px_rgba(120,190,32,0.8)] hover:bg-[var(--brand-green-light)]`}
                onClick={handleAddToCart}
                disabled={unavailable}
              >
                {unavailable ? 'Out of stock' : addedToCart ? 'Added to Cart' : 'Add to Cart'}
              </Button>

              <Button
                type="button"
                className={`${actionButtonBase} w-full bg-[var(--brand-green)] text-[var(--text-primary)] shadow-[0_12px_28px_-18px_rgba(120,190,32,0.8)] hover:bg-[var(--brand-green-light)]`}
                onClick={handleBuyNow}
                disabled={unavailable}
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

            {addedToCart ? <p role="status" className="text-sm font-medium text-[var(--brand-green-dark)]">{product.name} was added to your cart.</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Product availability</div><p className="mt-2 text-sm text-slate-400">{product.stock}</p></div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><Truck className="h-4 w-4 text-cyan-400" /> Delivery details</div><p className="mt-2 text-sm text-slate-400">Delivery options are shown during checkout.</p></div>
            </div>
            <form className="rounded-[20px] border border-white/10 bg-white/5 p-5" onSubmit={(event) => { event.preventDefault(); checkDeliveryCode(); }}>
              <label htmlFor="delivery-pin" className="text-sm font-semibold text-white">Check a delivery PIN</label>
              <p className="mt-1 text-xs leading-5 text-slate-400">Check mock delivery availability. Live serviceability will be connected later.</p>
              <div className="mt-3 flex gap-2">
                <input id="delivery-pin" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={postalCode} onChange={(event) => { const nextValue = event.target.value.replace(/\D/g, '').slice(0, 6); setPostalCode(nextValue); setDeliveryPin(nextValue); setDeliveryMessage(''); }} placeholder="6-digit PIN code" className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]" />
                <Button type="submit" className="h-[48px] min-h-[48px] rounded-full px-4 text-sm font-semibold sm:h-[52px] sm:min-h-[52px]" disabled={pinChecking || postalCode.trim().length !== 6}>{pinChecking ? 'Checking...' : 'Check'}</Button>
              </div>
              {deliveryMessage ? <p role="status" className={`mt-3 text-sm ${deliveryMessage.includes('available') ? 'text-emerald-300' : 'text-slate-300'}`}>{deliveryMessage}</p> : null}
              <p className="mt-2 text-xs text-slate-500">Demo serviceable PINs: 500001, 500032, 560001, 110001, 400001.</p>
            </form>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Specifications</p>
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
                <div key={String(label)} className="rounded-[18px] border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{String(label)}</p>
                  <p className="mt-2 font-semibold text-white">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Lens selection</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Make it yours</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Review the available lens options and enter your prescription in the guided order flow.</p>
            {supportsPrescription ? <Link to={`/prescription/${product.id}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">Choose lenses <ArrowRight className="h-4 w-4" /></Link> : <p className="mt-5 text-sm text-slate-300">Lens selection is not available for this item.</p>}
          </div>
        </div>

        <section className="mt-16 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl" aria-labelledby="customer-reviews">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Sample review data</p>
              <h2 id="customer-reviews" className="mt-2 text-2xl font-semibold text-white">Review UI preview</h2>
            </div>
            <p className="flex items-center gap-2 text-sm text-slate-300"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong className="text-white">{product.rating.toFixed(1)}</strong> sample rating · {product.reviews} demo ratings</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">The entries below are frontend mock data only; they are not verified customer reviews.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-white/10 bg-[#050816]/50 p-5">
                <p className="flex items-center gap-1 text-amber-400" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: review.rating }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                </p>
                <h3 className="mt-3 font-semibold text-white">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{review.content}</p>
                <p className="mt-4 text-xs font-semibold text-slate-300">{review.name}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">Related products</h2>
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200">Discover more <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {products.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
