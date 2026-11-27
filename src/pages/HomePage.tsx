import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronRight, Feather, Gift, Glasses, House, MapPin, ScanFace, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/SEO';
import type { Product } from '../types';
import { HERO_IMAGE_URL, HERO_MOBILE_IMAGE_URL } from '../config/siteMedia';
import { fetchHomepage, type HomepageCard, type HomepageProduct, type HomepageResponse, type HomepageSection } from '../services/homepageService';
import { catalogService, toProduct, type CatalogCategory, type CatalogProduct } from '../services/catalogService';
import { resolveCmsMediaUrl } from '../config/api';
import { fetchOffers, type Offer } from '../services/offerService';
import { fetchMembershipPlans, type MembershipPlan } from '../services/membershipService';
import { formatINR } from '../utils/currency';
import { uniqueColorComponents } from '../utils/colorSwatches';
import ColorSwatch from '../components/ui/ColorSwatch';
import { WEARER_IMAGE_FALLBACK } from '../config/wearerImages';
import { FACE_SHAPE_IMAGES } from '../config/faceShapeImages';
import { deduplicateWearerCards, formatWearerTitle, uniqueWearerValues, wearerLifestyleImage } from '../utils/wearerCategories';
import {
  isDisplayableMembershipCopy,
  membershipDiscountLabel,
  membershipPlanDescription,
  membershipPlanThemeStyle,
  membershipValidityLabel,
} from '../utils/membershipPlanDisplay';

function normalizedCategory(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function normalizedBrandName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function categoryMatchesEyewearType(category: CatalogCategory, type: 'eyeglasses' | 'sunglasses') {
  const token = type === 'eyeglasses' ? 'eyeglass' : 'sunglass';
  return `${normalizedCategory(category.name)} ${normalizedCategory(category.slug)}`.includes(token);
}

function formatFilterLabel(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  const colorAliases: Record<string, string> = {
    't purple': 'Purple',
    't peach': 'Peach',
    'mat black/red': 'Black/Red',
    hawana: 'Havana',
  };
  if (colorAliases[normalized]) return colorAliases[normalized];
  if (normalized === 'tr90') return 'TR90';
  if (normalized === 'tr') return 'TR';
  const minorWords = new Set(['and', 'with', 'of']);
  const formatted = normalized.replace(/(^|[\s/-])([a-z])/g, (match, separator: string, letter: string) => {
    const wordStart = match.slice(separator.length).toLowerCase();
    return `${separator}${minorWords.has(wordStart) && separator ? wordStart : letter.toUpperCase()}`;
  });
  return formatted.replace(/^Tr(?=\s)/, 'TR');
}

function uniqueColorFilterOptions(colors: string[]) {
  return uniqueColorComponents(colors).map((value) => ({ value, label: formatFilterLabel(value) }));
}

const homeServiceLinks = [
   { icon: House, title: 'Franchise', copy: 'Regestration', path: '/franchise' },
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

const faceShapeNames = ['Round', 'Oval', 'Square', 'Heart', 'Diamond', 'Long'] as const;
const FRAME_SHAPE_SCROLL_DISTANCE = 304;

function FaceShapeCarousel({ reducedMotion }: { reducedMotion: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const activeShape = faceShapeNames[activeIndex];
  const isPaused = isHovered || isFocused;

  useEffect(() => {
    if (reducedMotion || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % faceShapeNames.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, reducedMotion]);

  const moveSlide = (offset: number) => {
    setActiveIndex((index) => (index + offset + faceShapeNames.length) % faceShapeNames.length);
  };

  return <div
    role="region"
    aria-label="Face shape examples"
    aria-roledescription="carousel"
    data-active-shape={activeShape}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onFocusCapture={() => setIsFocused(true)}
    onBlurCapture={(event) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
    }}
    className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-white/80 bg-[var(--bg-secondary)] shadow-[0_24px_55px_-30px_rgba(24,34,24,0.42)] md:aspect-[3/2]"
  >
    <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
      <FaceShapeIllustration shape={activeShape} />
    </div>
    <img
      key={activeShape}
      src={FACE_SHAPE_IMAGES[activeShape]}
      alt={`Person wearing glasses for a ${activeShape.toLowerCase()} face shape`}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
      className="absolute inset-0 z-10 h-full w-full object-cover object-center"
    />
    <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
    <div className="absolute right-4 top-4 z-20 flex gap-1.5 rounded-full border border-white/25 bg-black/20 p-2 backdrop-blur-md sm:right-5 sm:top-5" role="group" aria-label="Choose a face shape">
      {faceShapeNames.map((shape, index) => <button
        key={shape}
        type="button"
        aria-label={`Show ${shape} face shape`}
        aria-current={index === activeIndex ? 'true' : undefined}
        onClick={() => setActiveIndex(index)}
        className={`h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${index === activeIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/60 hover:bg-white'}`}
      />)}
    </div>
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Face shape</p>
        <h3 className="mt-1 font-serif text-4xl font-semibold leading-none drop-shadow sm:text-5xl">{activeShape}</h3>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" aria-label="Previous face shape" onClick={() => moveSlide(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/90 text-[#172015] shadow-lg backdrop-blur transition duration-200 hover:bg-[#eaf3df] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Next face shape" onClick={() => moveSlide(1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/90 text-[#172015] shadow-lg backdrop-blur transition duration-200 hover:bg-[#eaf3df] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>;
}

type HomeProduct = Omit<Product, 'id'> & { id: number | string };
type HomeCard = Pick<HomepageCard, 'id' | 'title' | 'subtitle' | 'description' | 'imageUrl' | 'buttonText' | 'destinationType' | 'destinationValue'> & { displayOrder: number };

function CompactHomeProductCard({ product }: { product: HomeProduct }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.35)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        <img src={product.image} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-contain object-center" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#689f24]">{product.category}</p>
        <h3 className="mt-2 text-base font-semibold leading-5 text-[var(--text-primary)]">{product.name}</h3>
        {/* <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{product.description}</p> */}

        <div className="mt-auto pt-3">
          <p className="mb-2 flex items-center gap-1 text-xs text-[var(--text-secondary)]" aria-label={`${product.rating.toFixed(1)} out of 5 from ${product.reviews} verified reviews`}>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{product.rating.toFixed(1)} · {product.reviews} verified reviews
          </p>
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
    case 'GENDER': return `/shop?gender=${encodeURIComponent(card.destinationValue.trim())}`;
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

type HomePageProps = {
  onInitialDataReady: () => void;
  onTaglineChange: (tagline: string | null) => void;
};

export default function HomePage({ onInitialDataReady, onTaglineChange }: HomePageProps) {
  const location = useLocation();
  const [cms, setCms] = useState<HomepageResponse | null>(null);
  const [catalog, setCatalog] = useState<{ products: CatalogProduct[]; categories: CatalogCategory[] } | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [membershipError, setMembershipError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [cmsError, setCmsError] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [cmsHeroError, setCmsHeroError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [bannerClock, setBannerClock] = useState(() => Date.now());
  const [activeCategorySlide, setActiveCategorySlide] = useState(0);
  const [categoryCarouselPaused, setCategoryCarouselPaused] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [showAllColours, setShowAllColours] = useState(false);
  const categoryTouchStartX = useRef<number | null>(null);
  const categorySwipeTriggered = useRef(false);
  const wearerSectionRef = useRef<HTMLElement | null>(null);
  const [wearerCardsVisible, setWearerCardsVisible] = useState(false);
  const frameShapeCarouselRef = useRef<HTMLDivElement | null>(null);
  const [frameShapeCarouselPaused, setFrameShapeCarouselPaused] = useState(false);
  const [activePromotionSlide, setActivePromotionSlide] = useState(0);
  const [promotionCarouselPaused, setPromotionCarouselPaused] = useState(false);
  const promotionTouchStartX = useRef<number | null>(null);
  const promotionSwipeTriggered = useRef(false);
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
      onTaglineChange(homepage.banners.find((banner) => banner.subtitle?.trim())?.subtitle?.trim() ?? null);
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
    }).finally(() => {
      if (!controller.signal.aborted) setCmsLoading(false);
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
  }, [onTaglineChange]);

  useEffect(() => {
    if (!cmsLoading && !catalogLoading) onInitialDataReady();
  }, [catalogLoading, cmsLoading, onInitialDataReady]);

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

  useEffect(() => {
    if (wearerCardsVisible) return undefined;
    if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWearerCardsVisible(true);
      return undefined;
    }

    const section = wearerSectionRef.current;
    if (!section) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setWearerCardsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setWearerCardsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [cmsLoading, reducedMotion, wearerCardsVisible]);

  const sections = cms?.sections ?? [];
  const catalogHomeProducts = (catalog?.products ?? []).map(catalogHomeProduct);
  const supportedMaterials = [...new Set((catalog?.products ?? [])
    .map((product) => product.material)
    .filter((material): material is string => Boolean(material)))];
  const supportedColorGroups = (['eyeglasses', 'sunglasses'] as const).map((type) => {
    const products = catalog?.products ?? [];
    const matchingCategories = [...(catalog?.categories ?? []), ...products.flatMap((product) => product.categories)]
      .filter((category) => category.status.toUpperCase() === 'ACTIVE'
        && category.categoryType !== 'OFFER'
        && categoryMatchesEyewearType(category, type));
    const canonicalName = type === 'eyeglasses' ? 'eyeglasses' : 'sunglasses';
    const category = matchingCategories.find((item) => normalizedCategory(item.slug) === canonicalName
      || normalizedCategory(item.name) === canonicalName) ?? matchingCategories[0];
    const colors = uniqueColorComponents(products
      .filter((product) => product.categories.some((item) => categoryMatchesEyewearType(item, type)))
      .flatMap((product) => product.variants
        .filter((variant) => variant.status.toUpperCase() === 'ACTIVE')
        .map((variant) => variant.color)
        .filter((color): color is string => Boolean(color))));
    return {
      type,
      label: type === 'eyeglasses' ? 'Eyeglasses' : 'Sunglasses',
      categorySlug: category?.slug,
      colors,
    };
  }).filter((group) => group.categorySlug && group.colors.length > 0);
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
  const categoryCarousel = [
    { token: 'sunglass', title: 'Sunglasses' },
    { token: 'eyeglass', title: 'Eyeglasses' },
    { token: 'lens', title: 'Contact Lenses' },
  ].flatMap(({ token, title }) => {
    const category = collectionCategories.find((item) => {
      const catalogCategory = catalog?.categories.find((entry) => entry.slug === item.slug);
      return normalizedCategory(`${item.name} ${catalogCategory?.name ?? ''} ${item.slug}`).includes(token);
    });
    return category ? [{ ...category, title }] : [];
  });
  const activeCarouselIndex = categoryCarousel.length ? activeCategorySlide % categoryCarousel.length : 0;
  const materialsSectionHidden = cmsHidden(homepageSectionSlugs.materials, sections);
  const categoriesSectionHidden = cmsHidden(homepageSectionSlugs.categories, sections);
  const homepageFilterParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedMaterial = homepageFilterParams.get('material');
  const selectedColour = homepageFilterParams.get('color');
  useEffect(() => {
    if (reducedMotion || categoryCarouselPaused || categoryCarousel.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveCategorySlide((index) => (index + 1) % categoryCarousel.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeCategorySlide, categoryCarousel.length, categoryCarouselPaused, reducedMotion]);
  useEffect(() => {
    if (categoryCarousel.length && activeCategorySlide >= categoryCarousel.length) setActiveCategorySlide(0);
  }, [activeCategorySlide, categoryCarousel.length]);
  const moveCategorySlide = (offset: number) => {
    if (categoryCarousel.length < 2) return;
    setActiveCategorySlide((index) => (index + offset + categoryCarousel.length) % categoryCarousel.length);
  };
  const handleCategoryTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    categoryTouchStartX.current = event.changedTouches[0]?.clientX ?? null;
    categorySwipeTriggered.current = false;
    setCategoryCarouselPaused(true);
  };
  const handleCategoryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const endX = event.changedTouches[0]?.clientX;
    const startX = categoryTouchStartX.current;
    categoryTouchStartX.current = null;
    setCategoryCarouselPaused(false);
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 45) return;
    categorySwipeTriggered.current = true;
    moveCategorySlide(endX < startX ? 1 : -1);
  };
  const handleCategoryClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!categorySwipeTriggered.current) return;
    event.preventDefault();
    event.stopPropagation();
    categorySwipeTriggered.current = false;
  };
  const scrollFrameShapeCarousel = (direction: -1 | 1) => {
    frameShapeCarouselRef.current?.scrollBy({ left: direction * FRAME_SHAPE_SCROLL_DISTANCE, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  const heroCategory = catalog?.categories.find((category) => category.slug === 'eyeglasses')
    ?? catalog?.categories[0];
  const cmsCollectionProducts = cmsSelectedProducts(sections, homepageSectionSlugs.collections, catalogHomeProducts);
  const trendingCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'TRENDING_PRODUCT');
  const curatedTrendingProducts = trendingCards.flatMap((card) => {
    if (!card.product) return [];
    const product = homepageProduct({ ...card.product, imageUrl: card.imageUrl ?? card.product.imageUrl });
    return product.image ? [product] : [];
  });
  const collectionProducts = trendingCards.length ? curatedTrendingProducts : cmsCollectionProducts.slice(0, 4);
  const collectionPath = '/shop?sort=popularity';
  const heroPoster = isMobile ? HERO_MOBILE_IMAGE_URL : HERO_IMAGE_URL;
  const availableBrands = [...new Set((catalog?.products ?? []).map((product) => product.brand).filter(Boolean))];
  const brandCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'EXPLORE_BY_BRAND');
  const visibleBrandCards: HomeCard[] = brandCards.length ? brandCards : availableBrands.map((brand, index) => ({ id: brand, title: brand, subtitle: null, description: null, imageUrl: null, buttonText: 'Shop frames', destinationType: 'BRAND', destinationValue: brand, displayOrder: index }));
  const eyewearImageProducts = (catalog?.products ?? [])
    .filter((product) => product.categories.some((category) => categoryMatchesEyewearType(category, 'eyeglasses')
      || categoryMatchesEyewearType(category, 'sunglasses')))
    .map(catalogHomeProduct)
    .filter((product) => Boolean(product.image));
  const usedBrandImageUrls = new Set<string>();
  const brandCardsWithImages = visibleBrandCards.map((card) => {
    const brandKeys = [card.title, card.destinationValue].map(normalizedBrandName);
    const matchingProduct = eyewearImageProducts.find((product) => brandKeys.includes(normalizedBrandName(product.brand))
      && !usedBrandImageUrls.has(product.image));
    const product = matchingProduct ?? eyewearImageProducts.find((item) => !usedBrandImageUrls.has(item.image));
    if (product) usedBrandImageUrls.add(product.image);
    return { card, product };
  });
  const availableWearers = uniqueWearerValues((catalog?.products ?? []).map((product) => product.gender));
  const wearerCards = deduplicateWearerCards((cms?.cards ?? []).filter((card) => card.sectionKey === 'SHOP_BY_WEARER'));
  const visibleWearerCards: HomeCard[] = wearerCards.length ? wearerCards : availableWearers.map((gender, index) => ({ id: gender, title: gender, subtitle: null, description: null, imageUrl: null, buttonText: 'Shop styles', destinationType: 'GENDER', destinationValue: gender, displayOrder: index }));
  const availableShapes = [...new Set((catalog?.products ?? []).map((product) => product.frameShape).filter((shape): shape is string => Boolean(shape)))];
  const shapeCards = (cms?.cards ?? []).filter((card) => card.sectionKey === 'FRAME_SHAPE');
  const visibleShapeCards: HomeCard[] = shapeCards.length ? shapeCards : availableShapes.map((shape, index) => ({ id: shape, title: shape, subtitle: null, description: null, imageUrl: null, buttonText: null, destinationType: 'SHAPE', destinationValue: shape, displayOrder: index }));
  useEffect(() => {
    if (reducedMotion || frameShapeCarouselPaused || visibleShapeCards.length < 2) return undefined;
    const timer = window.setInterval(() => {
      const carousel = frameShapeCarouselRef.current;
      if (!carousel || carousel.scrollWidth <= carousel.clientWidth) return;
      if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 8) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: FRAME_SHAPE_SCROLL_DISTANCE, behavior: 'smooth' });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [frameShapeCarouselPaused, reducedMotion, visibleShapeCards.length]);
  const promotionalCards = (cms?.cards ?? [])
    .filter((card) => card.sectionKey === 'PROMOTIONAL' && card.status.toUpperCase() === 'PUBLISHED' && card.enabled)
    .sort((first, second) => first.displayOrder - second.displayOrder);
  const promotionalImageCards = promotionalCards.flatMap((card) => {
    const image = card.imageUrl ?? card.product?.imageUrl ?? card.category?.imageUrl;
    return image ? [{ card, image }] : [];
  });
  const activePromotionIndex = promotionalImageCards.length ? activePromotionSlide % promotionalImageCards.length : 0;
  const activePromotion = promotionalImageCards[activePromotionIndex];
  useEffect(() => {
    if (reducedMotion || promotionCarouselPaused || promotionalImageCards.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActivePromotionSlide((index) => (index + 1) % promotionalImageCards.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activePromotionSlide, promotionCarouselPaused, promotionalImageCards.length, reducedMotion]);
  useEffect(() => {
    if (promotionalImageCards.length && activePromotionSlide >= promotionalImageCards.length) setActivePromotionSlide(0);
  }, [activePromotionSlide, promotionalImageCards.length]);
  const movePromotionSlide = (offset: number) => {
    if (promotionalImageCards.length < 2) return;
    setActivePromotionSlide((index) => (index + offset + promotionalImageCards.length) % promotionalImageCards.length);
  };
  const handlePromotionTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    promotionTouchStartX.current = event.changedTouches[0]?.clientX ?? null;
    promotionSwipeTriggered.current = false;
    setPromotionCarouselPaused(true);
  };
  const handlePromotionTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const endX = event.changedTouches[0]?.clientX;
    const startX = promotionTouchStartX.current;
    promotionTouchStartX.current = null;
    setPromotionCarouselPaused(false);
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 45) return;
    promotionSwipeTriggered.current = true;
    movePromotionSlide(endX < startX ? 1 : -1);
  };
  const handlePromotionClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!promotionSwipeTriggered.current) return;
    event.preventDefault();
    event.stopPropagation();
    promotionSwipeTriggered.current = false;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <SEO
        title="DreamSpex | Premium Eyeglasses, Sunglasses & Contact Lenses"
        description="Explore stylish eyeglasses, sunglasses and contact lenses at DreamSpex. Discover premium eyewear for every style and occasion."
      />
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
          <section
            hidden={categoriesSectionHidden}
            aria-label="Shop eyewear collections"
            className="home-shopping-showcase"
          >
            <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
              <div className="home-shopping-showcase__layout home-shopping-showcase__layout--single">
                <section
                  className="home-category-carousel"
                  aria-label="Shop eyewear collections"
                  aria-roledescription="carousel"
                  onMouseEnter={() => setCategoryCarouselPaused(true)}
                  onMouseLeave={() => setCategoryCarouselPaused(false)}
                  onFocusCapture={() => setCategoryCarouselPaused(true)}
                  onBlurCapture={(event) => {
                    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setCategoryCarouselPaused(false);
                  }}
                >
                  <div
                    className="home-category-carousel__viewport"
                    onTouchStart={handleCategoryTouchStart}
                    onTouchEnd={handleCategoryTouchEnd}
                    onClickCapture={handleCategoryClickCapture}
                  >
                    {categoryCarousel.length ? <motion.div
                      id="home-category-carousel-slides"
                      className="home-category-carousel__track"
                      animate={{ x: `${-activeCarouselIndex * 100}%` }}
                      transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {categoryCarousel.map((category, index) => <Link
                        key={category.slug}
                        to={`/shop?category=${encodeURIComponent(category.slug)}`}
                        className="home-category-carousel__slide"
                        aria-hidden={index !== activeCarouselIndex}
                        aria-roledescription="slide"
                        aria-label={`${index + 1} of ${categoryCarousel.length}: ${category.title}`}
                        tabIndex={index === activeCarouselIndex ? 0 : -1}
                      >
                        <img src={category.image} alt={`${category.title} eyewear collection`} loading={index === activeCarouselIndex ? 'eager' : 'lazy'} />
                        <span className="home-category-carousel__shade" aria-hidden="true" />
                        <span className="home-category-carousel__copy">
                          <span className="home-category-carousel__eyebrow">Dream Spex collections</span>
                          <span className="home-category-carousel__title">{category.title}</span>
                          <span className="home-category-carousel__description">{category.copy}</span>
                          <span className="home-category-carousel__shop-link">Shop Now <ArrowRight aria-hidden="true" /></span>
                        </span>
                      </Link>)}
                    </motion.div> : <p className="home-category-carousel__empty" role={catalogError || cmsError ? 'alert' : 'status'}>
                      {catalogLoading ? 'Loading eyewear categories...' : catalogError || cmsError ? 'Homepage categories could not be loaded.' : 'No category images are available right now.'}
                    </p>}
                    {categoryCarousel.length > 1 ? <div className="home-category-carousel__arrows">
                      <button type="button" aria-label="Previous category" aria-controls="home-category-carousel-slides" onClick={() => moveCategorySlide(-1)}>
                        <ArrowLeft aria-hidden="true" />
                      </button>
                      <button type="button" aria-label="Next category" aria-controls="home-category-carousel-slides" onClick={() => moveCategorySlide(1)}>
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </div> : null}
                    {categoryCarousel.length > 1 ? <div className="home-category-carousel__pagination" role="group" aria-label="Choose eyewear category">
                      {categoryCarousel.map((category, index) => <button
                        key={category.slug}
                        type="button"
                        aria-label={`Show ${category.title}`}
                        aria-current={index === activeCarouselIndex ? 'true' : undefined}
                        onClick={() => setActiveCategorySlide(index)}
                      />)}
                    </div> : null}
                  </div>
                </section>
              </div>
            </div>
          </section>

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

          <CmsSectionGate slug={homepageSectionSlugs.wearer} sections={sections}><section ref={wearerSectionRef} aria-labelledby="wearer-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Shop by wearer</p><h2 id="wearer-title" className="mt-2 font-serif text-3xl text-[var(--text-primary)]">{cmsText(sections, homepageSectionSlugs.wearer, 'title', 'Find styles for your needs')}</h2></div><p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">{cmsText(sections, homepageSectionSlugs.wearer, 'subtitle', 'Explore styles available in the current catalogue.')}</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleWearerCards.map((card, index) => {
                const image = wearerLifestyleImage(card.destinationValue);
                return <Link key={card.id} to={homepageCardHref(card)} style={{ transitionDelay: `${index * 100}ms` }} className={`home-wearer-card group relative isolate aspect-[4/5] overflow-hidden rounded-3xl bg-[var(--bg-secondary)] shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none${wearerCardsVisible ? ' is-visible' : ''}`}>
                  <img src={image} alt="" loading="lazy" onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = WEARER_IMAGE_FALLBACK;
                  }} className="home-wearer-card__image absolute inset-0 h-full w-full object-cover object-top transition duration-700 motion-reduce:transition-none" style={{ transitionDelay: `${index * 100}ms` }} />
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                    <span className="block text-2xl font-bold tracking-tight drop-shadow sm:text-3xl">{formatWearerTitle(card.title)}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/95 drop-shadow">{card.buttonText ?? 'Shop styles'} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </span>
                </Link>;
              })}
              {!visibleWearerCards.length ? <p className="col-span-full py-8 text-center text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading catalogue...' : catalogError ? 'Wearer cards could not be loaded.' : 'No wearer collections are available right now.'}</p> : null}
            </div>
          </section></CmsSectionGate>

          <section hidden={cmsHidden(homepageSectionSlugs.promos, sections)} aria-label="Brand promotions" className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Brand promos</p>
              <Link to="/shop" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#689f24]">Browse all styles <ChevronRight className="h-4 w-4" /></Link>
            </div>

            <div className={`home-brand-promo-layout${materialsSectionHidden ? ' home-brand-promo-layout--single' : ''}`}>
              {!materialsSectionHidden ? <aside className="home-shopping-filters" aria-label="Shopping filters">
                <div className="home-shopping-filters__heading">
                  <p className="home-shopping-filters__eyebrow">Shop by material</p>
                  <h2>{cmsText(sections, homepageSectionSlugs.materials, 'title', 'Made from considered materials')}</h2>
                  <p>Find the right finish, tone, and feel for your next pair.</p>
                </div>

                <section className="home-shopping-filters__group" aria-labelledby="home-material-filter-title">
                  <h3 id="home-material-filter-title">Materials</h3>
                  <div className="home-filter-chip-list" aria-label="Filter by material">
                    {(showAllMaterials ? supportedMaterials : supportedMaterials.slice(0, 2)).map((material) => <Link
                      key={material}
                      to={`/shop?material=${encodeURIComponent(material)}`}
                      className={`home-filter-chip home-filter-chip--material${selectedMaterial?.toLowerCase() === material.toLowerCase() ? ' is-selected' : ''}`}
                      aria-current={selectedMaterial?.toLowerCase() === material.toLowerCase() ? 'true' : undefined}
                    >
                      <span className="home-filter-chip__material-mark" aria-hidden="true" />
                      {formatFilterLabel(material)}
                    </Link>)}
                    {!supportedMaterials.length ? <p className="home-shopping-filters__empty" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading materials...' : catalogError || 'No materials are available right now.'}</p> : null}
                  </div>
                  {supportedMaterials.length > 6 ? <button type="button" className="home-filter-view-toggle" onClick={() => setShowAllMaterials((current) => !current)} aria-expanded={showAllMaterials}>
                    {showAllMaterials ? 'Show less' : `View all ${supportedMaterials.length}`}
                    <ChevronRight aria-hidden="true" className={showAllMaterials ? 'home-filter-view-toggle__icon is-expanded' : 'home-filter-view-toggle__icon'} />
                  </button> : null}
                </section>

                <section className="home-shopping-filters__group home-shopping-filters__group--colours" aria-labelledby="home-colour-filter-title">
                  <h3 id="home-colour-filter-title">Shop by colour</h3>
                  {supportedColorGroups.map(({ label, categorySlug, colors }) => {
                    const colorOptions = uniqueColorFilterOptions(colors);
                    const visibleColorOptions = showAllColours ? colorOptions : colorOptions.slice(0, 2);
                    return <div key={label} className="home-shopping-filters__colour-group">
                      <h4>{label}</h4>
                      <div className="home-filter-chip-list" aria-label={`Filter ${label.toLowerCase()} by colour`}>
                        {visibleColorOptions.map(({ value, label: colorLabel }) => <Link
                          key={colorLabel}
                          to={`/shop?category=${encodeURIComponent(categorySlug)}&color=${encodeURIComponent(value)}`}
                          className={`home-filter-chip home-filter-chip--colour${selectedColour?.toLowerCase() === value.toLowerCase() ? ' is-selected' : ''}`}
                          aria-current={selectedColour?.toLowerCase() === value.toLowerCase() ? 'true' : undefined}
                        >
                          <ColorSwatch color={value} className="home-filter-chip__swatch" />
                          {colorLabel}
                        </Link>)}
                      </div>
                    </div>;
                  })}
                  {!supportedColorGroups.length ? <p className="home-shopping-filters__empty" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading colours...' : catalogError || 'No colour options are available right now.'}</p> : null}
                  {supportedColorGroups.some(({ colors }) => uniqueColorFilterOptions(colors).length > 8)
                    ? <button type="button" className="home-filter-view-toggle" onClick={() => setShowAllColours((current) => !current)} aria-expanded={showAllColours}>
                      {showAllColours ? 'Show less' : 'View all colours'}
                      <ChevronRight aria-hidden="true" className={showAllColours ? 'home-filter-view-toggle__icon is-expanded' : 'home-filter-view-toggle__icon'} />
                    </button>
                    : null}
                </section>
              </aside> : null}

              {activePromotion ? <div
                className="home-brand-promo-carousel"
                onFocusCapture={() => setPromotionCarouselPaused(true)}
                onBlurCapture={(event) => {
                  if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setPromotionCarouselPaused(false);
                }}
              >
                <div
                  className="home-brand-promo__stage"
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setPromotionCarouselPaused(true);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setPromotionCarouselPaused(false);
                  }}
                  onTouchStart={handlePromotionTouchStart}
                  onTouchEnd={handlePromotionTouchEnd}
                  onClickCapture={handlePromotionClickCapture}
                >
                  <AnimatePresence initial={false} mode="sync">
                    <motion.div
                      key={activePromotion.card.id}
                      className="home-brand-promo__slide"
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -28 }}
                      transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        to={homepageCardHref(activePromotion.card)}
                        aria-label={`Shop ${activePromotion.card.title}`}
                        className="home-brand-promo"
                      >
                        <span className="home-brand-promo__copy">
                          <span className="home-brand-promo__eyebrow">Premium eyewear</span>
                          <h2 className="home-brand-promo__title">{activePromotion.card.title}</h2>
                          <p className="home-brand-promo__description">Discover Your Signature Style. Crafted for clarity. Designed for confidence.</p>
                        </span>
                        <span className="home-brand-promo__visual" aria-hidden="true">
                          <img src={activePromotion.image} alt="" loading="lazy" />
                        </span>
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
                {promotionalImageCards.length > 1? <div className="home-brand-promo__pagination" role="group" aria-label="Choose a promotion">
                  {promotionalImageCards.map(({ card }, index) => <button
                    key={card.id}
                    type="button"
                    aria-label={`Show promotion: ${card.title}`}
                    aria-current={index === activePromotionIndex ? 'true' : undefined}
                    onClick={() => setActivePromotionSlide(index)}
                  />)}
                </div> : null}
              </div> : <p className="home-brand-promo__empty" role={cmsError ? 'alert' : 'status'}>
                {cmsError ? 'Promotions could not be loaded.' : 'No active promotions are available right now.'}
              </p>}
            </div>
          </section>

          <CmsSectionGate slug={homepageSectionSlugs.brands} sections={sections}><section aria-label="shop by brand" className="border-y border-black/10 bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The brands we carry</p><h2 id="brand-showcase-title" className="mt-2 font-serif text-3xl text-[#182116]">{cmsText(sections, homepageSectionSlugs.brands, 'title', 'Explore by brand')}</h2></div>
                <p className="max-w-md text-sm leading-6 text-[#5f6c5b]">Brands</p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {brandCardsWithImages.map(({ card, product }) => <Link
                  key={card.id}
                  to={homepageCardHref(card)}
                  className="group overflow-hidden rounded-2xl border border-[#d5dfd1] bg-[#f7f9f5] text-[#263322] transition duration-300 hover:-translate-y-0.5 hover:border-[#689f24] hover:bg-white hover:text-[#4b781a]"
                >
                  <span className="flex items-center justify-between gap-3 px-5 pt-4">
                    <span className="min-w-0 text-lg font-semibold tracking-wide">{card.title}</span>
                    <span className="shrink-0 text-xs font-normal text-[#687468]">{card.buttonText ?? 'Shop frames'}</span>
                  </span>
                  <span className="mx-3 mb-3 mt-4 block aspect-[4/3] overflow-hidden rounded-xl bg-white">
                    {product ? <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.04]"
                    /> : <span className="grid h-full place-items-center px-4 text-center text-xs text-[var(--text-secondary)]">Product image unavailable</span>}
                  </span>
                </Link>)}
                {!visibleBrandCards.length ? <p className="col-span-full py-4 text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>
                  {catalogLoading ? 'Loading brands...' : catalogError ? 'Brand cards could not be loaded.' : 'No brands are available right now.'}
                </p> : null}
              </div>
            </div>
          </section></CmsSectionGate>

          {newArrivalCount > 0 || bestsellerCount > 0 || featuredCollection ? <section hidden={cmsHidden(homepageSectionSlugs.edit, sections)} className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Discover the edit</p><h2 className="mt-3 font-serif text-4xl">Fresh arrivals &amp; featured frames</h2></div></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {newArrivalCount > 0 ? <Link to="/shop?badge=New" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">New arrivals</p><p className="mt-3 font-serif text-2xl">Fresh from the collection</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{newArrivalCount} new-tagged {newArrivalCount === 1 ? 'style' : 'styles'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore arrivals <ArrowRight className="h-4 w-4" /></span></Link> : null}
              {bestsellerCount > 0 ? <Link to="/shop?badge=Bestseller" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Catalogue highlights</p><p className="mt-3 font-serif text-2xl">Selected by Dream Spex</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{bestsellerCount} bestseller {bestsellerCount === 1 ? 'style' : 'styles'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore selected frames <ArrowRight className="h-4 w-4" /></span></Link> : null}
              {featuredCollection ? <Link to={`/shop?category=${encodeURIComponent(featuredCollection.slug)}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#689f24]">Featured collection</p><p className="mt-3 font-serif text-2xl">{featuredCollection.name}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{featuredCollection.description ?? 'Explore this catalogue collection.'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#689f24]">Explore collection <ArrowRight className="h-4 w-4" /></span></Link> : null}
            </div>
          </section> : null}

          <section hidden={cmsHidden(homepageSectionSlugs.shapes, sections)} className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-serif text-4xl text-[var(--text-primary)]">Shop by frame shape</h2>
                  <p className="mt-3 max-w-xl text-sm text-[var(--text-secondary)]">Browse shapes represented in the current catalogue. Shape labels do not guarantee fit.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {visibleShapeCards.length > 1 ? <>
                    <button type="button" aria-label="Previous frame shapes" aria-controls="home-frame-shape-carousel" onClick={() => scrollFrameShapeCarousel(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-[#689f24] hover:text-[#4b781a]">
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Next frame shapes" aria-controls="home-frame-shape-carousel" onClick={() => scrollFrameShapeCarousel(1)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-[#689f24] hover:text-[#4b781a]">
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </> : null}
                  <Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#4b781a] sm:flex">Browse all styles <ChevronRight className="h-4 w-4" /></Link>
                </div>
              </div>
              <div id="home-frame-shape-carousel" ref={frameShapeCarouselRef} role="region" aria-label="Browse frame shapes" aria-roledescription="carousel" tabIndex={0} onMouseEnter={() => setFrameShapeCarouselPaused(true)} onMouseLeave={() => setFrameShapeCarouselPaused(false)} onFocus={() => setFrameShapeCarouselPaused(true)} onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFrameShapeCarouselPaused(false);
              }} className="mt-8 flex min-w-0 max-w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 motion-safe:scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {visibleShapeCards.map((card) => {
                  const shape = card.destinationValue.trim().toLowerCase();
                  const product = catalog?.products.find((item) => item.frameShape?.trim().toLowerCase() === shape
                    && Boolean(item.imageUrl || item.images?.some((image) => image.imageUrl)));
                  const productImage = product ? catalogHomeProduct(product).image : '';
                  const image = productImage || resolveCmsMediaUrl(card.imageUrl) || '';
                  return image ? <Link key={card.id} to={homepageCardHref(card)} aria-label={`Shop ${card.title} frames`} className="group relative aspect-[4/3] w-72 flex-none snap-start overflow-hidden rounded-2xl bg-[#f2f3ed] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-20px_rgba(16,24,16,0.5)]">
                    <img src={image} alt={`${card.title} eyewear`} loading="lazy" className="absolute inset-0 h-full w-full object-contain object-center mix-blend-multiply" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10 text-[#ffffff]">
                      <span className="font-semibold drop-shadow">{card.title}</span>
                      <span className="rounded-full bg-white/90 p-2 text-[#172015]"><ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
                    </div>
                  </Link> : null;
                })}
                {!visibleShapeCards.length ? <p className="w-full py-8 text-center text-sm text-[var(--text-secondary)]" role={catalogError ? 'alert' : 'status'}>{catalogLoading ? 'Loading frame shapes...' : catalogError ? 'Frame shape cards could not be loaded.' : 'No frame shapes are available right now.'}</p> : null}
              </div>
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.faceFit, sections)} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div className="grid items-stretch gap-7 rounded-[30px] border border-[#e2e9dd] bg-[#fbfcf8] p-5 shadow-[0_20px_50px_-38px_rgba(24,34,24,0.32)] sm:gap-9 sm:p-8 lg:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)] lg:gap-10 lg:p-10">
              <div className="flex flex-col justify-center py-1 sm:py-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]"><span aria-hidden="true" className="h-px w-7 bg-[#9ac86a]" />Find your fit</p>
                <h2 className="mt-4 max-w-md font-serif text-4xl leading-[1.08] text-[var(--text-primary)] sm:text-4xl">Frames for your face</h2>
                <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">Explore common face shapes, then preview frames with virtual try-on. The current catalogue does not yet map individual frames to face shapes.</p>
                <Link to="/virtual-try-on" className="mt-7 inline-flex w-fit items-center gap-3 rounded-full bg-[#78be20] py-1.5 pl-5 pr-1.5 text-sm font-semibold text-[#172015] shadow-[0_10px_22px_-14px_rgba(47,81,22,0.55)] transition hover:bg-[#91cb43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b781a]">
                  Try frames virtually
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#355e17] shadow-sm"><ArrowRight className="h-4 w-4" /></span>
                </Link>
              </div>
              <FaceShapeCarousel reducedMotion={reducedMotion} />
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.collections, sections)} className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">The current edit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">Trending eyewear</h2></div>
              <Link to={collectionPath} className="inline-flex items-center gap-1 text-sm font-semibold text-[#689f24]">Explore collection <ChevronRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {collectionProducts.map((product) => <CompactHomeProductCard key={product.id} product={product} />)}
              {!collectionProducts.length ? <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">No products currently carry this collection label.</p> : null}
            </div>
            <p className="mt-4 text-xs text-[var(--text-secondary)]">Trending styles from the live product catalogue.</p>
          </section>

          {/* <section hidden={cmsHidden(homepageSectionSlugs.tryOn, sections)} className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="grid overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[#e9eee4] lg:grid-cols-[1fr_1.1fr]"><div className="p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">Try before you choose</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#182116]">Your next pair is closer than you think.</h2><p className="mt-5 max-w-md leading-7 text-[#5f6c5b]">Upload a photo or use your camera to preview selected frames. Switch styles until the right one feels obvious.</p><Link to="/virtual-try-on" className="mt-8 inline-flex"><Button><Camera className="mr-2 h-4 w-4" /> Start virtual try-on</Button></Link></div><div className="relative min-h-[300px]"><img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=90" alt="Person wearing stylish spectacles" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div></div></section> */}

          <section id="why-dream-spex" hidden={cmsHidden(homepageSectionSlugs.why, sections)} className="mx-auto max-w-7xl scroll-mt-36 px-4 pt-10 pb-16 sm:px-6 sm:pt-12 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Why Dream Spex</p>
              <h2 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">A clearer way to choose eyewear</h2>
            </div>
            <div className="mx-auto mt-7 grid max-w-5xl items-stretch gap-5 md:grid-cols-2">
              <Link to="/categories" className="group flex min-h-[420px] flex-col overflow-hidden rounded-[26px] border border-[#dce5d8] bg-white shadow-[0_10px_28px_-24px_rgba(23,35,28,0.32)] transition duration-300 hover:-translate-y-1 hover:border-[#9cc66e] hover:shadow-[0_20px_40px_-24px_rgba(23,35,28,0.3)]">
                <span aria-hidden="true" className="relative h-52 shrink-0 overflow-hidden bg-[#e8efe3] sm:h-56">
                  <img src="/assets/images/why-dreamspex/browse-products.png" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-center" />
                </span>
                <span className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="font-serif text-2xl font-semibold text-[#17231c]">Browse Products</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5c665f]">Explore products and categories available in the current catalogue.</p>
                  <span className="mt-auto inline-flex w-fit items-center gap-3 rounded-full bg-[#eaf3df] py-1.5 pl-4 pr-1.5 text-sm font-semibold text-[#355e17] transition group-hover:bg-[#78be20]">
                    Explore products
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#355e17] shadow-sm"><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </span>
                </span>
              </Link>
              <Link to="/stores" className="group flex min-h-[420px] flex-col overflow-hidden rounded-[26px] border border-[#dce5d8] bg-white shadow-[0_10px_28px_-24px_rgba(23,35,28,0.32)] transition duration-300 hover:-translate-y-1 hover:border-[#9cc66e] hover:shadow-[0_20px_40px_-24px_rgba(23,35,28,0.3)]">
                <span aria-hidden="true" className="relative h-52 shrink-0 overflow-hidden bg-[#e8efe3] sm:h-56">
                  <img src="/assets/images/why-dreamspex/find-store.png" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-center" />
                </span>
                <span className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="font-serif text-2xl font-semibold text-[#17231c]">Find a Store</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5c665f]">Browse the locations in the Dream Spex store directory.</p>
                  <span className="mt-auto inline-flex w-fit items-center gap-3 rounded-full bg-[#eaf3df] py-1.5 pl-4 pr-1.5 text-sm font-semibold text-[#355e17] transition group-hover:bg-[#78be20]">
                    View locations
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#355e17] shadow-sm"><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </span>
                </span>
              </Link>
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.membership, sections)} className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[30px] border border-[#e3e9df] bg-[#fbfcf8] text-[#182116] shadow-[0_22px_55px_-42px_rgba(24,34,24,0.35)]">
              <div className="grid lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]">
                <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-9">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4b781a]">Dream Spex membership</p>
                  <h2 className="mt-2 max-w-lg font-serif text-2xl text-[#182116] sm:text-3xl">Membership benefits,made clear.</h2>
                  {membershipPlans.length ? <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 2xl:grid-cols-3">{membershipPlans.map((plan) => {
                    const perks = plan.perks.filter(isDisplayableMembershipCopy);
                    const PlanIcon = plan.recommended ? Star : ShieldCheck;
                    return <article key={plan.id} style={membershipPlanThemeStyle(plan.name, '#ffffff')} className="membership-plan-card relative isolate flex h-full flex-col overflow-hidden rounded-[22px] border p-5 text-[#182116]">
                      <span aria-hidden="true" className="membership-plan-glow absolute -right-10 -top-10 -z-10 h-28 w-28 rounded-full" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="membership-plan-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                            <PlanIcon className="h-5 w-5" strokeWidth={1.8} />
                          </span>
                          <div>
                            <h3 className="membership-plan-accent font-serif text-xl font-semibold leading-tight">{plan.name}</h3>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71806a]">Membership plan</p>
                          </div>
                        </div>
                        {plan.recommended ? <span className="membership-plan-badge rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">Recommended</span> : null}
                      </div>
                      <p className="membership-plan-accent mt-5 text-3xl font-semibold tracking-tight">{membershipDiscountLabel(plan)}</p>
                      <p className="mt-1 text-xs text-[#687468]">{membershipValidityLabel(plan)} from activation</p>
                      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="membership-plan-accent text-2xl font-semibold tracking-tight">{formatINR(plan.price)}</p>
                        <span className="text-xs text-[#687468]">membership price</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5f6c5b]">{membershipPlanDescription(plan)}</p>
                      {plan.discountPercentage != null && plan.discountPercentage > 0
                        ? <p className="mt-3 text-xs leading-5 text-[#5f6c5b]">Discount applies to the eligible product subtotal while active. Coupon discounts take precedence at checkout.</p>
                        : null}
                      {perks.length ? <ul className="membership-plan-perks mt-4 flex-1 space-y-2 border-t pt-4 text-xs leading-5 text-[#5f6c5b]">{perks.slice(0, 3).map((perk) => <li key={perk} className="flex gap-2"><span className="membership-plan-accent font-bold" aria-hidden="true">✓</span><span>{perk}</span></li>)}</ul> : <div className="flex-1" />}
                      <Link to={`/membership/checkout?plan=${encodeURIComponent(plan.id)}`} className="membership-plan-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                        Join now <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>;
                  })}</div> : <p className="mt-6 text-sm text-[#5f6c5b]" role={membershipError ? 'alert' : 'status'}>{membershipLoading ? 'Loading membership plans...' : membershipError || 'Membership plans are not available right now.'}</p>}
                  {!membershipPlans.length ? <Link to="/membership" className="mt-4 inline-flex items-center text-sm font-semibold text-[#5d9417]">Explore membership <ArrowRight className="ml-1 h-4 w-4" /></Link> : null}
                </div>
                <aside className="flex flex-col border-t border-[#e0e7dc] bg-[#f4f7f0] p-5 sm:p-8 lg:border-l lg:border-t-0">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#638c35] shadow-sm"><Gift className="h-5 w-5" /></span>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Offers</p>
                  </div>
                  <h2 className="mt-3 font-serif text-2xl text-[#182116]">A little more clarity for less.</h2>
                  {offersError ? <p className="mt-5 rounded-xl border border-red-200 bg-white/80 p-3 text-sm text-red-700" role="alert">{offersError}</p> : null}
                  {activeHomepageOffers.length ? <div className="mt-6 space-y-3">{activeHomepageOffers.slice(0, 4).map((offer) => <article key={offer.id} className="rounded-2xl border border-[#e0e7dc] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(24,34,24,0.4)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xl font-semibold tracking-tight text-[#29411e]">{offer.discountType === 'PERCENT' ? `${offer.discountValue}% OFF` : `${formatINR(offer.discountValue)} OFF`}</p>
                        <p className="mt-1 text-sm font-medium leading-5 text-[#485347]">{offer.title}</p>
                        {offer.couponCode ? <p className="mt-2 inline-flex rounded-md bg-[#f1f5ec] px-2 py-1 text-xs font-semibold tracking-wide text-[#526b3d]">Code: {offer.couponCode}</p> : null}
                        {offer.endsAt ? <p className="mt-2 text-xs text-[#687468]">Valid until {new Date(offer.endsAt).toLocaleDateString('en-IN')}</p> : null}
                      </div>
                      <Link to={offer.linkUrl || '/offers'} className="inline-flex shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-[#5d9417] transition hover:text-[#355e17]">View offer <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </article>)}</div> : null}
                  {!activeHomepageOffers.length && !offersError ? offersLoading
                    ? <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#e0e7dc] bg-white/80 p-5 text-sm text-[#5f6c5b]" role="status"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf4e7] text-[#689f24]"><Gift className="h-5 w-5" /></span>Loading current offers...</div>
                    : <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#cbd8c2] bg-white/75 px-5 py-8 text-center" role="status">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#edf4e7] text-[#689f24]"><Gift className="h-6 w-6" /></span>
                      <p className="mt-4 text-sm font-semibold text-[#33432c]">There are no current offers.</p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-[#687468]">Check back soon for something special.</p>
                    </div> : null}
                </aside>
              </div>
            </div>
          </section>

          <section hidden={cmsHidden(homepageSectionSlugs.stores, sections)} className="bg-[#dfe9d8] py-16"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]"><MapPin className="h-4 w-4" /> Visit Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Your vision deserves expert care.</h2></div><div><Link to="/stores" className="inline-flex items-center gap-2 rounded-full border border-[#a9bba2] px-5 py-3 text-sm font-semibold text-[#182116]">Find a store <ArrowRight className="h-4 w-4" /></Link></div></div></section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
