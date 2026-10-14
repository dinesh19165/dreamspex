import { motion } from 'framer-motion';
import { ArrowRight, Glasses, Heart, ShieldCheck, Truck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProductCard from '../components/ui/ProductCard';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { products } from '../data/mockData';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useShop();
  const product = products.find((item) => item.id === Number(id));
  if (!product) return <Navigate to="/shop" replace />;
  const supportsPrescription = product.category !== 'Contact Lenses';

  const handleBuyNow = () => {
    navigate(`/prescription/${product.id}`);
  };

  const handleAddToCart = () => navigate(`/prescription/${product.id}`);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <img src={product.image} alt={product.name} loading="lazy" className="h-[min(560px,60vh)] w-full rounded-[24px] object-cover" />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{product.name}</h1>
              <p className="mt-4 text-base leading-8 text-slate-400">{product.description}</p>
            </div>
            <div className="flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p><p className="mt-1 text-3xl font-semibold text-white">${product.price}</p></div>
              {product.oldPrice ? <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">List price</p><p className="mt-1 text-lg text-slate-400 line-through">${product.oldPrice}</p></div> : null}
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
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Product availability</div><p className="mt-2 text-sm text-slate-400">{product.stock}</p></div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"><div className="flex items-center gap-2 text-white"><Truck className="h-4 w-4 text-cyan-400" /> Delivery details</div><p className="mt-2 text-sm text-slate-400">Delivery options are shown during checkout.</p></div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Specifications</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Category', product.category],
                ['Material', product.material],
                ['Brand', product.brand],
                ['Available colours', product.colors.join(', ')],
                ['Available sizes', product.sizes.join(', ')],
                ['Availability', product.stock],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 font-semibold text-white">{value}</p>
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
