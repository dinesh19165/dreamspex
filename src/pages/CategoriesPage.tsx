import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { catalogService, type CatalogCategory } from '../services/catalogService';
import { fetchHomepage } from '../services/homepageService';
import { resolveCmsMediaUrl } from '../config/api';

export default function CategoriesPage() {
  const [supportedCategories, setSupportedCategories] = useState<CatalogCategory[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    catalogService.categories()
      .then((items) => setSupportedCategories(items.filter((item) => item.status === 'ACTIVE')))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load categories.'));
    fetchHomepage()
      .then((homepage) => setCategoryImages(Object.fromEntries(homepage.cards
        .filter((card) => card.sectionKey === 'CATEGORY_BANNER' && card.destinationType === 'CATEGORY' && card.imageUrl)
        .map((card) => [card.destinationValue, card.imageUrl as string]))))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load category banners.'));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Categories" title="Explore the collection" description="Browse categories represented by products in the current Dream Spex catalogue." />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Browse the categories currently available in the Dream Spex catalogue.</p>
        {error ? <p className="mt-6 text-sm text-red-600" role="alert">{error}</p> : null}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {supportedCategories.map(({ slug, name, description, imageUrl }) => {
            const resolvedImage = resolveCmsMediaUrl(imageUrl) ?? categoryImages[slug];
            return <Link key={slug} to={`/shop?category=${encodeURIComponent(slug)}`} className="group overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline">
              <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-secondary)]">
                {resolvedImage ? <img src={resolvedImage} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center px-6 text-center font-serif text-2xl text-[var(--text-secondary)]">{name}</div>}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description ?? 'Explore this category.'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-green-dark)]">Shop styles</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)]">Shop category <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>;
          })}
        </div>
        {!supportedCategories.length ? <p className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-secondary)]">No categorized products are currently available.</p> : null}
      </main>
      <Footer />
    </div>
  );
}
