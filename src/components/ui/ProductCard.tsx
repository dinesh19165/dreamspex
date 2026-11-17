import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, FileText, Glasses, Heart, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import type { Product } from '../../types';
import { formatINR } from '../../utils/currency';
import { getDiscountPercentage } from '../../utils/pricing';
import LuxuryModal from './LuxuryModal';

type ProductCardProps = {
  product: Product;
  layout?: 'grid' | 'list';
};

export default function ProductCard({ product, layout = 'grid' }: ProductCardProps) {
  const { toggleWishlist, addToCart, isInWishlist, isInCart } = useShop();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const supportsPrescription = product.category !== 'Contact Lenses';
  const unavailable = product.stock === 'Out of Stock' || !product.variantId;
  const discountPercentage = getDiscountPercentage(product.price, product.oldPrice);

  const handleAddToCart = () => {
    if (unavailable) return;
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <motion.article whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_12px_30px_-24px_rgba(2,6,23,0.55)] ${layout === 'list' ? 'sm:flex-row' : ''}`}>
        <div className={`relative h-[148px] overflow-hidden bg-[var(--bg-secondary)] sm:h-[170px] lg:h-[190px] ${layout === 'list' ? 'sm:aspect-auto sm:min-h-64 sm:w-2/5 sm:shrink-0' : ''}`}>
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.03]" />
          <div className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-[var(--bg-primary)]/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">{product.badge}</div>
          <button onClick={() => toggleWishlist(product)} className={`absolute right-2 top-2 rounded-full border p-1.5 transition ${isInWishlist(product.id) ? 'border-[var(--brand-green)]/40 bg-[var(--brand-green)]/15 text-[var(--brand-green-dark)]' : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 text-[var(--text-primary)]'}`} aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}>
            <Heart className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
          </button>
          <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-100 transition duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button type="button" aria-label={`Quick view ${product.name}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-slate-900" onClick={() => setOpen(true)}>
              <Eye className="h-3 w-3" /> Quick view
            </button>
            <button type="button" onClick={handleAddToCart} disabled={unavailable} aria-label={unavailable ? `${product.name} is out of stock` : `Add ${product.name} to cart`} className="rounded-full bg-[var(--brand-green)] p-1.5 text-[var(--brand-green-dark)] disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
          {added ? <div className="absolute inset-x-2 bottom-12 rounded-full border border-[var(--brand-green)]/30 bg-[var(--bg-card)] px-2 py-1 text-center text-[11px] text-[var(--brand-green-dark)]">Added to bag</div> : null}
        </div>
        <div className={`flex flex-1 flex-col p-2.5 sm:p-3.5 ${layout === 'list' ? 'sm:min-w-0 sm:p-5' : ''}`}>
          <div className="flex items-center">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brand-green-dark)]">{product.category}</p>
          </div>
          <Link to={`/product/${product.backendId ?? product.id}`} className="mt-1 line-clamp-2 text-sm font-semibold leading-4 text-[var(--text-primary)] hover:text-[var(--brand-green-dark)]">
            {product.name}
          </Link>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">{product.brand}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] leading-4 text-[var(--text-secondary)]" aria-label={`${product.rating.toFixed(1)} out of 5 from ${product.reviews} verified reviews`}><Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" /> <span className="font-semibold text-[var(--text-primary)]">{product.rating.toFixed(1)}</span><span title={`${product.reviews} verified reviews`}>· {product.reviews} verified</span></p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-[var(--text-secondary)]">{product.description}</p>
          {supportsPrescription ? <div className="mt-1 flex flex-wrap gap-x-1 gap-y-1 text-[9px] font-semibold"><span aria-label="Prescription available" className="inline-flex items-center gap-1 text-[var(--brand-green-dark)]"><FileText className="h-3 w-3" /> Prescription</span><Link to={`/virtual-try-on?productId=${product.id}`} aria-label="Virtual Try-On" className="inline-flex items-center gap-1 text-[var(--brand-green-dark)] hover:underline"><Glasses className="h-3 w-3" /> Try-on</Link></div> : null}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight text-[var(--text-primary)]">{formatINR(product.price)}</p>
              {product.oldPrice && discountPercentage != null ? <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <p className="text-xs leading-4 text-[var(--text-secondary)] line-through">{formatINR(product.oldPrice)}</p>
                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-[var(--brand-green)]/15 px-1.5 py-0.5 text-[9px] font-bold leading-3 tracking-wide text-[var(--brand-green-dark)]">{discountPercentage}% OFF</span>
              </div> : null}
              {product.gstEnabled === false
                ? <p className="mt-1 text-[10px] text-[var(--text-secondary)]">GST disabled</p>
                : product.gstRate != null
                  ? <p className="mt-1 text-[10px] text-[var(--text-secondary)]">GST rate: {product.gstRate}%{product.hsnCode ? ` · HSN ${product.hsnCode}` : ''}</p>
                  : null}
            </div>
            <button onClick={handleAddToCart} disabled={unavailable} className={`rounded-full p-2 text-[var(--brand-green-dark)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${isInCart(product.id) ? 'bg-emerald-500' : 'bg-[var(--brand-green)]'}`} aria-label={unavailable ? `${product.name} is out of stock` : `Add ${product.name} to cart`}>
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
            <span className="truncate">{product.stock}</span>
            <Link to={`/product/${product.backendId ?? product.id}`} className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--text-primary)] hover:text-[var(--brand-green-dark)]">
              View <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </motion.article>

      <LuxuryModal isOpen={open} onClose={() => setOpen(false)} title={product.name} image={product.image}>
        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{product.description}</p>
            <div className="mt-5 flex items-center justify-between rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
              <span className="text-[var(--text-primary)]">{formatINR(product.price)}</span>
              <span className="text-sm text-cyan-300">{product.stock}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button disabled={unavailable} onClick={() => { addToCart(product); setOpen(false); }} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50">{unavailable ? 'Out of stock' : 'Add to bag'}</button>
            <Link to={`/product/${product.backendId ?? product.id}`} className="rounded-full border border-[var(--border-subtle)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)]">View details</Link>
          </div>
        </div>
      </LuxuryModal>
    </>
  );
}
