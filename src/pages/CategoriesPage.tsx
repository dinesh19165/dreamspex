import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { categories } from '../data/mockData';

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-[#0B0D18] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Categories" title="Explore by collection" description="Find the right eyewear experience for every need and style." />
        <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#151823] shadow-sm">
              <img src={category.image} alt={category.name} className="h-56 w-full object-cover" />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{category.description}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
