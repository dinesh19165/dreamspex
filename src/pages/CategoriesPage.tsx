import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { categories, products } from '../data/mockData';

const categorySlug = (value: string) => value.trim().toLowerCase().replaceAll(' ', '-');

export default function CategoriesPage() {
  const supportedCategories = [...new Set(products.map((product) => product.category))].map((productCategory) => {
    const matchingProducts = products.filter((product) => product.category === productCategory);
    const slug = categorySlug(productCategory);
    const category = categories.find((item) => item.slug === slug);
    return {
      slug: category?.slug ?? slug,
      name: category?.name ?? productCategory,
      description: category?.description ?? matchingProducts[0].description,
      image: matchingProducts[0].image,
      matchingProducts,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Categories" title="Explore the collection" description="Browse categories represented by products in the current Dream Spex catalogue." />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Category, audience, frame-shape and frame-type labels are drawn from sample product data. This page only lists categories with products in the current catalogue.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {supportedCategories.map(({ slug, name, description, image, matchingProducts }) => (
            <Link key={slug} to={`/shop?category=${slug}`} className="group overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline">
              <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-secondary)]">
                <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-green-dark)]">{matchingProducts.length} {matchingProducts.length === 1 ? 'style' : 'styles'}</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)]">Shop category <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
        {!supportedCategories.length ? <p className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-secondary)]">No categorized products are currently available.</p> : null}
      </main>
      <Footer />
    </div>
  );
}
