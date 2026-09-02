import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, FileText, Glasses, Heart, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import type { Product } from '../../types';
import LuxuryModal from './LuxuryModal';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, addToCart, isInWishlist, isInCart } = useShop();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const supportsPrescription = product.category !== 'Contact Lenses';

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <motion.article whileHover={{ y: -8, scale: 1.01 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[0_30px_90px_-35px_rgba(2,6,23,0.8)] backdrop-blur-xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#02050d] via-transparent to-transparent opacity-70" />
          <img src={product.image} alt={product.name} loading="lazy" className="h-72 w-full object-cover transition duration-700 group-hover:scale-110" />
          <div className="absolute left-4 top-4 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">{product.badge}</div>
          <button onClick={() => toggleWishlist(product)} className={`absolute right-4 top-4 rounded-full border p-2 transition ${isInWishlist(product.id) ? 'border-cyan-400/40 bg-cyan-400/20 text-cyan-300' : 'border-white/10 bg-slate-950/70 text-slate-100'}`} aria-label="Add to wishlist">
            <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
          </button>
          <div className="absolute inset-x-4 bottom-4 flex gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900" onClick={() => setOpen(true)}>
              <Eye className="h-4 w-4" /> Quick view
            </button>
            <button onClick={handleAddToCart} className="rounded-full bg-cyan-500/90 p-2.5 text-white">
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          {added ? <div className="absolute inset-x-4 bottom-20 rounded-full border border-cyan-400/30 bg-slate-950/85 px-3 py-2 text-center text-sm text-cyan-300">Added to bag</div> : null}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-cyan-300">{product.category}</p>
            <div className="flex items-center gap-1 text-sm text-[#D4AF37]">
              <Star className="h-4 w-4 fill-current" /> {product.rating}
            </div>
          </div>
          <Link to={`/product/${product.id}`} className="mt-3 block text-xl font-semibold text-white hover:text-cyan-300">
            {product.name}
          </Link>
          <p className="mt-2 text-sm leading-6 text-slate-400">{product.description}</p>
          {supportsPrescription ? <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold"><span className="inline-flex items-center gap-1 text-[#9ACD32]"><FileText className="h-3.5 w-3.5" /> Prescription Available</span><Link to={`/virtual-try-on?productId=${product.id}`} className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><Glasses className="h-3.5 w-3.5" /> Virtual Try-On</Link></div> : null}
          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-white">${product.price}</p>
              {product.oldPrice ? <p className="text-sm text-slate-500 line-through">${product.oldPrice}</p> : null}
            </div>
            <button onClick={handleAddToCart} className={`rounded-full p-2.5 text-white transition hover:brightness-110 ${isInCart(product.id) ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-blue-600'}`} aria-label="Add to cart">
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
            <span>{product.stock}</span>
            <Link to={`/product/${product.id}`} className="inline-flex items-center gap-2 font-semibold text-slate-200 hover:text-cyan-300">
              View <ArrowRight className="h-4 w-4" />
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
              <span className="text-white">${product.price}</span>
              <span className="text-sm text-cyan-300">{product.stock}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => { addToCart(product); setOpen(false); }} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white">Add to bag</button>
            <Link to={`/product/${product.id}`} className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-200">View details</Link>
          </div>
        </div>
      </LuxuryModal>
    </>
  );
}
