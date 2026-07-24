import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { ArrowRight, BadgeCheck, Camera, Sparkles, ShieldCheck, Truck, Zap, Play, Pause, Volume2, VolumeX, Crown, Gem, Star, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/autoplay';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import ProductCard from '../components/ui/ProductCard';
import CountdownTimer from '../components/ui/CountdownTimer';
import { categories, membershipPlans, products, reviews } from '../data/mockData';
import { HERO_VIDEO_URL, HERO_IMAGE_URL, HERO_MOBILE_IMAGE_URL } from '../config/siteMedia';

type NewsletterForm = { email: string };

const featureSlides = [
  { title: 'Auric Titanium', subtitle: 'Sculptural precision', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80' },
  { title: 'Solar Noir', subtitle: 'Luxury sunwear', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80' },
  { title: 'Lumen Lens', subtitle: 'Modern clarity', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80' },
];

const blogPosts = [
  { title: 'How to choose the perfect frame shape', copy: 'A tailored guide to balancing proportion, personality, and comfort.' },
  { title: 'The new era of luxury optical design', copy: 'What modern craftsmanship looks like in premium eyewear today.' },
];

const brandNames = ['Ray-Ban', 'Oakley', 'Tom Ford', 'Prada', 'Gucci', 'Cartier', 'Titan Eye+'];

const storySections = [
  { title: 'Handcrafted Frames', copy: 'Every silhouette is hand-finished to balance precision, comfort, and sculptural elegance.', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Premium Materials', copy: 'Titanium, acetates, and carbon-composite construction create lightweight luxury for daily wear.', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Blue Light Protection', copy: 'Advanced lens technology reduces screen strain without compromising clarity or style.', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80' },
  { title: 'UV400 Technology', copy: 'All-day sun protection and visual comfort designed for modern lifestyles.', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80' },
];


const testimonials = [
  { name: 'Mina R.', city: 'Dubai', quote: 'The craftsmanship feels extraordinary — like a piece of art for everyday life.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80' },
  { name: 'Julian T.', city: 'London', quote: 'The fit, finish, and service made the whole experience feel effortless.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80' },
];

const instagramImages = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
];

export default function HomePage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewsletterForm>();
  const [submitted, setSubmitted] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const onSubmit = () => {
    setSubmitted(true);
    reset();
  };

  const handleParallax = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: x * 8, y: y * 8 });
  };

  const particles = [0, 1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateDesktop = (event: MediaQueryList | MediaQueryListEvent) => setIsDesktop(event.matches);

    updateDesktop(mediaQuery);

    const handleMediaChange = (event: MediaQueryListEvent) => updateDesktop(event);

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    // Fallback for older browser APIs
    if ('addListener' in mediaQuery) {
      (mediaQuery as unknown as MediaQueryList).addListener(handleMediaChange);
      return () => (mediaQuery as unknown as MediaQueryList).removeListener(handleMediaChange);
    }

    return undefined;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      setVideoReady(true);
      setVideoLoading(false);

      if (videoPlaying) {
        video.play().catch((error) => {
          console.error('Hero video autoplay prevented:', error);
          setVideoPlaying(false);
        });
      }
    };

    const handleError = (event: Event) => {
      console.error('Hero video failed to load:', event);
      setVideoError(true);
      setVideoLoading(false);
    };

    video.addEventListener('canplay', handleLoaded);
    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleLoaded);
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('error', handleError);
    };
  }, [videoPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (videoPlaying) {
      video.pause();
      setVideoPlaying(false);
    } else {
      video.play().catch(() => {
        setVideoPlaying(false);
      });
      setVideoPlaying(true);
    }
  };

  const toggleMute = () => setMuted((current) => !current);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Helmet>
        <title>Dream Spex | Luxury Eyewear</title>
        <meta name="description" content="Dream Spex is a premium luxury eyewear storefront with cinematic design, curated collections, and elevated shopping experiences." />
      </Helmet>
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden border-b border-white/10">
          {particles.map((index) => (
            <span key={index} className="luxury-float pointer-events-none absolute h-2 w-2 rounded-full bg-cyan-300/70" style={{ left: `${12 + index * 20}%`, top: `${18 + (index % 3) * 22}%`, animationDelay: `${index * 0.7}s` }} />
          ))}
          {/* Desktop: lazy-loaded background video with blurred image placeholder */}
          <img
            alt="Premium eyewear showcase"
            src={isDesktop ? HERO_IMAGE_URL : HERO_MOBILE_IMAGE_URL}
            style={{ objectPosition: isDesktop ? 'center center' : 'center 80%' }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-0' : 'opacity-100'}`}
          />
          {isDesktop && !videoError && (
            <video
              ref={videoRef}
              autoPlay
              muted={muted}
              loop
              playsInline
              preload="metadata"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            >
              <source src={HERO_VIDEO_URL} type="video/mp4" />
            </video>
          )}
          {isDesktop && videoLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-4 rounded-full border border-white/10 bg-white/5 px-8 py-8 text-center backdrop-blur-xl">
                <div className="hero-loader" />
                <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Loading cinematic preview</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.22),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(14,166,232,0.12),_transparent_24%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-black/10" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-32">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
                <Sparkles className="h-4 w-4" /> Dream Spex • Luxury optical atelier
              </p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }} className="mt-6 text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Crafted for those who see style as a signature.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="mt-6 text-lg leading-8 text-slate-300">
                Discover sculptural frames, premium sunwear, and precision lenses designed with cinematic elegance and daily comfort.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="mt-8 flex flex-wrap gap-4">
                <Link to="/shop"><Button>Shop now</Button></Link>
                <Link to="/membership"><Button variant="ghost">Explore membership</Button></Link>
              </motion.div>
              <div className="mt-10 flex flex-wrap gap-5 text-sm text-slate-300">
                <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-cyan-400" /> 24-hour dispatch</div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-400" /> 2-year warranty</div>
              </div>
              <div className="mt-10 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 backdrop-blur-xl">
                <Play className="h-4 w-4 text-cyan-300" /> Watch our craftsmanship film
              </div>
              <div className="mt-10 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 backdrop-blur-xl">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">3D animated eyewear</p>
                    <h2 className="text-2xl font-semibold text-white">See frames in motion with depth and clarity.</h2>
                    <p className="text-sm leading-7 text-slate-400">A dynamic preview explains lens shape, frame form and premium craftsmanship in a natural, easy-to-understand way.</p>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" /> Animated frame rotation</li>
                      <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" /> Clear visual depth cues</li>
                      <li className="flex items-start gap-3"><span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" /> Easy style guidance for buyers</li>
                    </ul>
                  </div>
                  <div className="three-d-preview rounded-[28px] border border-white/10 bg-[#051024] p-5 shadow-[0_20px_80px_-40px_rgba(0,212,255,0.45)]">
                    <div className="three-d-glasses mx-auto flex h-44 w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[28px] bg-[#081127] p-4 shadow-[0_30px_80px_-45px_rgba(0,212,255,0.25)]">
                      <div className="three-d-frame relative flex h-24 w-full max-w-[260px] items-center justify-between px-6">
                        <div className="three-d-lens left" />
                        <div className="three-d-bridge" />
                        <div className="three-d-lens right" />
                        <div className="three-d-glare left" />
                        <div className="three-d-glare right" />
                      </div>
                    </div>
                    <div className="mt-6 rounded-[24px] border border-white/10 bg-[#081228] p-4 text-sm text-slate-300">
                      <p className="font-semibold text-white">How it helps</p>
                      <ol className="mt-3 space-y-2 pl-4 text-slate-400">
                        <li>1. Preview the frame silhouette</li>
                        <li>2. Understand width, depth, and curve</li>
                        <li>3. Choose your perfect fit</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="relative z-10">
              <motion.div onMouseMove={handleParallax} onMouseLeave={() => setParallax({ x: 0, y: 0 })} animate={{ y: [0, -8, 0], rotate: [0, -1, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="overflow-hidden rounded-[32px] border border-white/10 bg-white/10 p-4 shadow-[0_25px_100px_-30px_rgba(0,212,255,0.45)] backdrop-blur-xl" style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)` }}>
                <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80" alt="Premium eyewear editorial" className="h-[min(500px,60vh)] w-full rounded-[24px] object-cover" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Signature</p>
                    <p className="mt-1 text-lg font-semibold text-white">Auric Titanium</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Virtual try-on</p>
                    <p className="mt-1 text-lg font-semibold text-white">Preview in 60 seconds</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
          {isDesktop && (
            <div className="absolute right-6 top-6 z-20 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 p-3 backdrop-blur-xl">
              <button onClick={togglePlayback} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10" aria-label={videoPlaying ? 'Pause preview' : 'Play preview'}>
                {videoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button onClick={toggleMute} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10" aria-label={muted ? 'Unmute preview' : 'Mute preview'}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          )}
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center text-sm text-slate-300">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Scroll</span>
              <div className="h-8 w-[1px] bg-white/40" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 py-6 backdrop-blur-xl">
            <div className="flex animate-[marquee_18s_linear_infinite] gap-8 whitespace-nowrap px-4 text-3xl font-semibold uppercase tracking-[0.35em] text-slate-400">
              {brandNames.concat(brandNames).map((brand, index) => <span key={`${brand}-${index}`} className="opacity-80">{brand}</span>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <SectionTitle eyebrow="Featured collections" title="Curated for the modern connoisseur" description="A full spectrum of sculptural frames, premium sunwear, and intelligent lenses." />
          <div className="mt-10">
            <Swiper modules={[Autoplay, EffectFade]} effect="fade" autoplay={{ delay: 4000 }} loop className="rounded-[28px] border border-white/10 bg-white/5 p-2">
              {featureSlides.map((slide) => (
                <SwiperSlide key={slide.title}>
                  <div className="grid gap-6 overflow-hidden rounded-[24px] bg-[#0a1022] lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="flex flex-col justify-center p-8 lg:p-12">
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Limited release</p>
                      <h3 className="mt-3 text-3xl font-semibold text-white">{slide.title}</h3>
                      <p className="mt-4 text-base leading-7 text-slate-400">{slide.subtitle}</p>
                      <Link to="/shop" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Discover collection <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                    <img src={slide.image} alt={slide.title} className="h-72 w-full object-cover lg:h-full" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {categories.slice(0, 4).map((category, index) => (
              <motion.article key={category.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="group rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{category.slug}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{category.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{category.description}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow="Trending frames" title="Refined silhouettes for every moment" description="Modern craftsmanship with a polished edge." />
            <Link to="/shop" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">View all</Link>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="grid gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0d1530] to-[#060b17] p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Virtual try-on</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Preview your signature look in seconds.</h2>
              <p className="mt-4 text-base leading-7 text-slate-400">Use our immersive preview and styling assistant to try different shapes, colors, and materials before you decide.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">New release</p>
                  <p className="mt-1 text-2xl font-semibold text-white">Crystal Halo</p>
                </div>
                <div className="rounded-full bg-cyan-400/10 p-3 text-cyan-300"><Camera className="h-5 w-5" /></div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div className="flex gap-2"><BadgeCheck className="h-4 w-4 text-cyan-400" /> AR preview with face-fit guidance</div>
                <div className="flex gap-2"><BadgeCheck className="h-4 w-4 text-cyan-400" /> Styling recommendations by occasion</div>
                <div className="flex gap-2"><BadgeCheck className="h-4 w-4 text-cyan-400" /> Instant share-ready capture</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="grid gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Virtual try-on</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">AI powered virtual try-on</h2>
              <p className="mt-4 text-base leading-7 text-slate-400">Preview your next signature frame with an immersive, future-ready fit experience that blends style with guidance.</p>
              <div className="mt-6 flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">Coming soon</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-8 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <ScanLine className="h-10 w-10" />
              </div>
              <p className="mt-6 text-xl font-semibold text-white">Face scan preview</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Luxury fit intelligence, frame matching, and a seamless style preview are on the way.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:p-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle eyebrow="Membership" title="Elevated benefits for a refined lifestyle" description="Concierge support, priority delivery, and special seasonal access." />
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">Members get first access</div>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {membershipPlans.map((plan, index) => (
              <motion.article key={plan.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className={`rounded-[24px] border p-8 ${plan.featured ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`}>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{plan.name}</p>
                <p className="mt-4 text-4xl font-semibold text-white">${plan.price}<span className="text-base text-slate-400">/mo</span></p>
                <p className="mt-4 text-sm leading-7 text-slate-400">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.perks.map((perk) => <li key={perk} className="flex gap-2"><BadgeCheck className="h-4 w-4 text-cyan-400" /> {perk}</li>)}
                </ul>
                <Button fullWidth className="mt-8">Join {plan.name}</Button>
              </motion.article>
            ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <SectionTitle eyebrow="Why Dream Spex" title="Service as elevated as the product" />
              <div className="mt-8 space-y-5">
                {[
                  { icon: Truck, title: 'Fast dispatch', text: 'Carefully packed and sent with premium delivery options.' },
                  { icon: Zap, title: 'Quick care', text: 'Adjustments and repairs handled with expert craftsmanship.' },
                  { icon: Camera, title: 'Virtual styling', text: 'A cinematic preview that makes choosing effortless.' },
                ].map((item) => <div key={item.title} className="flex gap-4 rounded-[20px] border border-white/10 bg-slate-950/50 p-4"><item.icon className="mt-1 h-5 w-5 text-cyan-400" /><div><p className="font-semibold text-white">{item.title}</p><p className="mt-1 text-sm leading-7 text-slate-400">{item.text}</p></div></div>)}
              </div>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#101a39] to-[#060b17] p-8 backdrop-blur-xl">
              <SectionTitle eyebrow="Customer voices" title="Loved by those who value design" />
              <div className="mt-8 space-y-4">
                {reviews.map((review) => <div key={review.id} className="rounded-[20px] border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-white">{review.title}</p><p className="mt-2 text-sm leading-7 text-slate-400">“{review.content}”</p><p className="mt-3 text-sm font-medium text-cyan-300">{review.name}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <SectionTitle eyebrow="Premium storytelling" title="Craftsmanship that goes beyond the frame" description="Every detail is designed to elevate clarity, comfort, and confidence." />
          <div className="mt-10 space-y-6">
            {storySections.map((section, index) => (
              <motion.div key={section.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`grid gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_24px_80px_-35px_rgba(0,212,255,0.25)] lg:grid-cols-2 ${index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Crafted detail</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{section.title}</h3>
                  <p className="mt-4 text-base leading-8 text-slate-400">{section.copy}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Explore innovation <ArrowRight className="h-4 w-4" /></div>
                </div>
                <img src={section.image} alt={section.title} loading="lazy" className="h-72 w-full object-cover lg:h-full" />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <SectionTitle eyebrow="Testimonials" title="Editorial words from clients who love the experience" description="Refined service, thoughtful design, and beautifully made products." />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {testimonials.map((item) => (
              <motion.article key={item.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl">
                <img src={item.image} alt={item.name} loading="lazy" className="h-56 w-full object-cover" />
                <div className="p-8">
                  <div className="flex items-center gap-1 text-[#D4AF37]"><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /></div>
                  <p className="mt-4 text-lg leading-8 text-slate-300">“{item.quote}”</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.city}</p>
                    </div>
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-300">Verified</div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <SectionTitle eyebrow="Instagram" title="Moments of luxury, style, and everyday confidence" description="Seen across the Dream Spex world." />
          <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {instagramImages.map((image, index) => (
              <motion.div key={`${image}-${index}`} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                <img src={image} alt={`Luxury lifestyle ${index + 1}`} loading="lazy" className="w-full object-cover transition duration-500 hover:scale-105" />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <SectionTitle eyebrow="From the journal" title="Stories, styling notes, and optical insights" description="A closer look at craftsmanship, fit, and modern luxury." />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {blogPosts.map((post) => (
              <div key={post.title} className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Editorial</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{post.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{post.copy}</p>
                <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Read more <ArrowRight className="h-4 w-4" /></Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-8">
          <div className="rounded-[32px] border border-white/10 bg-[#0a1022] p-8 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Newsletter</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Get first access to new launches and private offers.</h2>
                <p className="mt-4 text-base leading-7 text-slate-400">Be the first to receive curated stories, early access, and invitation-only releases.</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <label className="text-sm font-medium text-slate-300" htmlFor="email">Email address</label>
                <input id="email" type="email" placeholder="you@example.com" className="mt-3 w-full rounded-full border border-white/10 bg-[#060b17] px-4 py-3 text-sm text-white outline-none" {...register('email', { required: 'Email is required', pattern: { value: /.+@.+\..+/, message: 'Please enter a valid email' } })} />
                {errors.email ? <p className="mt-2 text-sm text-rose-400">{errors.email.message}</p> : null}
                <Button fullWidth className="mt-5">Subscribe</Button>
                {submitted ? <p className="mt-3 text-sm text-cyan-300">Thank you — your invitation is on the way.</p> : null}
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-8">
          <div className="grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Limited edition</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">The Autumn Atelier release is almost here.</h2>
              <p className="mt-4 text-base leading-7 text-slate-400">Experience our newest sculptural silhouettes and premium finishings before they arrive in-store.</p>
              <CountdownTimer targetDate="2026-10-01T00:00:00" />
            </div>
            <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-6">
              <div className="flex items-center gap-2 text-cyan-300"><Crown className="h-4 w-4" /> Luxury launch</div>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="flex items-center gap-2"><Gem className="h-4 w-4 text-cyan-400" /> Hand-finished acetate detailing</div>
                <div className="flex items-center gap-2"><Star className="h-4 w-4 text-cyan-400" /> Signature titanium comfort core</div>
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-400" /> Exclusive early access for members</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
