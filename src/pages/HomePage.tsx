import { useEffect, useState } from 'react';
import { ArrowRight, Camera, ChevronRight, Eye, Feather, FileText, Gift, Glasses, House, MapPin, ScanFace, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import ProductCard from '../components/ui/ProductCard';
import { categories, coupons, membershipPlans, products } from '../data/mockData';
import { HERO_IMAGE_URL, HERO_MOBILE_IMAGE_URL, HERO_MOBILE_VIDEO_URL, HERO_VIDEO_URL } from '../config/siteMedia';
import { formatINR } from '../utils/currency';
const categoryDetails = [
  { name: 'Everyday Frames', slug: 'frames', image: products.find((product) => product.category === 'Frames')?.image ?? categories[0].image, copy: 'Classic styles for every look' },
  { name: 'Statement Sunglasses', slug: 'sunglasses', image: products.find((product) => product.category === 'Sunglasses')?.image ?? categories[1].image, copy: 'Bold looks for brighter days' },
  { name: 'Screen Comfort', slug: 'computer-glasses', image: products.find((product) => product.category === 'Computer Glasses')?.image ?? categories[5].image, copy: 'Blue light glasses for a healthier you' },
  { name: 'Kids’ Eyewear', slug: 'kids-collection', image: products.find((product) => product.category === 'Kids Collection')?.image ?? categories[4].image, copy: 'Comfortable & durable for growing eyes' },
];

const supportedMaterials = [...new Set(products.map((product) => product.material))];
const supportedColors = [...new Set(products.flatMap((product) => product.colors))];
const supportedBrands = [...new Set(products.map((product) => product.brand))];
const supportedShapes = [...new Set(products.map((product) => product.frameShape).filter((shape): shape is string => Boolean(shape)))];
const supportedGenders = [...new Set(products.map((product) => product.gender).filter((gender): gender is string => Boolean(gender)))];
const colorSwatches: Record<string, string> = {
  Midnight: '#1f2937',
  Titanium: '#9ca3af',
  Black: '#111827',
  Golden: '#c59b45',
  Slate: '#64748b',
  Blue: '#2563eb',
  Ivory: '#f4efe3',
  Onyx: '#292524',
};

const services = [
  { icon: Stethoscope, title: 'Eye-care appointment', copy: 'Explore appointment options and service details.', path: '/services#appointments' },
  { icon: FileText, title: 'Prescription support', copy: 'Add prescription details in the guided frame order flow.', path: '/shop?category=frames' },
  { icon: Camera, title: 'Virtual try-on', copy: 'Find your fit before you commit, from the comfort of home.', path: '/virtual-try-on' },
];

const homeServiceLinks = [
  { icon: House, title: 'Home Eye Test', copy: 'Explore at-home eye care', path: '/services#appointments' },
  { icon: ScanFace, title: 'Virtual Try-On', copy: 'See it before you buy', path: '/virtual-try-on' },
  { icon: MapPin, title: 'Store Locator', copy: 'Find a store near you', path: '/stores' },
  { icon: Gift, title: 'Exclusive Offers', copy: 'Explore member offers', path: '/offers' },
];

function FaceShapeIllustration({ shape }: { shape: string }) {
  const paths: Record<string, string> = {
    Round: 'M50 13C30 13 20 30 20 57s11 43 30 43 30-16 30-43S70 13 50 13Z',
    Oval: 'M50 10C31 10 25 29 25 57s6 43 25 43 25-15 25-43S69 10 50 10Z',
    Square: 'M28 16h44l8 10v48l-10 20H30L20 74V26l8-10Z',
    Heart: 'M50 96C42 87 22 68 22 39c0-16 19-22 28-8 9-14 28-8 28 8 0 29-20 48-28 57Z',
    Diamond: 'M50 10 78 52 50 100 22 52 50 10Z',
    Long: 'M50 7C32 7 28 27 28 57s4 43 22 43 22-13 22-43S68 7 50 7Z',
  };

  return <svg viewBox="0 0 100 110" aria-hidden="true" className="h-24 w-20 text-[#689f24]/75 transition duration-300 group-hover:text-[#3f7000] sm:h-28 sm:w-24"><path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M36 48h10M54 48h10M46 69h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" opacity=".65" /></svg>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [collectionTab, setCollectionTab] = useState<'trending' | 'bestseller' | 'new'>('trending');
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMedia = () => {
      setIsMobile(mediaQuery.matches);
      setReducedMotion(motionQuery.matches);
    };

    updateMedia();
    mediaQuery.addEventListener('change', updateMedia);
    motionQuery.addEventListener('change', updateMedia);

    return () => {
      mediaQuery.removeEventListener('change', updateMedia);
      motionQuery.removeEventListener('change', updateMedia);
    };
  }, []);

  const slide = products[0];
  const collectionProducts = collectionTab === 'trending'
    ? [...products].sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0)).slice(0, 4)
    : products.filter((product) => product.badge?.toLowerCase() === (collectionTab === 'bestseller' ? 'bestseller' : 'new'));
  const collectionPath = collectionTab === 'trending' ? '/shop?sort=popularity' : `/shop?badge=${collectionTab === 'bestseller' ? 'Bestseller' : 'New'}`;
  const heroPoster = isMobile ? HERO_MOBILE_IMAGE_URL : HERO_IMAGE_URL;
  const heroVideoSrc = isMobile ? HERO_MOBILE_VIDEO_URL : HERO_VIDEO_URL;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Helmet><title>Dream Spex | See Better. Look Remarkable.</title><meta name="description" content="Premium eyewear, precision lenses and expert optical care from Dream Spex." /></Helmet>
      <Navbar />
      <main>
        <section aria-label="Featured eyewear" className="premium-hero">
          <div className="premium-hero__media">
            {!reducedMotion && !videoError ? (
              <video
                key={isMobile ? 'mobile-video' : 'desktop-video'}
                className="premium-hero__video"
                src={heroVideoSrc}
                poster={heroPoster}
                autoPlay
                muted
                loop
                playsInline
                preload={isMobile ? 'metadata' : 'auto'}
                onError={() => setVideoError(true)}
                aria-label="Dream Spex eyewear promotional video"
              />
            ) : (
              <img src={heroPoster} alt="Dream Spex eyewear lifestyle banner" className="premium-hero__video premium-hero__fallback" />
            )}
            <div className="premium-hero__overlay" aria-hidden="true" />
          </div>

          <div className="premium-hero__content">
            <div className="premium-hero__eyebrow">
              <Sparkles className="h-4 w-4" />
              <span>Dream Spex</span>
              <span className="premium-hero__divider" aria-hidden="true">|</span>
              <span>Eyewear</span>
            </div>
            <h1>See your world differently.</h1>
            <p>Find frames that fit your style, your day, your vision.</p>
            <div className="premium-hero__actions">
              <Link to={`/shop?category=${slide.category.toLowerCase().replace(/\s+/g, '-')}`} className="premium-hero__primary">
                Shop eyeglasses
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shop?category=sunglasses" className="premium-hero__secondary">
                Explore sunglasses
              </Link>
            </div>
            <div className="premium-hero__benefits">
              <span><Glasses aria-hidden="true" /><span>Stylish<br />collections</span></span>
              <span><ShieldCheck aria-hidden="true" /><span>UV protection<br />for every day</span></span>
              <span><Feather aria-hidden="true" /><span>Lightweight<br />& comfortable</span></span>
            </div>
          </div>
        </section>

        <div className="homepage-main-sections">
          <section aria-label="Shop eyewear collections" className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {categoryDetails.map((category, index) => (
                <motion.div key={category.slug} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .06 }} className="h-full">
                  <Link to={`/shop?category=${category.slug}`} className="home-category-card group h-full">
                    <div className="home-category-card__image">
                      <img src={category.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    </div>
                    <div className="home-category-card__content">
                      <h2 className="font-serif text-base font-medium text-[#17231C] sm:text-lg">{category.name}</h2>
                      <p className="text-xs leading-5 text-[#2d3a34] sm:text-sm">{category.copy}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3d6b3d] sm:text-sm">Shop now <ArrowRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          <section aria-label="Services and store information" className="home-service-strip">
            <div className="home-service-strip__grid">
              {homeServiceLinks.map(({ icon: Icon, title, copy, path }) => (
                <Link key={title} to={path} className="home-service-strip__item">
                  <Icon aria-hidden="true" />
                  <span className="home-service-strip__copy"><span>{title}</span><span>{copy}</span></span>
                  <ArrowRight aria-hidden="true" className="home-service-strip__arrow" />
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="wearer-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Shop by wearer</p><h2 id="wearer-title" className="mt-2 font-serif text-3xl text-[var(--text-primary)]">Find styles for your needs</h2></div><p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">Audience labels come from the sample catalogue; they are not fit or sizing recommendations.</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {supportedGenders.map((gender) => {
                const product = products.find((item) => item.gender === gender);
                if (!product) return null;
                return <Link key={gender} to={`/shop?gender=${encodeURIComponent(gender)}`} className="group flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-1 hover:shadow-md"><img src={product.image} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover" /><span><span className="block text-lg font-semibold text-[var(--text-primary)]">{gender}</span><span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#689f24]">Shop styles <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></span></Link>;
              })}
            </div>
          </section>

          <section aria-label="shop by brand" className="border-y border-black/10 bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The brands we carry</p><h2 id="brand-showcase-title" className="mt-2 font-serif text-3xl text-[#182116]">Explore by brand</h2></div>
                <p className="max-w-md text-sm leading-6 text-[#5f6c5b]">Brand names are drawn from the current product catalogue.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {supportedBrands.map((brand) => <Link key={brand} to={`/shop?brand=${encodeURIComponent(brand)}`} className="rounded-xl border border-[#d5dfd1] bg-[#f7f9f5] px-6 py-4 text-lg font-semibold tracking-wide text-[#263322] transition hover:border-[#689f24] hover:bg-white hover:text-[#4b781a]">{brand}<span className="ml-3 text-xs font-normal text-[#687468]">Shop frames</span></Link>)}
              </div>
            </div>
          </section>

          <section className="border-y border-black/10 bg-[#f0f4ed] py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Shop by material</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Made from considered materials</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#5f6c5b]">Browse materials and colours represented in the current product catalogue.</p><div className="mt-6 flex flex-wrap gap-3">{supportedMaterials.map((material) => <Link key={material} to={`/shop?material=${encodeURIComponent(material)}`} className="rounded-full border border-[#cbd7c5] bg-white px-5 py-3 text-sm font-semibold text-[#263322] transition hover:border-[#689f24] hover:text-[#4b781a]">{material}</Link>)}</div><h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-[#5d6c55]">Shop by colour</h3><div className="mt-4 flex flex-wrap gap-3">{supportedColors.map((color) => <Link key={color} to={`/shop?color=${encodeURIComponent(color)}`} className="inline-flex items-center gap-2 rounded-full border border-[#cbd7c5] bg-white px-4 py-2.5 text-sm text-[#263322] transition hover:border-[#689f24] hover:text-[#4b781a]"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-black/20" style={{ backgroundColor: colorSwatches[color] ?? '#94a3b8' }} />{color}</Link>)}</div></div></section>

          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Discover the edit</p><h2 className="mt-3 font-serif text-4xl">Fresh arrivals &amp; featured frames</h2></div></div><div className="mt-8 grid gap-4 md:grid-cols-3"><Link to="/shop?badge=New" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">New arrivals</p><p className="mt-3 font-serif text-2xl">Fresh from the collection</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{products.filter((product) => product.badge?.toLowerCase() === 'new').length} new-tagged {products.filter((product) => product.badge?.toLowerCase() === 'new').length === 1 ? 'style' : 'styles'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore arrivals <ArrowRight className="h-4 w-4" /></span></Link><Link to="/shop?badge=Bestseller" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Catalogue highlights</p><p className="mt-3 font-serif text-2xl">Selected by Dream Spex</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Shop styles labelled bestseller in the catalogue.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore selected frames <ArrowRight className="h-4 w-4" /></span></Link><Link to="/shop?category=luxury-collection" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Featured collection</p><p className="mt-3 font-serif text-2xl">Luxury Collection</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Explore products carrying this catalogue category.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore collection <ArrowRight className="h-4 w-4" /></span></Link></div></section>

          <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">The edit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">Shop by frame shape</h2><p className="mt-3 max-w-xl text-sm text-[var(--text-secondary)]">Browse shapes represented in the current catalogue. Shape labels do not guarantee fit.</p></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#4b781a] sm:flex">Browse all styles <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{supportedShapes.map((shape) => { const product = products.find((item) => item.frameShape === shape); return product ? <Link key={shape} to={`/shop?shape=${encodeURIComponent(shape)}`} aria-label={`Shop ${shape} frames`} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#e1e8dc]"><img src={product.image} alt={`${shape} eyewear`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10 text-[#ffffff]"><span className="font-semibold drop-shadow">{shape}</span><span className="rounded-full bg-white/90 p-2 text-[#172015] shadow-sm"><ArrowRight className="h-4 w-4" /></span></div></Link> : null; })}</div></div></section>

          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 md:grid-cols-[.72fr_1.28fr] md:p-10"><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Find your fit</p><h2 className="mt-3 font-serif text-4xl">Frames for your face</h2><p className="mt-4 max-w-md text-[var(--text-secondary)]">Explore common face shapes, then preview frames with virtual try-on. The current catalogue does not yet map individual frames to face shapes.</p><Link to="/virtual-try-on" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#7cbf00] px-5 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[#9acd32]">Try frames virtually <ArrowRight className="h-4 w-4" /></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{['Round', 'Oval', 'Square', 'Heart', 'Diamond', 'Long'].map((shape) => <article key={shape} className="group relative flex min-h-32 items-center justify-between overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"><span className="relative z-10 self-end pb-1">{shape}</span><FaceShapeIllustration shape={shape} /></article>)}</div></div></section>

          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The current edit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">{collectionTab === 'trending' ? 'Trending eyewear' : collectionTab === 'bestseller' ? 'Bestsellers' : 'New arrivals'}</h2></div>
              <Link to={collectionPath} className="inline-flex items-center gap-1 text-sm font-semibold text-[#689f24]">Explore collection <ChevronRight className="h-4 w-4" /></Link>
            </div>
            <div role="group" aria-label="Product collections" className="mt-6 flex flex-wrap gap-2">
              {([['trending', 'Trending'], ['bestseller', 'Bestsellers'], ['new', 'New arrivals']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setCollectionTab(tab)} aria-pressed={collectionTab === tab} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${collectionTab === tab ? 'border-[#689f24] bg-[#689f24] text-white' : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[#689f24]'}`}>{label}</button>)}
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {collectionProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              {!collectionProducts.length ? <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">No products currently carry this collection label.</p> : null}
            </div>
            {collectionTab === 'trending' ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Trending order uses sample popularity scores in the product catalogue.</p> : null}
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="grid overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[#e9eee4] lg:grid-cols-[1fr_1.1fr]"><div className="p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">Try before you choose</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#182116]">Your next pair is closer than you think.</h2><p className="mt-5 max-w-md leading-7 text-[#5f6c5b]">Upload a photo or use your camera to preview selected frames. Switch styles until the right one feels obvious.</p><Link to="/virtual-try-on" className="mt-8 inline-flex"><Button><Camera className="mr-2 h-4 w-4" /> Start virtual try-on</Button></Link></div><div className="relative min-h-[300px]"><img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=90" alt="Person wearing stylish spectacles" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div></div></section>

          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Why Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">A clearer way to choose eyewear</h2></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Link to="/categories" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><Eye className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Browse a considered edit</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Explore products and categories available in the current catalogue.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore products <ArrowRight className="h-4 w-4" /></span></Link>
              <Link to="/prescription/1" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><FileText className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Personalise your lenses</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Use the existing prescription and lens selection flow with a supported frame.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">See lens options <ArrowRight className="h-4 w-4" /></span></Link>
              <Link to="/stores" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><MapPin className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Find a store</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Browse the locations in the Dream Spex store directory.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">View locations <ArrowRight className="h-4 w-4" /></span></Link>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[#e9eee4] text-[var(--text-primary)] shadow-[0_24px_60px_-42px_rgba(24,34,24,0.3)]">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">Home trial</p>
                  <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight sm:text-5xl">Try frames at home.</h2>
                  <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-secondary)]">Explore a home try-on enquiry and check availability with your preferred store. This demo does not schedule visits.</p>
                  <Link to="/services#appointments" className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#7cbf00] px-5 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[#9acd32]">
                    Explore home trial <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.35 }} className="relative min-h-[300px] overflow-hidden bg-[#dfe7d8] sm:min-h-[380px] lg:min-h-[440px]">
                  <img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1400&q=90" alt="Person wearing premium eyewear at home" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/5" />
                  <div className="absolute bottom-5 left-5 rounded-full border border-white/50 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#263322] shadow-sm backdrop-blur-md">Try it your way</div>
                </motion.div>
              </div>
              <div className="border-t border-[var(--border-subtle)] px-5 py-6 sm:px-8 lg:px-12">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {['Browse frames', 'Choose a service', 'Preview an enquiry', 'Confirm with store', 'Order online'].map((step, index) => (
                    <div key={step} className="relative flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-white/75 px-4 py-3 sm:block sm:min-h-[92px] sm:px-4 sm:py-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7cbf00] text-xs font-bold text-[#172015]">0{index + 1}</span>
                      <p className="text-sm font-semibold text-[var(--text-primary)] sm:mt-4">{step}</p>
                      {index < 4 ? <span className="hidden lg:block absolute -right-2 top-1/2 h-px w-4 bg-[#7cbf00]/45" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-black/10 bg-[#f0f4ed] py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Optical care</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">More than a frame store.</h2><p className="mt-5 leading-7 text-[#5f6c5b]">From first prescription to final fit, our optical specialists make every step clear and comfortable.</p><Link to="/services" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#5d9417]">Explore services <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-3">{services.map(({ icon: Icon, title, copy, path }) => <Link key={title} to={path} className="rounded-2xl border border-[#d3dfcd] bg-white p-5 transition hover:-translate-y-1"><Icon className="h-6 w-6 text-[#689f24]" /><h3 className="mt-8 font-semibold text-[#182116]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#687468]">{copy}</p></Link>)}</div></div></div></section>

          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl border border-[var(--border-subtle)] bg-[#e9eee4] p-8 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4b781a]">Dream Spex membership</p><h2 className="mt-3 max-w-lg font-serif text-4xl text-[#182116]">Better care, year after year.</h2><div className="mt-8 grid gap-3 sm:grid-cols-3">{membershipPlans.map((plan) => <button key={plan.id} onClick={() => navigate(`/membership/checkout?plan=${plan.name.toLowerCase()}`)} className="rounded-2xl border border-[#d5dfd1] bg-white p-4 text-left text-[#182116] transition hover:border-[#689f24] hover:shadow-sm"><p className="text-sm font-semibold text-[#4b781a]">{plan.name}</p><p className="mt-2 text-2xl font-semibold">{formatINR(plan.price)}</p><p className="mt-3 text-xs leading-5 text-[#5f6c5b]">{plan.perks[0]}</p></button>)}</div></div><div className="rounded-3xl border border-[#d5dfd1] bg-[#f0f4ed] p-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Offers</p><h2 className="mt-3 font-serif text-3xl text-[#182116]">A little more clarity for less.</h2><div className="mt-6 space-y-3">{coupons.map((coupon) => <div key={coupon.code} className="flex items-center justify-between border-b border-[#d5dfd1] pb-3"><div><p className="font-semibold text-[#182116]">{coupon.discount} <span className="font-normal text-[#687468]">{coupon.title}</span></p><p className="text-xs text-[#687468]">Code: {coupon.code}</p></div><Link to="/offers" className="text-sm font-semibold text-[#5d9417]">View offer</Link></div>)}</div></div></div></section>

          <section className="bg-[#dfe9d8] py-16"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]"><MapPin className="h-4 w-4" /> Visit Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Your vision deserves expert care.</h2></div><div className="flex flex-wrap gap-3"><Link to="/services#appointments"><Button>Explore appointments</Button></Link><Link to="/stores" className="inline-flex items-center gap-2 rounded-full border border-[#a9bba2] px-5 py-3 text-sm font-semibold text-[#182116]">Find a store <ArrowRight className="h-4 w-4" /></Link></div></div></section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
