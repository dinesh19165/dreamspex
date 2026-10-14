import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProductCard from '../components/ui/ProductCard';
import SectionTitle from '../components/ui/SectionTitle';
import { products } from '../data/mockData';
import { useShop } from '../context/ShopContext';

const PAGE_SIZE = 3;
const normalize = (value: string) => value.trim().toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
const categorySlug = (value: string) => normalize(value).replaceAll(' ', '-');

export default function ShopPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prescriptionNotice = (location.state as { prescriptionNotice?: boolean } | null)?.prescriptionNotice;
  const categoryFilter = searchParams.get('category') ?? '';
  const searchFilter = searchParams.get('search') ?? '';
  const [query, setQuery] = useState(searchFilter);
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setQuery(searchFilter);
    setSelectedCategory(categoryFilter);
    setPage(1);
  }, [categoryFilter, searchFilter]);

  const categoriesInStock = useMemo(() => [...new Set(products.map((product) => product.category))], []);
  const brands = useMemo(() => [...new Set(products.map((product) => product.brand))], []);
  const materials = useMemo(() => [...new Set(products.map((product) => product.material))], []);
  const colors = useMemo(() => [...new Set(products.flatMap((product) => product.colors))], []);

  const filteredProducts = useMemo(() => {
    const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
    const minimum = minimumPrice === '' ? 0 : Number(minimumPrice);
    const maximum = maximumPrice === '' ? Number.POSITIVE_INFINITY : Number(maximumPrice);
    const matching = products.filter((product) => {
      const searchable = normalize([
        product.name,
        product.category,
        product.description,
        product.material,
        product.brand,
        ...product.colors,
      ].join(' '));
      return searchTerms.every((term) => searchable.includes(term))
        && (!selectedCategory || categorySlug(product.category) === categorySlug(selectedCategory))
        && (!selectedBrand || product.brand === selectedBrand)
        && (!selectedMaterial || product.material === selectedMaterial)
        && (!selectedColor || product.colors.includes(selectedColor))
        && (!availableOnly || product.stock !== 'Out of Stock')
        && product.price >= minimum
        && product.price <= maximum;
    });

    if (sortBy === 'price-asc') return matching.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return matching.sort((a, b) => b.price - a.price);
    if (sortBy === 'popular') return matching.sort((a, b) => b.reviews - a.reviews);
    if (sortBy === 'newest') return matching.sort((a, b) => Number(b.badge === 'New') - Number(a.badge === 'New'));
    return matching;
  }, [query, selectedCategory, selectedBrand, selectedMaterial, selectedColor, availableOnly, minimumPrice, maximumPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const suggestions = ['Aurelia', 'Nocturne', 'Lumen', 'Solstice'];
  const { cart, updateQuantity } = useShop();
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 pb-32 sm:px-6 lg:px-8 lg:pb-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle eyebrow="Shop" title="Discover refined eyewear" description="Handpicked frames, lenses, and accessories crafted for modern living." />
          <p className="text-sm text-[var(--text-secondary)]">{filteredProducts.length} pieces to explore</p>
        </div>
        {prescriptionNotice ? <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-[#7CBF00]/30 bg-[#7CBF00]/10 px-4 py-3 text-sm text-[#C7F36A]">Select a frame first to add your prescription.</div> : null}

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="Search products, brands, materials, or colours" aria-label="Search products" />
            </label>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span>Sort by</span>
                <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
                  <option value="relevance">Relevance</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="popular">Most popular</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              <button onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded-full border p-2.5 ${viewMode === 'grid' ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-200'}`}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-full border p-2.5 ${viewMode === 'list' ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-200'}`}><List className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setQuery(suggestion)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">{suggestion}</button>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#9ACD32]"><FileText className="h-4 w-4" /> Prescription Available on selected eyewear</div>
        </motion.div>

        <div className={`mt-10 grid gap-8 ${cartQuantity > 0 ? 'lg:grid-cols-[260px_1fr_320px]' : 'lg:grid-cols-[260px_1fr]'}`}>
          <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="lg:sticky lg:top-24 self-start rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><SlidersHorizontal className="h-4 w-4 text-cyan-300" /> Refine your search</h3>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Category
                <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-200 outline-none">
                  <option value="">All categories</option>
                  {categoriesInStock.map((category) => <option key={category} value={categorySlug(category)}>{category}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Brand
                <select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-200 outline-none">
                  <option value="">All brands</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Material
                <select value={selectedMaterial} onChange={(event) => { setSelectedMaterial(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-200 outline-none">
                  <option value="">All materials</option>{materials.map((material) => <option key={material}>{material}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Colour
                <select value={selectedColor} onChange={(event) => { setSelectedColor(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-200 outline-none">
                  <option value="">All colours</option>{colors.map((color) => <option key={color}>{color}</option>)}
                </select>
              </label>
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Price range</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-400">Min
                    <input type="number" min="0" value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); setPage(1); }} placeholder="$0" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 outline-none" />
                  </label>
                  <label className="text-xs text-slate-400">Max
                    <input type="number" min="0" value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); setPage(1); }} placeholder="No limit" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 outline-none" />
                  </label>
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={availableOnly} onChange={(event) => { setAvailableOnly(event.target.checked); setPage(1); }} className="accent-[var(--brand-green)]" />
                In-stock items only
              </label>
              <button type="button" onClick={() => { setQuery(''); setSelectedCategory(''); setSelectedBrand(''); setSelectedMaterial(''); setSelectedColor(''); setAvailableOnly(false); setMinimumPrice(''); setMaximumPrice(''); setSortBy('relevance'); setPage(1); }} className="w-full rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300">Clear filters</button>
            </div>
            <div className="mt-6 rounded-[20px] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-200">
              <p className="font-semibold">Priority access</p>
              <p className="mt-2 text-slate-300">Members receive private previews and first-ship privileges.</p>
            </div>
          </motion.aside>
          <div>
            <div className={`grid gap-8 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {pagedProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
              {!pagedProducts.length ? <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center md:col-span-2 xl:col-span-3"><p className="font-serif text-2xl text-[var(--text-primary)]">Sorry, we couldn't find that frame.</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Try a popular category or browse our bestsellers.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link to="/shop" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#172015]">View bestsellers</Link><Link to="/categories" className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold">Popular categories</Link></div></div> : null}
            </div>

            {cartQuantity > 0 && (
              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5 text-slate-100 lg:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Order preview</p>
                    <p className="mt-2 text-lg font-semibold text-white">{cartQuantity} items</p>
                  </div>
                  <ShoppingCart className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {cart.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#050816] p-3">
                      <img src={item.image} alt={item.name} className="h-12 w-12 rounded-[14px] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {cart.length > 3 ? <p className="text-xs text-slate-400">+{cart.length - 3} more items</p> : null}
                </div>
                <div className="mt-4 rounded-[20px] border border-white/10 bg-[#050816] p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-white">${subtotal.toFixed(2)}</span></div>
                </div>
                <Link to="/checkout" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
                  Checkout
                </Link>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl">
              <p className="text-sm text-slate-400">Showing {pagedProducts.length} of {filteredProducts.length} pieces</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <button key={value} onClick={() => setPage(value)} className={`h-10 w-10 rounded-full text-sm ${page === value ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200'}`}>{value}</button>
                ))}
                <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          {cartQuantity > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-cyan-400/20 bg-[#07101f] p-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Order preview</p>
                    <p className="mt-2 text-lg font-semibold text-white">{cartQuantity} items</p>
                  </div>
                  <ShoppingCart className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="mt-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="rounded-[20px] border border-white/10 bg-[#050816] p-4">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-14 w-14 rounded-[16px] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-400">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 p-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 rounded-full bg-white/5 text-white transition hover:bg-white/10">-</button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 rounded-full bg-white/5 text-white transition hover:bg-white/10">+</button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                        <span>Total</span>
                        <span className="font-semibold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-[20px] border border-white/10 bg-[#050816] p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-white">${subtotal.toFixed(2)}</span></div>
                    <div className="mt-3 rounded-full border border-white/10 bg-[#07101f] px-4 py-3 text-sm text-slate-300">Free delivery on orders over $150</div>
                  </div>
                  <Link to="/checkout" className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
