import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { catalogService, type CatalogCategory } from '../services/catalogService';
import { fetchOffers, type Offer } from '../services/offerService';
import { formatINR } from '../utils/currency';

function discountText(offer: Offer) {
  return offer.discountType === 'PERCENT'
    ? `${offer.discountValue}% OFF`
    : `${formatINR(offer.discountValue)} OFF`;
}

function offerIsCurrent(offer: Offer, now: number) {
  const startsAt = Date.parse(offer.startsAt);
  const endsAt = offer.endsAt ? Date.parse(offer.endsAt) : Number.POSITIVE_INFINITY;
  return offer.active
    && offer.publicationStatus === 'PUBLISHED'
    && Number.isFinite(startsAt)
    && startsAt <= now
    && endsAt > now;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [copyError, setCopyError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchOffers(controller.signal), catalogService.categories('OFFER')])
      .then(([nextOffers, nextCategories]) => {
        setOffers(nextOffers);
        setCategories(nextCategories.filter((category) => category.status === 'ACTIVE'));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load current offers.');
        }
      });
    const refreshExpiry = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(refreshExpiry);
    };
  }, []);

  const visibleOffers = useMemo(() => {
    const activeCategorySlugs = new Set(categories.map((category) => category.slug));
    return offers.filter((offer) => activeCategorySlugs.has(offer.category) && offerIsCurrent(offer, now));
  }, [categories, now, offers]);
  const groupedOffers = useMemo(() => {
    const groups = new Map<string, Offer[]>();
    visibleOffers.forEach((offer) => {
      const current = groups.get(offer.category) ?? [];
      current.push(offer);
      groups.set(offer.category, current);
    });
    return [...groups.entries()].sort(([categoryA], [categoryB]) => {
      const sortA = categories.find((category) => category.slug === categoryA)?.sortOrder ?? 0;
      const sortB = categories.find((category) => category.slug === categoryB)?.sortOrder ?? 0;
      return sortA - sortB || categoryA.localeCompare(categoryB);
    });
  }, [categories, visibleOffers]);

  const copyCode = async (code: string) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => current === code ? '' : current), 1800);
    } catch {
      setCopyError('Could not copy the code. Please select and copy it manually.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Offers" title="Limited time deals and savings" description="Explore current Dream Spex offers and find savings for your next pair." />
        {error ? <p className="mt-8 rounded-xl bg-red-400/10 p-4 text-sm text-red-200" role="alert">{error}</p> : null}
        {copyError ? <p className="mt-4 text-sm text-red-200" role="alert">{copyError}</p> : null}
        {!error && groupedOffers.length === 0 ? <p className="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">There are no current offers. Please check back soon.</p> : null}

        <div className="mt-10 space-y-14">
          {groupedOffers.map(([category, categoryOffers]) => (
            <section key={category} aria-labelledby={`offer-category-${category}`}>
              <h2 id={`offer-category-${category}`} className="font-serif text-3xl">{categories.find((item) => item.slug === category)?.name ?? category}</h2>
              {categories.find((item) => item.slug === category)?.description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{categories.find((item) => item.slug === category)?.description}</p> : null}
              <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {categoryOffers.map((offer) => (
                  <article key={offer.id} className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <Link to={offer.linkUrl || '/shop'} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
                      {offer.imageUrl || categories.find((item) => item.slug === category)?.imageUrl ? <img src={offer.imageUrl || categories.find((item) => item.slug === category)?.imageUrl || ''} alt={offer.title} loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-[var(--bg-secondary)]"><span className="font-serif text-3xl text-[var(--brand-green-dark)]">{discountText(offer)}</span></div>}
                      <div className="p-6 pb-3">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">{discountText(offer)}</p>
                        <h3 className="mt-3 text-2xl font-semibold">{offer.title}</h3>
                        {offer.subtitle ? <p className="mt-2 text-sm font-medium">{offer.subtitle}</p> : null}
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{offer.description}</p>
                        {offer.endsAt ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Valid until {new Date(offer.endsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p> : <p className="mt-4 text-xs text-[var(--text-secondary)]">Limited time offer</p>}
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)] group-hover:gap-3">Shop this offer <ArrowRight className="h-4 w-4 transition-all" /></span>
                      </div>
                    </Link>
                    {offer.couponCode ? <div className="flex items-center justify-between gap-3 px-6 pb-6">
                      <p className="min-w-0 truncate rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold">Code: {offer.couponCode}</p>
                      <Button type="button" variant="ghost" aria-label={`${copiedCode === offer.couponCode ? 'Copied' : 'Copy'} coupon code ${offer.couponCode}`} onClick={() => void copyCode(offer.couponCode!)}><Copy className="mr-2 h-4 w-4" />{copiedCode === offer.couponCode ? 'Copied' : 'Copy'}</Button>
                    </div> : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
