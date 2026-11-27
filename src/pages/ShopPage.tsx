import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Search, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, ArrowRight, SlidersHorizontal, X, Home, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/SEO';
import ProductCard from '../components/ui/ProductCard';
import { catalogService, toProduct, type CatalogCategory, type CatalogProduct } from '../services/catalogService';
import { useShop } from '../context/ShopContext';
import { getCartItemKey } from '../utils/cart';
import { formatINR } from '../utils/currency';
import { useFranchiseLocation } from '../context/FranchiseLocationContext';
import { formatColorLabel } from '../utils/colorSwatches';
import { resolveCmsMediaUrl } from '../config/api';
import type { Product } from '../types';

const PAGE_SIZE = 6;
const normalize = (value: string) => value.trim().toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');

function isCustomerImageAsset(imageUrl: string, altText?: string | null, storageKey?: string | null) {
  return /(?:selfie|avatar|customer[-_\s]*(?:photo|image|picture)|profile[-_\s]*(?:photo|picture)|user[-_\s]*(?:photo|upload)|review[-_\s]*(?:photo|image))/i
    .test(`${imageUrl} ${altText ?? ''} ${storageKey ?? ''}`);
}

function getListingProductImage(product: CatalogProduct): string {
  const tryOnImageUrl = product.tryOnImageUrl
    ? resolveCmsMediaUrl(product.tryOnImageUrl) ?? product.tryOnImageUrl
    : '';
  const isNonProductImage = (imageUrl: string, altText?: string | null, storageKey?: string | null) =>
    Boolean(tryOnImageUrl && (resolveCmsMediaUrl(imageUrl) ?? imageUrl) === tryOnImageUrl)
    || isCustomerImageAsset(imageUrl, altText, storageKey);
  const catalogImages = (product.images ?? [])
    .filter((image) => Boolean(image.imageUrl) && !isNonProductImage(image.imageUrl, image.altText, image.storageKey));
  const primaryImage = [...catalogImages]
    .sort((a, b) => Number(b.primaryImage) - Number(a.primaryImage) || a.sortOrder - b.sortOrder)[0];
  const fallbackImage = product.imageUrl && !isNonProductImage(product.imageUrl) ? product.imageUrl : '';
  const imageUrl = primaryImage?.imageUrl ?? fallbackImage;
  return imageUrl ? resolveCmsMediaUrl(imageUrl) ?? imageUrl : '';
}

export default function ShopPage() {
  const { selectedLocationId } = useFranchiseLocation();
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
  const pageFilter = Number(searchParams.get('page') ?? '1');
  const [query, setQuery] = useState(searchFilter);
  const [selectedBrand, setSelectedBrand] = useState(brandFilter);
  const [selectedMaterial, setSelectedMaterial] = useState(materialFilter);
  const [selectedColor, setSelectedColor] = useState(colorFilter);
  const [selectedBadge, setSelectedBadge] = useState(badgeFilter);
  const [selectedGender, setSelectedGender] = useState(genderFilter);
  const [selectedFrameShape, setSelectedFrameShape] = useState(frameShapeFilter);
  const [selectedFrameType, setSelectedFrameType] = useState(frameTypeFilter);
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === 'true');
  const [minimumPrice, setMinimumPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maximumPrice, setMaximumPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [sortBy, setSortBy] = useState(sortFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(Number.isInteger(pageFilter) && pageFilter > 0 ? pageFilter : 1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    brands: [] as string[],
    materials: [] as string[],
    genders: [] as string[],
    frameShapes: [] as string[],
    frameTypes: [] as string[],
    colors: [] as string[],
    badges: [] as string[],
  });
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogCategoryKey, setCatalogCategoryKey] = useState('');
  const catalogRequestRef = useRef(0);
  const selectedCategory = categoryFilter;

  const updateCategory = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('category', value);
    else nextParams.delete('category');
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: false });
  };

  useEffect(() => {
    setQuery(searchFilter);
    setSelectedBrand(brandFilter);
    setSelectedMaterial(materialFilter);
    setSelectedColor(colorFilter);
    setSelectedBadge(badgeFilter);
    setSelectedGender(genderFilter);
    setSelectedFrameShape(frameShapeFilter);
    setSelectedFrameType(frameTypeFilter);
    setSortBy(sortFilter);
    setAvailableOnly(searchParams.get('available') === 'true');
    setMinimumPrice(searchParams.get('minPrice') ?? '');
    setMaximumPrice(searchParams.get('maxPrice') ?? '');
    setPage(Number.isInteger(pageFilter) && pageFilter > 0 ? pageFilter : 1);
  }, [searchParams, categoryFilter, searchFilter, brandFilter, materialFilter, colorFilter, badgeFilter, genderFilter, frameShapeFilter, frameTypeFilter, sortFilter, pageFilter]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (query.trim()) params.set('search', query.trim());
    else params.delete('search');
    if (selectedBrand) params.set('brand', selectedBrand); else params.delete('brand');
    if (selectedMaterial) params.set('material', selectedMaterial); else params.delete('material');
    if (selectedColor) params.set('color', selectedColor); else params.delete('color');
    if (selectedBadge) params.set('badge', selectedBadge); else params.delete('badge');
    if (selectedGender) params.set('gender', selectedGender); else params.delete('gender');
    if (selectedFrameShape) params.set('shape', selectedFrameShape); else params.delete('shape');
    if (selectedFrameType) params.set('frameType', selectedFrameType); else params.delete('frameType');
    if (availableOnly) params.set('available', 'true'); else params.delete('available');
    if (minimumPrice) params.set('minPrice', minimumPrice); else params.delete('minPrice');
    if (maximumPrice) params.set('maxPrice', maximumPrice); else params.delete('maxPrice');
    if (sortBy !== 'relevance') params.set('sort', sortBy); else params.delete('sort');
    if (page > 1) params.set('page', String(page)); else params.delete('page');
    if (params.toString() !== searchParams.toString()) setSearchParams(params, { replace: true });
  }, [query, selectedBrand, selectedMaterial, selectedColor, selectedBadge, selectedGender,
      selectedFrameShape, selectedFrameType, availableOnly, minimumPrice, maximumPrice,
      sortBy, page, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([catalogService.categories('CATALOG', controller.signal), catalogService.filterOptions(controller.signal)])
      .then(([nextCategories, nextFilterOptions]) => {
        setCategories(nextCategories.filter((category) => category.status === 'ACTIVE'));
        setFilterOptions(nextFilterOptions);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setCatalogError(reason instanceof Error ? reason.message : 'Unable to load catalogue filters.');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page - 1),
      pageSize: String(PAGE_SIZE),
      sort: sortBy === 'price-asc' ? 'price_asc' : sortBy === 'price-desc' ? 'price_desc' : sortBy === 'name' ? 'name' : 'newest',
    });
    if (query.trim()) params.set('q', query.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (selectedMaterial) params.set('material', selectedMaterial);
    if (selectedColor) params.set('color', selectedColor);
    if (selectedBadge) params.set('badge', selectedBadge);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedFrameShape) params.set('frameShape', selectedFrameShape);
    if (selectedFrameType) params.set('frameType', selectedFrameType);
    if (availableOnly) params.set('availableOnly', 'true');
    if (minimumPrice) params.set('minPrice', minimumPrice);
    if (maximumPrice) params.set('maxPrice', maximumPrice);
    if (selectedLocationId) params.set('franchiseId', selectedLocationId);
    const controller = new AbortController();
    const requestId = ++catalogRequestRef.current;
    setCatalogLoading(true);
    setCatalogError('');
    catalogService.search(params, controller.signal)
      .then((result) => {
        if (requestId !== catalogRequestRef.current) return;
        setProducts(result.items.map((catalogProduct) => ({
          ...toProduct(catalogProduct),
          image: getListingProductImage(catalogProduct),
        })));
        setCatalogTotal(result.total);
        setCatalogCategoryKey(selectedCategory);
      })
      .catch((reason) => {
        if (!controller.signal.aborted && requestId === catalogRequestRef.current) {
          setCatalogError(reason instanceof Error ? reason.message : 'Unable to load the catalogue.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === catalogRequestRef.current) setCatalogLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [page, query, selectedCategory, selectedBrand, selectedMaterial, selectedColor, selectedBadge, selectedGender, selectedFrameShape, selectedFrameType, availableOnly, minimumPrice, maximumPrice, sortBy, selectedLocationId]);

  const resetFilters = () => {
    setQuery('');
    setSelectedBrand('');
    setSelectedMaterial('');
    setSelectedColor('');
    setSelectedBadge('');
    setSelectedGender('');
    setSelectedFrameShape('');
    setSelectedFrameType('');
    setAvailableOnly(false);
    setMinimumPrice('');
    setMaximumPrice('');
    setSortBy('relevance');
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('brand');
    params.delete('material');
    params.delete('color');
    params.delete('badge');
    params.delete('gender');
    params.delete('shape');
    params.delete('frameType');
    params.delete('available');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('sort');
    params.delete('page');
    setSearchParams(params, { replace: true });
  };

  const totalPages = Math.max(1, Math.ceil(catalogTotal / PAGE_SIZE));
  const pagedProducts = products;
  const currentCategory = categories.find((category) =>
    category.slug.toLowerCase() === selectedCategory.toLowerCase()
    || category.id.toLowerCase() === selectedCategory.toLowerCase()
    || normalize(category.name) === normalize(selectedCategory));
  const indexableCategory = Boolean(currentCategory && !brandFilter
    && [...searchParams.keys()].every((key) => key === 'category'));
  const indexableBrand = Boolean(brandFilter && !selectedCategory
    && [...searchParams.keys()].every((key) => key === 'brand'));
  const categoryName = currentCategory?.name ?? '';
  const categoryToken = normalize(`${categoryName} ${currentCategory?.slug ?? ''}`);
  const isEyeglasses = /eye\s*glasses?/.test(categoryToken);
  const isSunglasses = /sun\s*glasses?/.test(categoryToken);
  const isContactLenses = /contact\s*lenses?/.test(categoryToken);
  const collectionTitle = isEyeglasses ? 'Eyeglasses'
    : isSunglasses ? 'Sunglasses'
      : isContactLenses ? 'Contact Lenses'
        : categoryName || brandFilter;
  const collectionSeoTitle = indexableCategory
    ? `${collectionTitle} Online in India | DreamSpex`
    : `${brandFilter} Eyewear | Glasses & Sunglasses | DreamSpex`;
  const collectionSeoDescription = indexableCategory
    ? currentCategory?.description?.trim()
      || `Explore ${collectionTitle.toLowerCase()} at DreamSpex. Shop premium styles for every look and occasion.`
    : `Explore ${brandFilter} eyewear at DreamSpex. Shop ${brandFilter} eyeglasses and sunglasses in a range of styles.`;
  const isIndexableCollection = indexableCategory || indexableBrand;
  const collectionCanonicalPath = indexableCategory
    ? `/shop?category=${encodeURIComponent(currentCategory?.slug ?? '')}`
    : indexableBrand
      ? `/shop?brand=${encodeURIComponent(brandFilter)}`
      : '/shop';
  const categoryTitle = currentCategory?.name
    ?? (selectedCategory ? selectedCategory.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : 'Eyeglasses');
  const shopAllHref = selectedCategory ? `/shop?category=${encodeURIComponent(selectedCategory)}` : '/shop';
  const displayedCatalogTotal = catalogCategoryKey === selectedCategory ? catalogTotal : 0;
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    if (!selectedCategory) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('shop-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCategory]);
  const suggestions = ['Aurelia', 'Nocturne', 'Lumen', 'Solstice'];
  const { cart, updateQuantity } = useShop();
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const activeFilterCount = [
    selectedCategory,
    selectedBrand,
    selectedGender,
    selectedFrameShape,
    selectedFrameType,
    selectedMaterial,
    selectedColor,
    selectedBadge,
  ].filter(Boolean).length + (minimumPrice || maximumPrice ? 1 : 0) + Number(availableOnly);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtersOpen]);

  const filterFields = (
    <div className="space-y-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Shop Category
        <select value={selectedCategory} onChange={(event) => { updateCategory(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">By Brand
        <select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All brands</option>{filterOptions.brands.map((brand) => <option key={brand}>{brand}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Gender
        <select value={selectedGender} onChange={(event) => { setSelectedGender(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All genders</option>{filterOptions.genders.map((gender) => <option key={gender}>{gender}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">By Shape
        <select value={selectedFrameShape} onChange={(event) => { setSelectedFrameShape(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All shapes</option>{filterOptions.frameShapes.map((shape) => <option key={shape}>{shape}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Frame type
        <select value={selectedFrameType} onChange={(event) => { setSelectedFrameType(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All frame types</option>{filterOptions.frameTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Shop by Material
        <select value={selectedMaterial} onChange={(event) => { setSelectedMaterial(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All materials</option>{filterOptions.materials.map((material) => <option key={material}>{material}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Shop by Colour
        <select value={selectedColor} onChange={(event) => { setSelectedColor(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All colours</option>{filterOptions.colors.map((color) => <option key={color} value={color}>{formatColorLabel(color)}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#536353]">Featured
        <select value={selectedBadge} onChange={(event) => { setSelectedBadge(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15">
          <option value="">All labels</option>{filterOptions.badges.map((badge) => <option key={badge} value={badge}>{badge}</option>)}
        </select>
      </label>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Price range</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Min
            <input type="number" min="0" value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); setPage(1); }} placeholder="₹0" className="mt-1 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15" />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">Max
            <input type="number" min="0" value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); setPage(1); }} placeholder="No limit" className="mt-1 w-full rounded-xl border border-[#dfe7d7] bg-[#f8f7f2] px-3 py-2.5 text-sm text-[#182116] outline-none transition focus:border-[#7CBF00] focus:ring-2 focus:ring-[#7CBF00]/15" />
          </label>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-[#536353]">
        <input type="checkbox" checked={availableOnly} onChange={(event) => { setAvailableOnly(event.target.checked); setPage(1); }} className="h-4 w-4 accent-[#7CBF00]" />
        In-stock items only
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-800">
      <SEO
        title={isIndexableCollection ? collectionSeoTitle : 'Shop Eyewear Online | DreamSpex'}
        description={isIndexableCollection
          ? collectionSeoDescription
          : 'Browse the DreamSpex eyewear catalogue and use filters to find products for your style.'}
        canonicalPath={collectionCanonicalPath}
        robots={isIndexableCollection ? 'index,follow' : 'noindex,follow'}
      />
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-16">
        <div className="rounded-[28px] border border-[#dfe7d7] bg-white px-5 py-5 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)] sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#5e6b5e]">
            <Link to="/" className="inline-flex items-center gap-1 font-medium text-[#17300d] hover:text-[#24491a]">
              <Home className="h-4 w-4" /> Home
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-[#7a867a]" />
            <span>{categoryTitle}</span>
            <ChevronRightIcon className="h-4 w-4 text-[#7a867a]" />
            <span className="font-semibold text-[#17300d]">Frames</span>
          </div>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-green-dark)]">Premium collection</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-[#182116] sm:text-5xl">{categoryTitle} Frames</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:justify-end">
              <p className="text-sm text-[#5f6c5b]">{catalogLoading && catalogCategoryKey !== selectedCategory ? 'Loading styles...' : `${displayedCatalogTotal} styles ready to explore`}</p>
              <Link to={shopAllHref} className="inline-flex items-center gap-2 rounded-full bg-[#78be20] px-5 py-3 text-sm font-semibold text-[#172015] shadow-[0_10px_24px_-16px_rgba(47,81,22,0.65)] transition hover:bg-[#91cb43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b781a]">
                Shop all {categoryTitle} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6c5b]">Discover frames that match your style.</p>
        </div>

        {prescriptionNotice ? <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-[#7CBF00]/30 bg-[#7CBF00]/10 px-4 py-3 text-sm text-[#17300d]">Select a frame first to add your prescription.</div> : null}
        {catalogLoading ? <p className="mt-6 text-sm text-[#5f6c5b]">Loading catalogue...</p> : null}
        {catalogError ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{catalogError}</p> : null}

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
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => { setQuery(suggestion); setPage(1); }} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-3 py-2 text-sm text-[#4d5c4c] transition hover:border-[#7CBF00]/40 hover:text-[#17300d]">{suggestion}</button>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#17300d]"><FileText className="h-4 w-4 text-[var(--brand-green-dark)]" /> Prescription available on selected eyewear</div>
        </motion.div>

        <div className={`mt-6 grid items-start gap-5 lg:gap-6 ${cartQuantity > 0 ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside aria-label="Product filters" className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[24px] border border-[#dfe7d7] bg-white shadow-[0_16px_38px_-30px_rgba(18,35,18,0.45)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#e7ecdf] px-5 py-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4b781a]">Refine your fit</p>
                    <p className="mt-1 text-xs text-[#687468]">{activeFilterCount} active filters</p>
                  </div>
                  {activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="shrink-0 rounded-full border border-[#dfe7d7] px-3 py-1.5 text-xs font-semibold text-[#355e17] transition hover:border-[#78be20] hover:bg-[#f4f8ef]">Clear</button> : null}
                </div>
                <div className="p-5">{filterFields}</div>
              </div>
            </aside>
            <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[20px] border border-[#dfe7d7] bg-white px-4 py-3 shadow-[0_12px_35px_-30px_rgba(18,35,18,0.45)]">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setFiltersOpen(true)} aria-label={`Open filters, ${activeFilterCount} active`} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dfe7d7] bg-[#f7f5f0] px-3 py-2 text-sm font-medium text-[#17300d] transition hover:border-[#7CBF00]/50 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" /> Filter
                  <span className="rounded-full bg-[#edf7d9] px-2 py-0.5 text-xs font-semibold text-[#17300d]">{activeFilterCount}</span>
                </button>
                <p className="truncate text-sm text-[#536353]">Showing <span className="font-semibold text-[#182116]">{catalogCategoryKey === selectedCategory ? pagedProducts.length : 0}</span> of <span className="font-semibold text-[#182116]">{displayedCatalogTotal}</span> frames</p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={`rounded-full border p-2 ${viewMode === 'grid' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><LayoutGrid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'} className={`rounded-full border p-2 ${viewMode === 'list' ? 'border-[#7CBF00]/40 bg-[#7CBF00]/10 text-[#17300d]' : 'border-[#dfe7d7] bg-[#f7f5f0] text-slate-600'}`}><List className="h-4 w-4" /></button>
              </div>
            </div>

            <div id="shop-products" className={`scroll-mt-28 grid auto-rows-fr gap-4 md:gap-5 ${viewMode === 'grid' ? (cartQuantity > 0 ? 'grid-cols-2 2xl:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4') : 'grid-cols-1'}`}>
              {pagedProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }} className="h-full">
                  <ProductCard product={product} layout={viewMode} />
                </motion.div>
              ))}
              {!catalogLoading && !pagedProducts.length ? <div className="col-span-full rounded-[24px] border border-[#dfe7d7] bg-white p-8 text-center"><p className="font-serif text-2xl text-[#182116]">No frames match your current selection.</p><p className="mt-2 text-sm text-[#5f6c5b]">Try broadening your search or resetting the filters.</p><button type="button" onClick={resetFilters} className="mt-5 rounded-full bg-[#edf4e7] px-4 py-2.5 text-sm font-semibold text-[#355e17]">Reset filters</button></div> : null}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#dfe7d7] bg-white px-4 py-4 shadow-[0_12px_35px_-30px_rgba(18,35,18,0.45)]">
              <p className="text-sm text-[#536353]">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2.5 text-[#17300d]"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <button key={value} onClick={() => setPage(value)} className={`h-10 w-10 rounded-full text-sm ${page === value ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'border border-[#dfe7d7] bg-[#f7f5f0] text-[#182116]'}`}>{value}</button>
                ))}
                <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2.5 text-[#17300d]"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          </div>

          {cartQuantity > 0 && (
            <aside className="hidden xl:block">
              <div className="sticky top-24 rounded-[28px] border border-[#dfe7d7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(18,35,18,0.45)]">
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[#dfe7d7] bg-[#f7f5f0] p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--brand-green-dark)]">Order preview</p>
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
                  <Link to="/checkout" className="inline-flex w-full items-center justify-center rounded-full bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-primary)]">Checkout <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      <AnimatePresence>
        {filtersOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-filter-title"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 left-0 flex h-dvh w-[min(100vw,28rem)] flex-col border-r border-[#dfe7d7] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#e7ecdf] px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--brand-green-dark)]">Filters</p>
                  <h2 id="shop-filter-title" className="mt-1 text-xl font-semibold text-[#182116]">Refine your search</h2>
                </div>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="rounded-full border border-[#dfe7d7] bg-[#f7f5f0] p-2 text-[#17300d]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{filterFields}</div>
              <div className="flex gap-3 border-t border-[#e7ecdf] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <button type="button" onClick={resetFilters} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#7CBF00] hover:text-[#17300d]">Clear All</button>
                <button type="button" onClick={() => setFiltersOpen(false)} className="flex-1 rounded-full bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-primary)]">Apply Filters</button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
