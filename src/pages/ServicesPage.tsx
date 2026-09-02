import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';

const services = [
  { title: 'Home Eye Test', description: 'Book a convenient at-home consultation with certified experts.' },
  { title: 'Lens Replacement', description: 'Fast, precise lens upgrades for all frame styles.' },
  { title: 'Frame Adjustment', description: 'Perfect alignment and comfort for a tailored fit.' },
  { title: 'Repair', description: 'Restore damaged frames with premium care and craftsmanship.' },
  { title: 'Warranty', description: 'Enjoy support and protection on every purchase.' },
  { title: 'Shipping', description: 'Secure delivery with insured, premium packaging.' },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#0B0D18] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Services" title="Premium support for every pair" description="From fittings to repairs, we make eye care effortless." />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service.title} className="rounded-[24px] border border-white/10 bg-[#151823] p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{service.description}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
