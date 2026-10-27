import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, ArrowRight, SlidersHorizontal, X, Home, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProductCard from '../components/ui/ProductCard';
import { products } from '../data/mockData';
import { useShop } from '../context/ShopContext';
import { getCartItemKey } from '../utils/cart';
import { formatINR } from '../utils/currency';

const PAGE_SIZE = 6;
const normalize = (value: string) => value.trim().toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
const categorySlug = (value: string) => normalize(value).replaceAll(' ', '-');

export default function ShopPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const prescriptionNotice = (location.state as { prescriptionNotice?: boolean } | null)?.prescriptionNotice;
  const categoryFilter = searchParams.get('category') ?? '';
  const searchFilter = searchParams.get('search') ?? '';
  const brandFilter = searchParams.get('brand') ?? '';
  const materialFilter = searchParams.get('material') ?? '';
  const colorFilter = searchParams.get('color') ?? '';
  const badgeFilter = searchParams.get('badge') ?? '';
  const genderFilter = searchParams.get('gender') ?? '';
  const frameShapeFilter = searchParams.get('shape') ?? '';
  const frameTypeFilter = searchParams.get('frameType') ?? '';
  const sortFilter = searchParams.get('sort') ?? 'relevance';
  const [query, setQuery] = useState(searchFilter);
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter);
  const [selectedBrand, setSelectedBrand] = useState(brandFilter);
  const [selectedMaterial, setSelectedMaterial] = useState(materialFilter);
  const [selectedColor, setSelectedColor] = useState(colorFilter);
  const [selectedBadge, setSelectedBadge] = useState(badgeFilter);
  const [selectedGender, setSelectedGender] = useState(genderFilter);
  const [selectedFrameShape, setSelectedFrameShape] = useState(frameShapeFilter);
  const [selectedFrameType, setSelectedFrameType] = useState(frameTypeFilter);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [sortBy, setSortBy] = useState(sortFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(searchFilter);
    setSelectedCategory(categoryFilter);
    setSelectedBrand(brandFilter);
    setSelectedMaterial(materialFilter);
    setSelectedColor(colorFilter);
    setSelectedBadge(badgeFilter);
    setSelectedGender(genderFilter);
    setSelectedFrameShape(frameShapeFilter);
    setSelectedFrameType(frameTypeFilter);
    setSortBy(sortFilter);
    setPage(1);
  }, [categoryFilter, searchFilter, brandFilter, materialFilter, colorFilter, badgeFilter, genderFilter, frameShapeFilter, frameTypeFilter, sortFilter]);

  const categoriesInStock = useMemo(() => [...new Set(products.map((product) => product.category))], []);
  const brands = useMemo(() => [...new Set(products.map((product) => product.brand))], []);
  const materials = useMemo(() => [...new Set(products.map((product) => product.material))], []);
  const colors = useMemo(() => [...new Set(products.flatMap((product) => product.colors))], []);
  const genders = useMemo(() => [...new Set(products.map((product) => product.gender).filter((gender): gender is string => Boolean(gender)))], []);
  const frameShapes = useMemo(() => [...new Set(products.map((product) => product.frameShape).filter((shape): shape is string => Boolean(shape)))], []);
  const frameTypes = useMemo(() => [...new Set(products.map((product) => product.frameType).filter((type): type is string => Boolean(type)))], []);

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
        product.gender ?? '',
        product.frameShape ?? '',
        product.frameType ?? '',
        ...product.colors,
      ].join(' '));
      return searchTerms.every((term) => searchable.includes(term))
        && (!selectedCategory || categorySlug(product.category) === categorySlug(selectedCategory))
        && (!selectedBrand || product.brand === selectedBrand)
        && (!selectedMaterial || product.material === selectedMaterial)
        && (!selectedColor || product.colors.includes(selectedColor))
        && (!selectedBadge || product.badge?.toLowerCase() === selectedBadge.toLowerCase())
        && (!selectedGender || product.gender === selectedGender)
        && (!selectedFrameShape || product.frameShape === selectedFrameShape)
        && (!selectedFrameType || product.frameType === selectedFrameType)
        && (!availableOnly || product.stock !== 'Out of Stock')
        && product.price >= minimum
        && product.price <= maximum;
    });

    if (sortBy === 'price-asc') return matching.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return matching.sort((a, b) => b.price - a.price);
    if (sortBy === 'popularity') return matching.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    if (sortBy === 'newest') return matching.sort((a, b) => Number(b.badge === 'New') - Number(a.badge === 'New'));
    if (searchTerms.length) {
      const score = (product: (typeof matching)[number]) => {
        const name = normalize(product.name);
        const brand = normalize(product.brand);
        return (name === normalize(query) ? 1000 : name.startsWith(normalize(query)) ? 500 : 0)
          + (brand.startsWith(normalize(query)) ? 200 : 0)
          + searchTerms.reduce((total, term) => total + (name.includes(term) ? 30 : brand.includes(term) ? 20 : 10), 0);
      };
      return matching.sort((a, b) => score(b) - score(a) || (b.popularity ?? 0) - (a.popularity ?? 0));
    }
    return matching;
  }, [query, selectedCategory, selectedBrand, selectedMaterial, selectedColor, selectedBadge, selectedGender, selectedFrameShape, selectedFrameType, availableOnly, minimumPrice, maximumPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const suggestions = ['Aurelia', 'Nocturne', 'Lumen', 'Solstice'];
  const { cart, updateQuantity } = useShop();
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filterFields = (
    <div className="space-y-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category
        <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All categories</option>
          {categoriesInStock.map((category) => <option key={category} value={categorySlug(category)}>{category}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brand
        <select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All brands</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gender
        <select value={selectedGender} onChange={(event) => { setSelectedGender(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All genders</option>{genders.map((gender) => <option key={gender}>{gender}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Frame shape
        <select value={selectedFrameShape} onChange={(event) => { setSelectedFrameShape(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All shapes</option>{frameShapes.map((shape) => <option key={shape}>{shape}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Frame type
        <select value={selectedFrameType} onChange={(event) => { setSelectedFrameType(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All frame types</option>{frameTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Material
        <select value={selectedMaterial} onChange={(event) => { setSelectedMaterial(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All materials</option>{materials.map((material) => <option key={material}>{material}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Colour
        <select value={selectedColor} onChange={(event) => { setSelectedColor(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All colours</option>{colors.map((color) => <option key={color}>{color}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product label
        <select value={selectedBadge} onChange={(event) => { setSelectedBadge(event.target.value); setPage(1); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All labels</option>{[...new Set(products.map((product) => product.badge).filter((badge): badge is string => Boolean(badge)))].map((badge) => <option key={badge} value={badge}>{badge}</option>)}
        </select>
      </label>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Price range</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-500">Min
            <input type="number" min="0" value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); setPage(1); }} placeholder="₹0" className="mt-1 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15" />
          </label>
          <label className="text-xs text-slate-500">Max
            <input type="number" min="0" value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); setPage(1); }} placeholder="No limit" className="mt-1 w-full rounded-2xl border border-slate-200 bg-[#f8f7f2] px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15" />
          </label>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={availableOnly} onChange={(event) => { setAvailableOnly(event.target.checked); setPage(1); }} className="h-4 w-4 accent-[#7CBF00]" />
        In-stock items only
      </label>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => setMobileFiltersOpen(false)} className="flex-1 rounded-full bg-[#17300d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234815]">Apply</button>
        <button type="button" onClick={() => { setQuery(''); setSelectedCategory(''); setSelectedBrand(''); setSelectedMaterial(''); setSelectedColor(''); setSelectedBadge(''); setSelectedGender(''); setSelectedFrameShape(''); setSelectedFrameType(''); setAvailableOnly(false); setMinimumPrice(''); setMaximumPrice(''); setSortBy('relevance'); setPage(1); setSearchParams({}); }} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#7CBF00] hover:text-[#17300d]">Clear</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-16">
        <div className="rounded-[28px] border border-[#dfe7d7] bg-white px-5 py-5 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)] sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#5e6b5e]">
            <Link to="/" className="inline-flex items-center gap-1 font-medium text-[#17300d] hover:text-[#24491a]">
              <Home className="h-4 w-4" /> Home
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-[#7a867a]" />
            <span>Eyeglasses</span>
            <ChevronRightIcon className="h-4 w-4 text-[#7a867a]" />
            <span className="font-semibold text-[#17300d]">Frames</span>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7CBF00]">Premium collection</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#182116] sm:text-4xl">Eyeglasses Frames</h1>
            </div>
            <p className="text-sm text-[#5f6c5b]">{filteredProducts.length} styles ready to explore</p>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6c5b]">Discover frames that match your style.</p>
        </div>

        {prescriptionNotice ? <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-[#7CBF00]/30 bg-[#7CBF00]/10 px-4 py-3 text-sm text-[#17300d]">Select a frame first to add your prescription.</div> : null}

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[26px] border border-[#dfe7d7] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex flex-1 items-center gap-3 rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-4 py-3 text-sm text-slate-600 shadow-inner">
              <Search className="h-4 w-4 text-[#556356]" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="w-full bg-transparent text-sm text-[#182116] outline-none placeholder:text-[#70806d]" placeholder="Search frames, brands or styles" aria-label="Search products" />
            </label>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[#4d5c4c]">
                <span className="hidden sm:inline">Sort by</span>
                <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-3 py-2.5 text-sm text-[#182116] outline-none transition focus:border-[#7CBF00]">
                  <option value="relevance">Recommended</option>
                  <option value="newest">New Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="popularity">Best Rated</option>
                </select>
              </label>
              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded-full border p-2.5 ${viewMode === 'grid' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-full border p-2.5 ${viewMode === 'list' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><List className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-3 py-2.5 text-sm font-medium text-[#17300d] sm:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => { setQuery(suggestion); setPage(1); }} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-3 py-2 text-sm text-[#4d5c4c] transition hover:border-[#7CBF00]/40 hover:text-[#17300d]">{suggestion}</button>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#17300d]"><FileText className="h-4 w-4 text-[#7CBF00]" /> Prescription available on selected eyewear</div>
        </motion.div>

        <div className={`mt-10 grid gap-8 ${cartQuantity > 0 ? 'xl:grid-cols-[280px_1fr_320px]' : 'xl:grid-cols-[280px_1fr]'}`}>
          <motion.aside initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="hidden xl:block self-start rounded-[28px] border border-[#dfe7d7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)]">
            <div className="flex items-center justify-between gap-3 pb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#182116]"><SlidersHorizontal className="h-4 w-4 text-[#7CBF00]" /> Refine filters</h3>
              <span className="rounded-full bg-[#edf7d9] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#17300d]">{filteredProducts.length}</span>
            </div>
            {filterFields}
          </motion.aside>

          <div>
            <div className="mb-5 flex items-center justify-between gap-3 rounded-[20px] border border-[#dfe7d7] bg-white px-4 py-3 shadow-[0_12px_35px_-30px_rgba(18,35,18,0.45)]">
              <p className="text-sm text-[#536353]">Showing <span className="font-semibold text-[#182116]">{pagedProducts.length}</span> of <span className="font-semibold text-[#182116]">{filteredProducts.length}</span> frames</p>
              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded-full border p-2 ${viewMode === 'grid' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-full border p-2 ${viewMode === 'list' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><List className="h-4 w-4" /></button>
              </div>
            </div>

            <div className={`grid gap-5 ${viewMode === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1'}`}>
              {pagedProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }}>
                  <ProductCard product={product} layout={viewMode} />
                </motion.div>
              ))}
              {!pagedProducts.length ? <div className="rounded-[24px] border border-[#dfe7d7] bg-white p-8 text-center sm:col-span-2 xl:col-span-3 2xl:col-span-4"><p className="font-serif text-2xl text-[#182116]">No frames match your current selection.</p><p className="mt-2 text-sm text-[#5f6c5b]">Try broadening your search or resetting the filters.</p><button type="button" onClick={() => { setQuery(''); setSelectedCategory(''); setSelectedBrand(''); setSelectedMaterial(''); setSelectedColor(''); setSelectedBadge(''); setSelectedGender(''); setSelectedFrameShape(''); setSelectedFrameType(''); setAvailableOnly(false); setMinimumPrice(''); setMaximumPrice(''); setSortBy('relevance'); setPage(1); setSearchParams({}); }} className="mt-5 rounded-full bg-[#17300d] px-4 py-2.5 text-sm font-semibold text-white">Reset filters</button></div> : null}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#dfe7d7] bg-white px-4 py-4 shadow-[0_12px_35px_-30px_rgba(18,35,18,0.45)]">
              <p className="text-sm text-[#536353]">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2.5 text-[#17300d]"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <button key={value} onClick={() => setPage(value)} className={`h-10 w-10 rounded-full text-sm ${page === value ? 'bg-[#17300d] text-white' : 'border border-[#dfe7d7] bg-[#f7f5f0] text-[#182116]'}`}>{value}</button>
                ))}
                <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2.5 text-[#17300d]"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {cartQuantity > 0 && (
            <aside className="hidden xl:block">
              <div className="sticky top-24 rounded-[28px] border border-[#dfe7d7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)]">
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[#dfe7d7] bg-[#f7f5f0] p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#7CBF00]">Order preview</p>
                    <p className="mt-2 text-lg font-semibold text-[#182116]">{cartQuantity} item{cartQuantity === 1 ? '' : 's'}</p>
                  </div>
                  <ShoppingCart className="h-6 w-6 text-[#17300d]" />
                </div>
                <div className="mt-6 space-y-4">
                  {cart.map((item) => (
                    <div key={getCartItemKey(item)} className="rounded-[20px] border border-[#dfe7d7] bg-[#f7f5f0] p-4">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-14 w-14 rounded-[16px] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#182116]">{item.name}</p>
                          <p className="mt-1 text-xs text-[#5f6c5b]">{formatINR(item.price)} each</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-[#dfe7d7] bg-white p-1">
                          <button onClick={() => updateQuantity(getCartItemKey(item), item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`} className="h-8 w-8 rounded-full bg-[#f7f5f0] text-[#17300d] transition hover:bg-[#edf7d9]">-</button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-[#182116]">{item.quantity}</span>
                          <button onClick={() => updateQuantity(getCartItemKey(item), item.quantity + 1)} aria-label={`Increase ${item.name} quantity`} className="h-8 w-8 rounded-full bg-[#f7f5f0] text-[#17300d] transition hover:bg-[#edf7d9]">+</button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-[#5f6c5b]">
                        <span>Total</span>
                        <span className="font-semibold text-[#182116]">{formatINR(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-[20px] border border-[#dfe7d7] bg-[#f7f5f0] p-4 text-sm text-[#5f6c5b]">
                    <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-[#182116]">{formatINR(subtotal)}</span></div>
                    <div className="mt-3 rounded-full border border-[#dfe7d7] bg-white px-4 py-3 text-sm text-[#5f6c5b]">Free delivery on orders over ₹1,500</div>
                  </div>
                  <Link to="/checkout" className="inline-flex w-full items-center justify-center rounded-full bg-[#17300d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#224615]">Checkout <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0d1710]/45 backdrop-blur-[2px] xl:hidden">
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl rounded-t-[28px] border-t border-[#dfe7d7] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#7CBF00]">Filters</p>
                <h3 className="mt-1 text-xl font-semibold text-[#182116]">Refine your search</h3>
              </div>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2 text-[#17300d]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 max-h-[58vh] overflow-y-auto pb-4">{filterFields}</div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
