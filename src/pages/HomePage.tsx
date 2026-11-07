import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, ChevronRight, Eye, Feather, FileText, Gift, Glasses, House, MapPin, ScanFace, ShieldCheck, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import type { Product } from '../types';
import { HERO_IMAGE_URL, HERO_MOBILE_IMAGE_URL } from '../config/siteMedia';
import { fetchHomepage, type HomepageCard, type HomepageProduct, type HomepageResponse, type HomepageSection } from '../services/homepageService';
import { catalogService, toProduct, type CatalogCategory, type CatalogProduct } from '../services/catalogService';
import { resolveCmsMediaUrl } from '../config/api';
import { fetchOffers, type Offer } from '../services/offerService';
import { fetchMembershipPlans, type MembershipPlan } from '../services/membershipService';
import { formatINR } from '../utils/currency';

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

type HomeProduct = Omit<Product, 'id'> & { id: number | string };
type HomeCard = Pick<HomepageCard, 'id' | 'title' | 'subtitle' | 'description' | 'imageUrl' | 'buttonText' | 'destinationType' | 'destinationValue'> & { displayOrder: number };

function CompactHomeProductCard({ product }: { product: HomeProduct }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.35)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--bg-secondary)]">
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.03]" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#689f24]">{product.category}</p>
        <h3 className="mt-2 text-base font-semibold leading-5 text-[var(--text-primary)]">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{product.description}</p>

        <div className="mt-auto pt-3">
          <p className="text-base font-semibold text-[var(--text-primary)]">{formatINR(product.price)}</p>
          <Link to={`/product/${product.id}`} className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--brand-green)] px-3.5 py-2 text-xs font-semibold text-[#172015] transition hover:bg-[var(--brand-green-light)]">
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
}

const homepageSectionSlugs = {
  categories: 'shop-collections',
  services: 'service-strip',
  wearer: 'shop-by-wearer',
  brands: 'premium-brands',
  materials: 'materials-colours',
  edit: 'featured-edit',
  shapes: 'frame-shapes',
  faceFit: 'face-shape-finder',
  collections: 'product-collections',
  tryOn: 'virtual-try-on',
  why: 'why-dream-spex',
  membership: 'membership-offers',
  stores: 'store-cta',
  promos: 'brand-promotions',
} as const;

function CmsSectionGate({ slug, sections, children }: { slug: string; sections: HomepageSection[]; children: React.ReactNode }) {
  const section = sections.find((item) => item.slug === slug);
  return section?.enabled === false ? null : <>{children}</>;
}

function cmsHidden(slug: string, sections: HomepageSection[]) {
  return sections.find((item) => item.slug === slug)?.enabled === false;
}

function cmsText(sections: HomepageSection[], slug: string, field: 'title' | 'subtitle', fallback: string) {
  const value = sections.find((item) => item.slug === slug)?.[field];
  return value?.trim() || fallback;
}

function homepageProduct(item: HomepageProduct): HomeProduct {
  return {
    id: item.id,
    name: item.name,
    category: item.category ?? 'Eyewear',
    brand: item.brand,
    price: Number(item.price),
    oldPrice: item.compareAtPrice == null ? undefined : Number(item.compareAtPrice),
    image: resolveCmsMediaUrl(item.imageUrl) ?? '',
    badge: item.badge ?? undefined,
    rating: 0,
    reviews: 0,
    stock: 'Out of Stock',
    description: item.description ?? '',
    colors: [],
    sizes: [],
    material: '',
  };
}

function catalogHomeProduct(item: CatalogProduct): HomeProduct {
  const mapped = toProduct(item);
  return { ...mapped, id: item.id, image: resolveCmsMediaUrl(mapped.image) ?? '' };
}

function cmsSelectedProducts(sections: HomepageSection[], slug: string, fallback: HomeProduct[]): HomeProduct[] {
  const section = sections.find((item) => item.slug === slug);
  if (!section?.products.length) return fallback;
  const selected = section.products
    .filter((item) => item.imageUrl && item.name && item.price >= 0)
    .map((item) => homepageProduct(item));
  return selected.length ? selected : fallback;
}

function homepageCardHref(card: Pick<HomepageCard, 'destinationType' | 'destinationValue'>) {
  const value = encodeURIComponent(card.destinationValue);
  switch (card.destinationType) {
    case 'CATEGORY': return `/shop?category=${value}`;
    case 'PRODUCT': return `/product/${value}`;
    case 'BRAND': return `/shop?brand=${value}`;
    case 'GENDER': return `/shop?gender=${value}`;
    case 'SHAPE': return `/shop?shape=${value}`;
    case 'PAGE': return card.destinationValue;
  }
}

function CmsHero({ banners, isMobile, reducedMotion, onImageError }: { banners: HomepageResponse['banners']; isMobile: boolean; reducedMotion: boolean; onImageError: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bannerCount = banners.length;
  const activeBanner = banners[activeIndex % bannerCount];
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);
  const isPlayingVideo = !isMobile && activeBanner.desktopMediaType === 'VIDEO' && Boolean(activeBanner.desktopVideoUrl) && failedVideoId !== activeBanner.id;

  const moveTo = (nextIndex: number, nextDirection = nextIndex >= activeIndex ? 1 : -1) => {
    setDirection(nextDirection);
    setActiveIndex((nextIndex + bannerCount) % bannerCount);
  };

  useEffect(() => {
    if (reducedMotion || paused || bannerCount < 2) return undefined;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((index) => (index + 1) % bannerCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeBanner.id, bannerCount, paused, reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused || reducedMotion) {
      video.pause();
      return;
    }
    void video.play().catch(() => setFailedVideoId(activeBanner.id));
  }, [activeBanner.id, isPlayingVideo, paused, reducedMotion]);

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 50 || bannerCount < 2) return;
    moveTo(activeIndex + (distance < 0 ? 1 : -1));
  };

  return <section
    aria-label="Featured eyewear"
    className="premium-hero"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
    }}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    <div className="premium-hero__media" aria-live="polite">
      <AnimatePresence initial={false} custom={direction}>
        {banners.map((banner, index) => {
          if (index !== activeIndex % bannerCount) return null;
          const videoFailed = failedVideoId === banner.id;
          const imageUrl = isMobile
            ? banner.mobileImageUrl ?? ''
            : videoFailed
              ? banner.desktopImageUrl || banner.mobileImageUrl || ''
              : banner.desktopImageUrl;
          return <motion.div
            key={banner.id}
            custom={direction}
            initial={{ x: reducedMotion ? 0 : direction > 0 ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: reducedMotion ? 0 : direction > 0 ? '-100%' : '100%' }}
            transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="premium-hero__slide absolute inset-0"
          >
            {isMobile || banner.desktopMediaType === 'IMAGE' || videoFailed ? <img src={imageUrl} alt={banner.title} loading="eager" fetchPriority="high" decoding="async" onError={onImageError} className="premium-hero__video premium-hero__fallback" style={{ objectPosition: banner.positioning ?? 'center' }} /> : <video
              ref={videoRef}
              src={banner.desktopVideoUrl ?? undefined}
              muted
              loop
              playsInline
              autoPlay={!paused && !reducedMotion}
              preload="metadata"
              onError={() => setFailedVideoId(banner.id)}
              className="premium-hero__video premium-hero__fallback"
              style={{ objectPosition: banner.positioning ?? 'center' }}
            />}
            <div className="premium-hero__overlay" aria-hidden="true" />
            <div className="premium-hero__content">
              <div className="premium-hero__eyebrow"><Sparkles className="h-4 w-4" /><span>Dream Spex</span><span className="premium-hero__divider" aria-hidden="true">|</span><span>Eyewear</span></div>
              <h1 className={banner.title.trim().toUpperCase() === 'DREAM SPEX' ? 'premium-hero__title--brand' : undefined}>{banner.title}</h1>
              {banner.subtitle ? <p>{banner.subtitle}</p> : null}
              {banner.description ? <p className="max-w-xl text-sm">{banner.description}</p> : null}
              <div className="premium-hero__actions">
                {banner.linkUrl && banner.buttonText ? <Link to={banner.linkUrl} className="premium-hero__primary">{banner.buttonText}<ArrowRight className="h-4 w-4" /></Link> : null}
                {banner.secondaryLinkUrl && banner.secondaryButtonText ? <Link to={banner.secondaryLinkUrl} className="premium-hero__secondary">{banner.secondaryButtonText}</Link> : null}
              </div>
            </div>
          </motion.div>;
        })}
      </AnimatePresence>
    </div>
    {bannerCount > 1 ? <>
      <div className="absolute inset-x-7 bottom-5 z-10 flex items-center justify-between sm:inset-x-10 sm:bottom-7">
        <button type="button" aria-label="Previous banner"         onClick={() => moveTo(activeIndex - 1, -1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur transition hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Next banner"         onClick={() => moveTo(activeIndex + 1, 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur transition hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" role="group" aria-label="Choose homepage banner">
        {banners.map((banner, index) => <button
          key={banner.id}
          type="button"
          aria-label={`Show banner ${index + 1}: ${banner.title}`}
          aria-current={index === activeIndex % bannerCount ? 'true' : undefined}
          onClick={() => moveTo(index)}
          className={`h-2.5 rounded-full transition-all ${index === activeIndex % bannerCount ? 'w-6 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80'}`}
        />)}
      </div>
    </> : null}
  </section>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [cms, setCms] = useState<HomepageResponse | null>(null);
  const [catalog, setCatalog] = useState<{ products: CatalogProduct[]; categories: CatalogCategory[] } | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [membershipError, setMembershipError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [cmsError, setCmsError] = useState('');
  const [collectionTab, setCollectionTab] = useState<'trending' | 'bestseller' | 'new'>('trending');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [cmsHeroError, setCmsHeroError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [bannerClock, setBannerClock] = useState(() => Date.now());
  const activeBanners = useMemo(() => (cms?.banners ?? []).filter((banner) => (
    banner.status === 'PUBLISHED'
    && (!banner.startsAt || new Date(banner.startsAt).getTime() <= bannerClock)
    && (!banner.endsAt || new Date(banner.endsAt).getTime() > bannerClock)
    && (!isMobile || Boolean(banner.mobileImageUrl))
  )).sort((a, b) => a.sortOrder - b.sortOrder), [bannerClock, cms?.banners, isMobile]);
  const firstActiveBannerId = activeBanners[0]?.id;

  useEffect(() => {
    const controller = new AbortController();
    void fetchHomepage(controller.signal).then((homepage) => {
      setCms(homepage);
      if (import.meta.env.DEV && homepage.banners.length === 0) {
        console.info('[CMS homepage] No published banner returned; using the original Dream Spex hero', {
          endpoint: '/api/v1/homepage',
        });
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setCmsError(error instanceof Error ? error.message : 'Homepage content is unavailable.');
        if (import.meta.env.DEV) {
          console.error('[CMS homepage] Public API request failed; using the original Dream Spex hero', {
            endpoint: '/api/v1/homepage',
            error,
          });
        }
      }
    });
    const params = new URLSearchParams({ page: '0', pageSize: '100', sort: 'newest' });
    void Promise.all([catalogService.search(params), catalogService.categories()])
      .then(([productPage, categories]) => {
        if (!controller.signal.aborted) setCatalog({ products: productPage.items, categories });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : 'Catalogue data is unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    void fetchOffers(controller.signal)
      .then(setOffers)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setOffersError(error instanceof Error ? error.message : 'Unable to load current offers.');
      })
      .finally(() => { if (!controller.signal.aborted) setOffersLoading(false); });
    void fetchMembershipPlans(controller.signal)
      .then((plans) => setMembershipPlans(plans.filter((plan) => plan.status === 'ACTIVE')))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMembershipError(error instanceof Error ? error.message : 'Unable to load membership plans.');
      })
      .finally(() => { if (!controller.signal.aborted) setMembershipLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setBannerClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setCmsHeroError(false);
  }, [firstActiveBannerId]);

  useEffect(() => {
    if (import.meta.env.DEV && activeBanners.length) {
      console.info('[CMS homepage] Rendering customer banner slider', {
        count: activeBanners.length,
        viewport: isMobile ? 'mobile' : 'desktop',
        bannerIds: activeBanners.map((banner) => banner.id),
      });
    }
  }, [activeBanners, isMobile]);

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

  const sections = cms?.sections ?? [];
  const catalogHomeProducts = (catalog?.products ?? []).map(catalogHomeProduct);
  const supportedMaterials = [...new Set((catalog?.products ?? [])
    .map((product) => product.material)
    .filter((material): material is string => Boolean(material)))];
  const supportedColors = [...new Set((catalog?.products ?? []).flatMap((product) => product.variants
    .filter((variant) => variant.status.toUpperCase() === 'ACTIVE')
    .map((variant) => variant.color)
    .filter((color): color is string => Boolean(color))))];
  const activeHomepageOffers = offers.filter((offer) => offer.active
    && offer.publicationStatus === 'PUBLISHED'
    && Date.parse(offer.startsAt) <= bannerClock
    && (!offer.endsAt || Date.parse(offer.endsAt) > bannerClock));
  const newArrivalCount = (catalog?.products ?? []).filter((product) => product.badge?.toLowerCase() === 'new').length;
  const bestsellerCount = (catalog?.products ?? []).filter((product) => product.badge?.toLowerCase() === 'bestseller').length;
  const featuredCollection = (catalog?.categories ?? []).find((category) => /collection/i.test(category.name));
  const categoryCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'CATEGORY_BANNER');
  const cmsCategorySection = sections.find((item) => item.slug === homepageSectionSlugs.categories);
  const collectionCategories = categoryCards.length
    ? categoryCards.flatMap((card) => {
      const category = card.category ?? catalog?.categories.find((item) => item.slug === card.destinationValue);
      const image = card.imageUrl ?? category?.imageUrl;
      return category && image ? [{ name: card.title || category.name, slug: category.slug, image, copy: card.subtitle ?? card.description ?? category.description ?? 'Explore the collection' }] : [];
    })
    : cmsCategorySection?.categories.length
      ? cmsCategorySection.categories.filter((category) => category.imageUrl && category.name).map((category) => ({ name: category.name, slug: category.slug, image: category.imageUrl as string, copy: 'Explore the collection' }))
      : (catalog?.categories ?? []).filter((category) => category.imageUrl).map((category) => ({ name: category.name, slug: category.slug, image: resolveCmsMediaUrl(category.imageUrl) ?? category.imageUrl as string, copy: category.description ?? 'Explore the collection' }));
  const heroCategory = catalog?.categories.find((category) => category.slug === 'eyeglasses')
    ?? catalog?.categories[0];
  const cmsCollectionProducts = cmsSelectedProducts(sections, homepageSectionSlugs.collections, catalogHomeProducts);
  const trendingCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'TRENDING_PRODUCT');
  const curatedTrendingProducts = trendingCards.flatMap((card) => {
    if (!card.product) return [];
    const product = homepageProduct({ ...card.product, imageUrl: card.imageUrl ?? card.product.imageUrl });
    return product.image ? [product] : [];
  });
  const collectionProducts = collectionTab === 'trending'
    ? (trendingCards.length ? curatedTrendingProducts : cmsCollectionProducts.slice(0, 4))
    : cmsCollectionProducts.filter((product) => product.badge?.toLowerCase() === (collectionTab === 'bestseller' ? 'bestseller' : 'new'));
  const collectionPath = collectionTab === 'trending' ? '/shop?sort=popularity' : `/shop?badge=${collectionTab === 'bestseller' ? 'Bestseller' : 'New'}`;
  const heroPoster = isMobile ? HERO_MOBILE_IMAGE_URL : HERO_IMAGE_URL;
  const availableBrands = [...new Set((catalog?.products ?? []).map((product) => product.brand).filter(Boolean))];
  const brandCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'EXPLORE_BY_BRAND');
  const visibleBrandCards: HomeCard[] = brandCards.length ? brandCards : availableBrands.map((brand, index) => ({ id: brand, title: brand, subtitle: null, description: null, imageUrl: null, buttonText: 'Shop frames', destinationType: 'BRAND', destinationValue: brand, displayOrder: index }));
  const availableWearers = [...new Set((catalog?.products ?? []).map((product) => product.gender).filter((gender): gender is string => Boolean(gender)))];
  const wearerCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'SHOP_BY_WEARER');
  const visibleWearerCards: HomeCard[] = wearerCards.length ? wearerCards : availableWearers.map((gender, index) => ({ id: gender, title: gender, subtitle: null, description: null, imageUrl: null, buttonText: 'Shop styles', destinationType: 'GENDER', destinationValue: gender, displayOrder: index }));
  const availableShapes = [...new Set((catalog?.products ?? []).map((product) => product.frameShape).filter((shape): shape is string => Boolean(shape)))];
  const shapeCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'FRAME_SHAPE');
  const visibleShapeCards: HomeCard[] = shapeCards.length ? shapeCards : availableShapes.map((shape, index) => ({ id: shape, title: shape, subtitle: null, description: null, imageUrl: null, buttonText: null, destinationType: 'SHAPE', destinationValue: shape, displayOrder: index }));
  const promotionalCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'PROMOTIONAL');

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Helmet><title>Dream Spex | See Better. Look Remarkable.</title><meta name="description" content="Premium eyewear, precision lenses and expert optical care from Dream Spex." /></Helmet>
      <Navbar homepageOverlay />
      <main>
        {activeBanners.length > 0 && !cmsHeroError ? <CmsHero
          banners={activeBanners}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          onImageError={() => {
            if (import.meta.env.DEV) {
              console.error('[CMS homepage] Customer banner image failed; using the original Dream Spex hero', {
                bannerIds: activeBanners.map((banner) => banner.id),
              });
            }
            setCmsHeroError(true);
          }}
        /> : <section aria-label="Featured eyewear" className="premium-hero">
          <div className="premium-hero__media">
            <img src={heroPoster} alt="Dream Spex eyewear lifestyle banner" className="premium-hero__video premium-hero__fallback" />
            <div className="premium-hero__overlay" aria-hidden="true" />
          </div>

          <div className="premium-hero__content premium-hero__content--fallback">
            <div className="premium-hero__eyebrow">
              <Sparkles className="h-4 w-4" />
              <span>Dream Spex</span>
              <span className="premium-hero__divider" aria-hidden="true">|</span>
              <span>Eyewear</span>
            </div>
            <h1>See your world differently.</h1>
            <p>Find frames that fit your style, your day, your vision.</p>
            <div className="premium-hero__actions">
              <Link to={heroCategory ? `/shop?category=${encodeURIComponent(heroCategory.slug)}` : '/shop'} className="premium-hero__primary">
                Shop eyeglasses
                <ArrowRight className="h-4 w-4" />
              </Link>
              {catalog?.categories.some((category) => category.slug === 'sunglasses') ? <Link to="/shop?category=sunglasses" className="premium-hero__secondary">
                Explore sunglasses
              </Link> : null}
            </div>
            <div className="premium-hero__benefits">
              <span><Glasses aria-hidden="true" /><span>Stylish<br />collections</span></span>
              <span><ShieldCheck aria-hidden="true" /><span>UV protection<br />for every day</span></span>
              <span><Feather aria-hidden="true" /><span>Lightweight<br />& comfortable</span></span>
            </div>
          </div>
        </section>}

        <div className="homepage-main-sections">
          <CmsSectionGate slug={homepageSectionSlugs.categories} sections={sections}><section aria-label="Shop eyewear collections" className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {collectionCategories.map((category, index) => (
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
              {!collectionCategories.length ? <p className="col-span-full py-8 text-center text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading categories...' : catalogError || cmsError ? 'Homepage categories could not be loaded.' : 'No active categories are available right now.'}</p> : null}
            </div>
          </section></CmsSectionGate>

          <CmsSectionGate slug={homepageSectionSlugs.services} sections={sections}><section aria-label="Services and store information" className="home-service-strip">
            <div className="home-service-strip__grid">
              {homeServiceLinks.map(({ icon: Icon, title, copy, path }) => (
                <Link key={title} to={path} className="home-service-strip__item">
                  <Icon aria-hidden="true" />
                  <span className="home-service-strip__copy"><span>{title}</span><span>{copy}</span></span>
                  <ArrowRight aria-hidden="true" className="home-service-strip__arrow" />
                </Link>
              ))}
            </div>
          </section></CmsSectionGate>

          <CmsSectionGate slug={homepageSectionSlugs.wearer} sections={sections}><section aria-labelledby="wearer-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Shop by wearer</p><h2 id="wearer-title" className="mt-2 font-serif text-3xl text-[var(--text-primary)]">{cmsText(sections, homepageSectionSlugs.wearer, 'title', 'Find styles for your needs')}</h2></div><p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">{cmsText(sections, homepageSectionSlugs.wearer, 'subtitle', 'Explore styles available in the current catalogue.')}</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleWearerCards.map((card) => {
                const product = catalog?.products.find((item) => item.gender?.toLowerCase() === card.destinationValue.toLowerCase());
                const productImage = product ? catalogHomeProduct(product).image : '';
                const image = card.imageUrl ?? productImage;
                if (!image) return null;
                return <Link key={card.id} to={homepageCardHref(card)} className="group flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-1 hover:shadow-md"><img src={image} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover" /><span><span className="block text-lg font-semibold text-[var(--text-primary)]">{card.title}</span><span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#689f24]">{card.buttonText ?? 'Shop styles'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></span></Link>;
              })}
              {!visibleWearerCards.length ? <p className="col-span-full py-8 text-center text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading catalogue...' : catalogError ? 'Wearer cards could not be loaded.' : 'No wearer collections are available right now.'}</p> : null}
            </div>
          </section></CmsSectionGate>

          <CmsSectionGate slug={homepageSectionSlugs.brands} sections={sections}><section aria-label="shop by brand" className="border-y border-black/10 bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The brands we carry</p><h2 id="brand-showcase-title" className="mt-2 font-serif text-3xl text-[#182116]">{cmsText(sections, homepageSectionSlugs.brands, 'title', 'Explore by brand')}</h2></div>
                <p className="max-w-md text-sm leading-6 text-[#5f6c5b]">Brand names are drawn from the current product catalogue.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                  {visibleBrandCards.map((card) => <Link key={card.id} to={homepageCardHref(card)} className="rounded-xl border border-[#d5dfd1] bg-[#f7f9f5] px-6 py-4 text-lg font-semibold tracking-wide text-[#263322] transition hover:border-[#689f24] hover:bg-white hover:text-[#4b781a]">{card.title}<span className="ml-3 text-xs font-normal text-[#687468]">{card.buttonText ?? 'Shop frames'}</span></Link>)}
                  {!visibleBrandCards.length ? <p className="py-4 text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading brands...' : catalogError ? 'Brand cards could not be loaded.' : 'No brands are available right now.'}</p> : null}
                </div>
            </div>
          </section></CmsSectionGate>

          <section hidden={cmsHidden(homepageSectionSlugs.materials, sections)} className="border-y border-black/10 bg-[#f0f4ed] py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Shop by material</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">{cmsText(sections, homepageSectionSlugs.materials, 'title', 'Made from considered materials')}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#5f6c5b]">Browse materials and colours represented in the current product catalogue.</p><div className="mt-6 flex flex-wrap gap-3">{supportedMaterials.map((material) => <Link key={material} to={`/shop?material=${encodeURIComponent(material)}`} className="rounded-full border border-[#cbd7c5] bg-white px-5 py-3 text-sm font-semibold text-[#263322] transition hover:border-[#689f24] hover:text-[#4b781a]">{material}</Link>)}</div><h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-[#5d6c55]">Shop by colour</h3><div className="mt-4 flex flex-wrap gap-3">{supportedColors.map((color) => <Link key={color} to={`/shop?color=${encodeURIComponent(color)}`} className="inline-flex items-center gap-2 rounded-full border border-[#cbd7c5] bg-white px-4 py-2.5 text-sm text-[#263322] transition hover:border-[#689f24] hover:text-[#4b781a]"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-black/20" style={{ backgroundColor: colorSwatches[color] ?? '#94a3b8' }} />{color}</Link>)}</div></div></section>

          {newArrivalCount > 0 || bestsellerCount > 0 || featuredCollection ? <section hidden={cmsHidden(homepageSectionSlugs.edit, sections)} className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Discover the edit</p><h2 className="mt-3 font-serif text-4xl">Fresh arrivals &amp; featured frames</h2></div></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {newArrivalCount > 0 ? <Link to="/shop?badge=New" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">New arrivals</p><p className="mt-3 font-serif text-2xl">Fresh from the collection</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{newArrivalCount} new-tagged {newArrivalCount === 1 ? 'style' : 'styles'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore arrivals <ArrowRight className="h-4 w-4" /></span></Link> : null}
              {bestsellerCount > 0 ? <Link to="/shop?badge=Bestseller" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Catalogue highlights</p><p className="mt-3 font-serif text-2xl">Selected by Dream Spex</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{bestsellerCount} bestseller {bestsellerCount === 1 ? 'style' : 'styles'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore selected frames <ArrowRight className="h-4 w-4" /></span></Link> : null}
              {featuredCollection ? <Link to={`/shop?category=${encodeURIComponent(featuredCollection.slug)}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Featured collection</p><p className="mt-3 font-serif text-2xl">{featuredCollection.name}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{featuredCollection.description ?? 'Explore this catalogue collection.'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore collection <ArrowRight className="h-4 w-4" /></span></Link> : null}
            </div>
          </section> : null}

          <section hidden={cmsHidden(homepageSectionSlugs.shapes, sections)} className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">The edit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">Shop by frame shape</h2><p className="mt-3 max-w-xl text-sm text-[var(--text-secondary)]">Browse shapes represented in the current catalogue. Shape labels do not guarantee fit.</p></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#4b781a] sm:flex">Browse all styles <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{visibleShapeCards.map((card) => { const product = catalog?.products.find((item) => item.frameShape?.toLowerCase() === card.destinationValue.toLowerCase()); const image = card.imageUrl ?? (product ? catalogHomeProduct(product).image : ''); return image ? <Link key={card.id} to={homepageCardHref(card)} aria-label={`Shop ${card.title} frames`} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#e1e8dc]"><img src={image} alt={`${card.title} eyewear`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10 text-[#ffffff]"><span className="font-semibold drop-shadow">{card.title}</span><span className="rounded-full bg-white/90 p-2 text-[#172015] shadow-sm"><ArrowRight className="h-4 w-4" /></span></div></Link> : null; })}{!visibleShapeCards.length ? <p className="col-span-full py-8 text-center text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading frame shapes...' : catalogError ? 'Frame shape cards could not be loaded.' : 'No frame shapes are available right now.'}</p> : null}</div></div></section>

          <section hidden={cmsHidden(homepageSectionSlugs.faceFit, sections)} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 md:grid-cols-[.72fr_1.28fr] md:p-10"><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Find your fit</p><h2 className="mt-3 font-serif text-4xl">Frames for your face</h2><p className="mt-4 max-w-md text-[var(--text-secondary)]">Explore common face shapes, then preview frames with virtual try-on. The current catalogue does not yet map individual frames to face shapes.</p><Link to="/virtual-try-on" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#7cbf00] px-5 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[#9acd32]">Try frames virtually <ArrowRight className="h-4 w-4" /></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{['Round', 'Oval', 'Square', 'Heart', 'Diamond', 'Long'].map((shape) => <article key={shape} className="group relative flex min-h-32 items-center justify-between overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"><span className="relative z-10 self-end pb-1">{shape}</span><FaceShapeIllustration shape={shape} /></article>)}</div></div></section>

          <section hidden={cmsHidden(homepageSectionSlugs.collections, sections)} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The current edit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">{collectionTab === 'trending' ? 'Trending eyewear' : collectionTab === 'bestseller' ? 'Bestsellers' : 'New arrivals'}</h2></div>
              <Link to={collectionPath} className="inline-flex items-center gap-1 text-sm font-semibold text-[#689f24]">Explore collection <ChevronRight className="h-4 w-4" /></Link>
            </div>
            <div role="group" aria-label="Product collections" className="mt-6 flex flex-wrap gap-2">
              {([['trending', 'Trending'], ['bestseller', 'Bestsellers'], ['new', 'New arrivals']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setCollectionTab(tab)} aria-pressed={collectionTab === tab} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${collectionTab === tab ? 'border-[#689f24] bg-[#689f24] text-white' : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[#689f24]'}`}>{label}</button>)}
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {collectionProducts.map((product) => <CompactHomeProductCard key={product.id} product={product} />)}
              {!collectionProducts.length ? <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">No products currently carry this collection label.</p> : null}
            </div>
            {collectionTab === 'trending' ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Trending styles from the live product catalogue.</p> : null}
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.tryOn, sections)} className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="grid overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[#e9eee4] lg:grid-cols-[1fr_1.1fr]"><div className="p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">Try before you choose</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#182116]">Your next pair is closer than you think.</h2><p className="mt-5 max-w-md leading-7 text-[#5f6c5b]">Upload a photo or use your camera to preview selected frames. Switch styles until the right one feels obvious.</p><Link to="/virtual-try-on" className="mt-8 inline-flex"><Button><Camera className="mr-2 h-4 w-4" /> Start virtual try-on</Button></Link></div><div className="relative min-h-[300px]"><img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=90" alt="Person wearing stylish spectacles" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div></div></section>

          <section hidden={cmsHidden(homepageSectionSlugs.why, sections)} className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Why Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">A clearer way to choose eyewear</h2></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Link to="/categories" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><Eye className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Browse a considered edit</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Explore products and categories available in the current catalogue.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore products <ArrowRight className="h-4 w-4" /></span></Link>
              <Link to="/prescription/1" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><FileText className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Personalise your lenses</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Use the existing prescription and lens selection flow with a supported frame.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">See lens options <ArrowRight className="h-4 w-4" /></span></Link>
              <Link to="/stores" className="rounded-2xl border border-[var(--border-subtle)] bg-[var,--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-md"><MapPin className="h-6 w-6 text-[#689f24]" /><h3 className="mt-4 text-lg font-semibold">Find a store</h3><p className="mt-2 text-sm leading-6 text-[var,--text-secondary]">Browse the locations in the Dream Spex store directory.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">View locations <ArrowRight className="h-4 w-4" /></span></Link>
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.membership, sections)} className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[#e9eee4] text-[var(--text-primary)] shadow-[0_24px_60px_-42px_rgba(24,34,24,0.3)]">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4b781a]">Dream Spex membership</p>
                  <h2 className="mt-3 max-w-lg font-serif text-4xl text-[#182116]">Better care, year after year.</h2>
                  {membershipPlans.length ? <div className="mt-8 grid gap-3 sm:grid-cols-3">{membershipPlans.map((plan) => <button key={plan.id} onClick={() => navigate(`/membership/checkout?plan=${encodeURIComponent(plan.name.toLowerCase())}`)} className="rounded-2xl border border-[#d5dfd1] bg-white p-4 text-left text-[#182116] transition hover:border-[#689f24] hover:shadow-sm"><p className="text-sm font-semibold text-[#4b781a]">{plan.name}</p><p className="mt-2 text-2xl font-semibold">{formatINR(plan.price)}</p><p className="mt-3 text-xs leading-5 text-[#5f6c5b]">{plan.perks[0] ?? plan.description}</p></button>)}</div> : <p className="mt-6 text-sm text-[#5f6c5b]" role={membershipError ? 'alert' : 'status'}>{membershipLoading ? 'Loading membership plans...' : membershipError || 'Membership plans are not available right now.'}</p>}
                  {!membershipPlans.length ? <Link to="/membership" className="mt-4 inline-flex text-sm font-semibold text-[#5d9417]">Explore membership <ArrowRight className="ml-1 h-4 w-4" /></Link> : null}
                </div>
                <div className="rounded-3xl border border-[#d5dfd1] bg-[#f0f4ed] p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Offers</p>
                  <h2 className="mt-3 font-serif text-3xl text-[#182116]">A little more clarity for less.</h2>
                  {offersError ? <p className="mt-6 text-sm text-red-700" role="alert">{offersError}</p> : null}
                  {activeHomepageOffers.length ? <div className="mt-6 space-y-3">{activeHomepageOffers.slice(0, 4).map((offer) => <div key={offer.id} className="flex items-center justify-between gap-4 border-b border-[#d5dfd1] pb-3"><div className="min-w-0"><p className="font-semibold text-[#182116]">{offer.discountType === 'PERCENT' ? `${offer.discountValue}% OFF` : `${formatINR(offer.discountValue)} OFF`} <span className="font-normal text-[#687468]">{offer.title}</span></p>{offer.couponCode ? <p className="text-xs text-[#687468]">Code: {offer.couponCode}</p> : null}{offer.endsAt ? <p className="mt-1 text-xs text-[#687468]">Valid until {new Date(offer.endsAt).toLocaleDateString('en-IN')}</p> : null}</div><Link to={offer.linkUrl || '/offers'} className="shrink-0 text-sm font-semibold text-[#5d9417]">View offer</Link></div>)}</div> : null}
                  {!activeHomepageOffers.length && !offersError ? <p className="mt-6 text-sm text-[#5f6c5b]" role="status">{offersLoading ? 'Loading current offers...' : 'There are no current offers.'}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.stores, sections)} className="bg-[#dfe9d8] py-16"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]"><MapPin className="h-4 w-4" /> Visit Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Your vision deserves expert care.</h2></div><div className="flex flex-wrap gap-3"><Link to="/services#appointments"><Button>Explore appointments</Button></Link><Link to="/stores" className="inline-flex items-center gap-2 rounded-full border border-[#a9bba2] px-5 py-3 text-sm font-semibold text-[#182116]">Find a store <ArrowRight className="h-4 w-4" /></Link></div></div></section>

          <section hidden={cmsHidden(homepageSectionSlugs.promos, sections)} aria-label="Brand promotions" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Brand promos</p>
                <h2 className="mt-2 font-serif text-3xl text-[var(--text-primary)]">Premium picks for every day</h2>
              </div>
              <Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#689f24] sm:inline-flex">Browse all styles <ChevronRight className="h-4 w-4" /></Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {promotionalCards.map((card, index) => {
                const image = card.imageUrl ?? card.product?.imageUrl ?? card.category?.imageUrl;
                if (!image) return null;
                return (
                <Link
                  key={card.id}
                  to={homepageCardHref(card)}
                  className={`group relative overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_22px_50px_-36px_rgba(17,24,39,0.25)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-36px_rgba(17,24,39,0.28)] ${index === 0 ? 'lg:col-span-2' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0f1b13]/75 via-[#0f1b13]/30 to-transparent" aria-hidden="true" />
                  <img src={image} alt={card.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />

                  <div className="relative flex min-h-[260px] flex-col justify-between p-5 sm:p-6 lg:min-h-[300px] lg:p-7">
                    <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/90 backdrop-blur-sm">
                      {card.subtitle ?? 'Featured promotion'}
                    </div>

                    <div className="max-w-[18rem]">
                      <h3 className="font-serif text-3xl leading-none text-white sm:text-4xl">{card.title}</h3>
                      {card.description ? <p className="mt-3 max-w-xs text-sm leading-6 text-white/85">{card.description}</p> : null}
                    </div>

                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#172015] shadow-lg shadow-[#0f1b13]/20 transition group-hover:bg-[#dfeec8]">
                      {card.buttonText ?? 'Explore collection'} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );})}
              {!promotionalCards.length ? <p className="py-8 text-sm text-[var(--text-secondary)]" role={cmsError ? 'alert' : 'status'}>{cmsError ? 'Promotions could not be loaded.' : 'No promotions are available right now.'}</p> : null}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
