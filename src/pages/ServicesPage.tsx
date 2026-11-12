import { ArrowRight, Camera, FileText, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';

const services = [
  { icon: Camera, title: 'Virtual try-on', description: 'Preview supported frames with the existing camera or photo try-on flow.', href: '/virtual-try-on', action: 'Start virtual try-on' },
  { icon: FileText, title: 'Prescription support', description: 'Enter prescription details and review lens selections for a frame.', href: '/shop?category=frames', action: 'Browse frames' },
  { icon: MapPin, title: 'Store services', description: 'View the active locations in the sample store directory and check available services.', href: '/stores', action: 'Find a store' },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Optical care" title="Care that fits your day" description="Explore the services available in the Dream Spex frontend, from virtual try-on to prescription support." />

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map(({ icon: Icon, title, description, href, action }) => (
            <article key={title} className="flex flex-col rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-green)]/12 text-[var(--brand-green-dark)]"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)] hover:underline">
                {action} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>

      </main>
      <Footer />
    </div>
  );
}
