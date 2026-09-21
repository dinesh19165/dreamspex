import { ArrowRight, BadgeCheck, Camera, ChevronRight, Eye, FileText, Glasses, MapPin, ShieldCheck, Sparkles, Star, Stethoscope, Truck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import ProductCard from '../components/ui/ProductCard';
import { categories, coupons, membershipPlans, products, reviews } from '../data/mockData';
import { HERO_IMAGE_URL } from '../config/siteMedia';

const categoryDetails = [
  { name: 'Eyeglasses', slug: 'frames', image: categories[0].image, copy: 'Everyday frames with considered proportions.' },
  { name: 'Sunglasses', slug: 'sunglasses', image: categories[1].image, copy: 'UV400 protection with unmistakable presence.' },
  { name: 'Computer glasses', slug: 'computer-glasses', image: categories[5].image, copy: 'Comfort-led clarity for long screen days.' },
  { name: 'Kids eyewear', slug: 'kids-collection', image: categories[4].image, copy: 'Lightweight frames made for moving minds.' },
  { name: 'Blue light', slug: 'blue-light-glasses', image: categories[6].image, copy: 'Screen-friendly clarity for focused days.' },
  { name: 'Prescription', slug: 'frames', image: categories[0].image, copy: 'Precision lenses fitted to your vision.' },
  { name: 'Contact lenses', slug: 'contact-lenses', image: categories[3].image, copy: 'All-day comfort and clear, natural vision.' },
  { name: 'Reading glasses', slug: 'reading-glasses', image: categories[7].image, copy: 'Easy clarity for close-up moments.' },
];

const shapes = [
  ['Round', '1577803645773-f96470509666'], ['Rectangle', '1556306535-38febf6782e7'], ['Square', '1573865526739-10659fec78a5'], ['Aviator', '1511499767150-a48a237f0083'], ['Wayfarer', '1572635196237-14b3f281503f'], ['Cat eye', '1574258495973-f010dfbb6c8b'], ['Rimless', '1577803645773-f96470509666'], ['Geometric', '1591076482161-42ce6da69f67'],
];

const services = [
  { icon: Stethoscope, title: 'Free eye test', copy: 'Professional vision guidance in-store or at home.', path: '/contact' },
  { icon: FileText, title: 'Prescription support', copy: 'Upload your prescription and we will take care of the details.', path: '/products' },
  { icon: Camera, title: 'Virtual try-on', copy: 'Find your fit before you commit, from the comfort of home.', path: '/virtual-try-on' },
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

  return <svg viewBox="0 0 100 110" aria-hidden="true" className="h-24 w-20 text-[#b7e77a]/75 transition duration-300 group-hover:text-[#b7e77a] sm:h-28 sm:w-24"><path d={paths[shape]} fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M36 48h10M54 48h10M46 69h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" opacity=".65" /></svg>;
}

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Helmet><title>Dream Spex | See Better. Look Remarkable.</title><meta name="description" content="Premium eyewear, precision lenses and expert optical care from Dream Spex." /></Helmet>
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden border-b border-black/10 bg-[#e7eee4]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[#5d9417]"><Sparkles className="h-4 w-4" /> Dream Spex optical atelier</p>
              <h1 className="mt-5 font-serif text-5xl font-medium leading-[0.98] tracking-tight text-[#182116] sm:text-7xl">See better.<br /><em className="text-[#689f24]">Look remarkable.</em></h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#5f6c5b]">Premium frames, precision lenses and personal optical care, thoughtfully designed around the way you see the world.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/shop?category=frames"><Button>Shop eyeglasses <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Link to="/shop?category=sunglasses"><Button variant="ghost">Shop sunglasses</Button></Link><Link to="/virtual-try-on"><Button variant="ghost"><Glasses className="mr-2 h-4 w-4" /> Try virtually</Button></Link></div>
              <div className="mt-10 flex flex-wrap gap-5 text-sm text-[#5f6c5b]"><span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-[#689f24]" /> Prescription support</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#689f24]" /> Easy returns</span></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }} className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#cbd8c4] lg:min-h-[620px]">
              <img src={HERO_IMAGE_URL} alt="Sculptural black eyewear" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#192319]/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white"><div><p className="text-xs uppercase tracking-[0.25em] text-[#c8ee91]">Featured frame</p><p className="mt-1 text-2xl font-medium">Aurelia Rimless</p></div><Link to="/product/1" className="rounded-full bg-white p-3 text-[#182116]" aria-label="View Aurelia Rimless"><ArrowRight className="h-5 w-5" /></Link></div>
            </motion.div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[var(--bg-primary)]"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-black/10 px-4 py-5 text-sm text-[var(--text-secondary)] sm:grid-cols-4 sm:px-6 lg:px-8"><span className="flex items-center justify-center gap-2 py-2"><Eye className="h-4 w-4 text-[#689f24]" /> Expert fitting</span><span className="flex items-center justify-center gap-2 py-2"><Truck className="h-4 w-4 text-[#689f24]" /> Fast delivery</span><span className="flex items-center justify-center gap-2 py-2"><FileText className="h-4 w-4 text-[#689f24]" /> Prescription ready</span><span className="flex items-center justify-center gap-2 py-2"><ShieldCheck className="h-4 w-4 text-[#689f24]" /> 2-year warranty</span></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Find your fit</p><h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">Shop by category</h2></div><Link to="/categories" className="hidden items-center gap-1 text-sm font-semibold text-[#689f24] sm:flex">View all <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categoryDetails.map((category, index) => <motion.div key={category.slug} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .06 }}><Link to={`/shop?category=${category.slug}`} className="group block"><div className="aspect-[0.9] overflow-hidden rounded-2xl bg-[#e9eee4]"><img src={category.image} alt={category.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div><h3 className="mt-4 text-lg font-semibold">{category.name}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{category.copy}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#689f24]">Shop now <ArrowRight className="h-4 w-4" /></span></Link></motion.div>)}</div></section>

        <section className="border-y border-black/10 bg-[#f0f4ed] py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Made for your world</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Shop by wearer</h2></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#5d9417] sm:flex">View all frames <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-8 grid gap-4 md:grid-cols-3">{[['Men', categories[0]], ['Women', categories[1]], ['Kids', categories[4]]].map(([label, category]) => <Link key={label as string} to={`/shop?category=${(category as typeof categories[number]).slug}`} className="group relative min-h-[260px] overflow-hidden rounded-2xl"><img src={(category as typeof categories[number]).image} alt={`${label as string} eyewear`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#182218] via-transparent to-transparent" /><div className="absolute bottom-5 left-5 text-white"><p className="font-serif text-3xl">{label as string}</p><span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#c8ee91]">Shop collection <ArrowRight className="h-4 w-4" /></span></div></Link>)}</div></div></section>

        <section className="bg-[#182218] py-20 text-white"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b7e77a]">The edit</p><h2 className="mt-3 font-serif text-4xl">Frames with a point of view</h2></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#b7e77a] sm:flex">Shop all frames <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{shapes.map(([name, id]) => <Link key={name} to="/shop" className="group relative aspect-square overflow-hidden rounded-2xl bg-[#2b3b29]"><img src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=85`} alt={`${name} eyeglasses`} loading="lazy" className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" /><div className="absolute inset-x-4 bottom-4 flex items-center justify-between"><span className="font-medium">{name}</span><span className="rounded-full bg-white/15 p-2"><ArrowRight className="h-4 w-4" /></span></div></Link>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8 md:grid-cols-[.72fr_1.28fr] md:p-10"><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Find your fit</p><h2 className="mt-3 font-serif text-4xl">Frames for your face</h2><p className="mt-4 max-w-md text-[var(--text-secondary)]">Not sure which frame suits you? Start with a simple face-shape guide, then try your favourites virtually.</p><Link to="/virtual-try-on" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#182218] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3b29]">Find my frame <ArrowRight className="h-4 w-4" /></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{['Round', 'Oval', 'Square', 'Heart', 'Diamond', 'Long'].map((shape) => <Link key={shape} to="/virtual-try-on" aria-label={`Explore ${shape} face shape frames`} className="group relative flex min-h-32 items-center justify-between overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition duration-300 hover:-translate-y-1 hover:border-[#689f24] hover:bg-[var(--bg-primary)] focus-visible:-translate-y-1"><span className="relative z-10 self-end pb-1">{shape}</span><FaceShapeIllustration shape={shape} /></Link>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Most loved</p><h2 className="mt-3 font-serif text-4xl">Bestselling frames</h2></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#689f24] sm:flex">Explore shop <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Just in</p><h2 className="mt-3 font-serif text-4xl">New arrivals</h2></div><Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-[#689f24] sm:flex">View all <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-4">{products.slice(0, 3).map((product) => <div key={product.id} className="min-w-[280px] snap-start sm:min-w-[320px]"><ProductCard product={product} /></div>)}</div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="grid overflow-hidden rounded-3xl bg-[#dfe9d8] lg:grid-cols-[1fr_1.1fr]"><div className="p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]">Try before you choose</p><h2 className="mt-4 font-serif text-4xl leading-tight text-[#182116]">Your next pair is closer than you think.</h2><p className="mt-5 max-w-md leading-7 text-[#5f6c5b]">Upload a photo or use your camera to preview selected frames. Switch styles until the right one feels obvious.</p><Link to="/virtual-try-on" className="mt-8 inline-flex"><Button><Camera className="mr-2 h-4 w-4" /> Start virtual try-on</Button></Link></div><div className="relative min-h-[300px]"><img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=90" alt="Person wearing stylish spectacles" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></div></div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-[#31452d] bg-[#182218] text-white shadow-[0_30px_80px_-42px_rgba(24,34,24,0.8)]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b7e77a]">Home trial</p>
                <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight sm:text-5xl">Try frames at home.</h2>
                <p className="mt-5 max-w-md text-base leading-7 text-white/70">Choose your shortlist online, try your favourite frames at home, and find the pair that feels right.</p>
                <Link to="/shop" className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#b7e77a] px-5 py-3 text-sm font-semibold text-[#182218] transition hover:bg-[#d2f59d]">
                  Start your home trial <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.35 }} className="relative min-h-[300px] overflow-hidden bg-[#2b3b29] sm:min-h-[380px] lg:min-h-[440px]">
                <img src="https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1400&q=90" alt="Person wearing premium eyewear at home" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#182218]/35 via-transparent to-[#182218]/10" />
                <div className="absolute bottom-5 left-5 rounded-full border border-white/20 bg-[#182218]/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d2f59d] backdrop-blur-md">Try it your way</div>
              </motion.div>
            </div>
            <div className="border-t border-white/15 px-5 py-6 sm:px-8 lg:px-12">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {['Select frames', 'Choose your trial', 'Try at home', 'Pick your favourite', 'Complete order'].map((step, index) => (
                  <div key={step} className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:block sm:min-h-[92px] sm:px-4 sm:py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b7e77a] text-xs font-bold text-[#182218]">0{index + 1}</span>
                    <p className="text-sm font-semibold text-white sm:mt-4">{step}</p>
                    {index < 4 ? <span className="hidden lg:block absolute -right-2 top-1/2 h-px w-4 bg-[#b7e77a]/40" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#f0f4ed] py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Optical care</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">More than a frame store.</h2><p className="mt-5 leading-7 text-[#5f6c5b]">From first prescription to final fit, our optical specialists make every step clear and comfortable.</p><Link to="/services" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#5d9417]">Explore services <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-3">{services.map(({ icon: Icon, title, copy, path }) => <Link key={title} to={path} className="rounded-2xl border border-[#d3dfcd] bg-white p-5 transition hover:-translate-y-1"><Icon className="h-6 w-6 text-[#689f24]" /><h3 className="mt-8 font-semibold text-[#182116]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#687468]">{copy}</p></Link>)}</div></div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl bg-[#182218] p-8 text-white sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b7e77a]">Dream Spex membership</p><h2 className="mt-3 max-w-lg font-serif text-4xl">Better care, year after year.</h2><div className="mt-8 grid gap-3 sm:grid-cols-3">{membershipPlans.map((plan) => <button key={plan.id} onClick={() => navigate(`/membership/checkout?plan=${plan.name.toLowerCase()}`)} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-left transition hover:border-[#b7e77a]"><p className="text-sm text-[#b7e77a]">{plan.name}</p><p className="mt-2 text-2xl font-semibold">${plan.price}<span className="text-sm font-normal text-white/50">/mo</span></p><p className="mt-3 text-xs leading-5 text-white/60">{plan.perks[0]}</p></button>)}</div></div><div className="rounded-3xl border border-[#d5dfd1] bg-[#f0f4ed] p-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#689f24]">Offers</p><h2 className="mt-3 font-serif text-3xl text-[#182116]">A little more clarity for less.</h2><div className="mt-6 space-y-3">{coupons.map((coupon) => <div key={coupon.code} className="flex items-center justify-between border-b border-[#d5dfd1] pb-3"><div><p className="font-semibold text-[#182116]">{coupon.discount} <span className="font-normal text-[#687468]">{coupon.title}</span></p><p className="text-xs text-[#687468]">Code: {coupon.code}</p></div><Link to="/offers" className="text-sm font-semibold text-[#5d9417]">Apply</Link></div>)}</div></div></div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="grid gap-5 md:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-2xl border border-black/10 bg-[var(--bg-card)] p-6"><div className="flex gap-1 text-[#d49b38]">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div><p className="mt-5 text-lg leading-7">“{review.content}”</p><p className="mt-5 text-sm text-[var(--text-secondary)]">{review.name} · {review.title}</p></article>)}</div></section>

        <section className="bg-[#dfe9d8] py-16"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#5d9417]"><MapPin className="h-4 w-4" /> Visit Dream Spex</p><h2 className="mt-3 font-serif text-4xl text-[#182116]">Your vision deserves expert care.</h2></div><div className="flex flex-wrap gap-3"><Link to="/contact"><Button>Book an eye test</Button></Link><Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-[#a9bba2] px-5 py-3 text-sm font-semibold text-[#182116]">Find a store <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
