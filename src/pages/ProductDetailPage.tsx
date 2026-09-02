import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Eye, Glasses, Heart, ShieldCheck, Star, Truck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { products } from '../data/mockData';
import { useNavigate, useParams } from 'react-router-dom';

const galleryImages = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useShop();
  const product = products.find((item) => item.id === Number(id)) ?? products[0];
  const supportsPrescription = product.category !== 'Contact Lenses';
  const [activeImage, setActiveImage] = useState(0);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const handleBuyNow = () => {
    navigate(`/prescription/${product.id}`);
  };

  const handleAddToCart = () => navigate(`/prescription/${product.id}`);

  const handleSubmitPurchase = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPurchaseComplete(true);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <img src={galleryImages[activeImage]} alt={product.name} loading="lazy" className="h-[min(560px,60vh)] w-full rounded-[24px] object-cover" />
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
              {galleryImages.map((image, index) => (
                <button key={image} onClick={() => setActiveImage(index)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border ${activeImage === index ? 'border-cyan-400/40' : 'border-white/10'}`}>
                  <img src={image} alt={`${product.name} view ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{product.name}</h1>
              <p className="mt-4 text-base leading-8 text-slate-400">{product.description}</p>
            </div>
            <div className="flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-1 text-[#D4AF37]"><Star className="h-4 w-4 fill-current" /> {product.rating}</div>
              <div className="text-sm text-slate-400">{product.reviews} reviews</div>
              <div className="ml-auto text-3xl font-semibold text-white">${product.price}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Select your fit</h2>
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
            <div className="flex flex-wrap gap-3">
              {supportsPrescription ? <>
                <Button variant="secondary" onClick={() => navigate(`/virtual-try-on?productId=${product.id}`)}><Glasses className="mr-2 h-4 w-4" />Virtual Try-On</Button>
                <Button variant="secondary" onClick={() => navigate(`/prescription/${product.id}`)}>Add Prescription &amp; Choose Lenses</Button>
              </> : null}
              <Button onClick={handleAddToCart}>Add to Cart</Button>
              <Button onClick={handleBuyNow}>Buy now</Button>
              <Button variant="ghost" onClick={() => toggleWishlist(product)}><Heart className={`mr-2 h-4 w-4 ${isInWishlist(product.id) ? 'fill-current text-cyan-300' : ''}`} /> {isInWishlist(product.id) ? 'Saved to wishlist' : 'Add to wishlist'}</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Warranty</div><p className="mt-2 text-sm text-slate-400">2-year warranty and premium aftercare.</p></div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><Truck className="h-4 w-4 text-cyan-400" /> Shipping</div><p className="mt-2 text-sm text-slate-400">Free delivery on orders above $120.</p></div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Specifications</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Material', product.material],
                ['Brand', product.brand],
                ['Finish', 'Polished titanium'],
                ['Lens', 'Blue-light compatible'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">360° preview</p>
            <div className="mt-6 flex items-center justify-between rounded-[20px] border border-white/10 bg-white/10 p-4">
              <div>
                <p className="text-xl font-semibold text-white">Live rotation preview</p>
                <p className="mt-2 text-sm text-slate-400">Inspect the sculptural profile from every angle.</p>
              </div>
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300"><Eye className="h-5 w-5" /></div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button className="rounded-full border border-white/10 p-2.5 text-slate-200"><ChevronLeft className="h-4 w-4" /></button>
              <p className="text-sm text-slate-400">Preview ready</p>
              <button className="rounded-full border border-white/10 p-2.5 text-slate-200"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">Reviews</h2>
            <div className="flex items-center gap-2 text-[#D4AF37]"><Star className="h-4 w-4 fill-current" /> <span className="text-sm text-slate-300">4.8 · 124 reviews</span></div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {products.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-[20px] border border-white/10 bg-slate-950/50 p-5">
                <div className="flex items-center gap-2 text-[#D4AF37]"><Star className="h-4 w-4 fill-current" /> <span className="text-sm text-slate-300">{item.rating}</span></div>
                <p className="mt-3 text-white">{item.name} feels exceptional for daily wear.</p>
                <p className="mt-2 text-sm text-slate-400">“The balance of comfort and sculptural design is remarkable.”</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">Related products</h2>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Discover more <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {products.slice(1).map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </div>
      </main>
      <AnimatePresence>
        {showPurchaseForm ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03050c]/85 px-4 py-8 backdrop-blur-xl">
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#07101f] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Checkout</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Complete your purchase</h2>
                </div>
                <button onClick={() => setShowPurchaseForm(false)} className="rounded-full border border-white/10 p-2 text-slate-200" aria-label="Close checkout">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {purchaseComplete ? (
                <div className="mt-8 rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-6 text-center">
                  <p className="text-lg font-semibold text-emerald-300">Order placed successfully</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">Your luxury eyewear order for {product.name} is confirmed. A concierge will reach out shortly.</p>
                  <button onClick={() => setShowPurchaseForm(false)} className="mt-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Close</button>
                </div>
              ) : (
                <form onSubmit={handleSubmitPurchase} className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Selected frame</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{product.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{product.description}</p>
                    <div className="mt-6 flex items-center justify-between rounded-[16px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm">
                      <span className="text-slate-300">Price</span>
                      <span className="font-semibold text-white">${product.price}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Full name</label>
                      <input required className="mt-2 w-full rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="Alicia V." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Email</label>
                      <input type="email" required className="mt-2 w-full rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Shipping address</label>
                      <textarea required rows={3} className="mt-2 w-full rounded-[20px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" placeholder="Luxury address, city, country" />
                    </div>
                    <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white">Place order</button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
