import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, FileText, Glasses, Heart, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import type { Product } from '../../types';
import { formatINR } from '../../utils/currency';
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
  const unavailable = product.stock === 'Out of Stock';

  const handleAddToCart = () => {
    if (unavailable) return;
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <motion.article whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_20px_50px_-36px_rgba(2,6,23,0.8)] ${layout === 'list' ? 'sm:flex-row' : ''}`}>
        <div className={`relative aspect-[5/4] overflow-hidden bg-[var(--bg-secondary)] ${layout === 'list' ? 'sm:aspect-auto sm:min-h-64 sm:w-2/5 sm:shrink-0' : ''}`}>
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute left-3 top-3 rounded-full bg-[#182218]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">{product.badge}</div>
          <button onClick={() => toggleWishlist(product)} className={`absolute right-3 top-3 rounded-full border p-2 transition ${isInWishlist(product.id) ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-300' : 'border-white/10 bg-[#182218]/80 text-white'}`} aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}>
            <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
          </button>
          <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-100 transition duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button type="button" aria-label={`Quick view ${product.name}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900" onClick={() => setOpen(true)}>
              <Eye className="h-3.5 w-3.5" /> Quick view
            </button>
            <button type="button" onClick={handleAddToCart} disabled={unavailable} aria-label={unavailable ? `${product.name} is out of stock` : `Add ${product.name} to cart`} className="rounded-full bg-cyan-500/90 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
          {added ? <div className="absolute inset-x-3 bottom-16 rounded-full border border-cyan-400/30 bg-slate-950/85 px-3 py-1.5 text-center text-xs text-cyan-300">Added to bag</div> : null}
        </div>
        <div className={`flex flex-1 flex-col p-4 sm:p-5 ${layout === 'list' ? 'sm:min-w-0' : ''}`}>
          <div className="flex items-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">{product.category}</p>
          </div>
          <Link to={`/product/${product.id}`} className="mt-2 block text-lg font-semibold text-[var(--text-primary)] hover:text-cyan-300">
            {product.name}
          </Link>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{product.brand}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-secondary)]" aria-label={`Sample catalogue rating ${product.rating} out of 5`}><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> <span className="font-semibold text-[var(--text-primary)]">{product.rating.toFixed(1)}</span><span>· {product.reviews} ratings</span></p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{product.description}</p>
          {supportsPrescription ? <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="inline-flex items-center gap-1 text-[#9ACD32]"><FileText className="h-3 w-3" /> Prescription Available</span><Link to={`/virtual-try-on?productId=${product.id}`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><Glasses className="h-3 w-3" /> Virtual Try-On</Link></div> : null}
          <div className="mt-auto flex items-center justify-between pt-4">
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">{formatINR(product.price)}</p>
              {product.oldPrice ? <p className="text-xs text-[var(--text-secondary)] line-through">{formatINR(product.oldPrice)} <span className="ml-1 no-underline text-cyan-600">{Math.round((1 - product.price / product.oldPrice) * 100)}% off</span></p> : null}
            </div>
            <button onClick={handleAddToCart} disabled={unavailable} className={`rounded-full p-2.5 text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${isInCart(product.id) ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-blue-600'}`} aria-label={unavailable ? `${product.name} is out of stock` : `Add ${product.name} to cart`}>
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{product.stock}</span>
            <Link to={`/product/${product.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)] hover:text-cyan-300">
              View <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.article>

      <LuxuryModal isOpen={open} onClose={() => setOpen(false)} title={product.name} image={product.image}>
        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{product.description}</p>
            <div className="mt-5 flex items-center justify-between rounded-[16px] border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white">{formatINR(product.price)}</span>
              <span className="text-sm text-cyan-300">{product.stock}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button disabled={unavailable} onClick={() => { addToCart(product); setOpen(false); }} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{unavailable ? 'Out of stock' : 'Add to bag'}</button>
            <Link to={`/product/${product.id}`} className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-200">View details</Link>
          </div>
        </div>
      </LuxuryModal>
    </>
  );
}
