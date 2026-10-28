import { useState } from 'react';
import { ArrowRight, CalendarDays, Camera, FileText, Glasses, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';

const services = [
  { icon: Camera, title: 'Virtual try-on', description: 'Preview supported frames with the existing camera or photo try-on flow.', href: '/virtual-try-on', action: 'Start virtual try-on' },
  { icon: FileText, title: 'Prescription support', description: 'Enter prescription details and review lens selections for a frame.', href: '/shop?category=frames', action: 'Browse frames' },
  { icon: Glasses, title: 'Home try-on', description: 'Explore the home-trial request interface. Store confirmation is required.', href: '#appointments', action: 'Request information' },
  { icon: MapPin, title: 'Store services', description: 'View the active locations in the sample store directory and check available services.', href: '/stores', action: 'Find a store' },
];

export default function ServicesPage() {
  const [requestPreviewed, setRequestPreviewed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Optical care" title="Care that fits your day" description="Explore the services available in the Dream Spex frontend, from virtual try-on to prescription support." />

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <section id="appointments" className="mt-14 grid scroll-mt-28 gap-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-9 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-green-dark)]">Appointment enquiry</p>
            <h2 className="mt-3 font-serif text-3xl">Plan an eye-care visit</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">Choose a service and preferred time to prepare an enquiry preview. Appointment scheduling is not connected to a booking system in this frontend demo.</p>
            <Link to="/stores" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)] hover:underline">Check sample store locations <ArrowRight className="h-4 w-4" /></Link>
          </div>

          <div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setRequestPreviewed(true); }}>
              <label className="text-sm font-medium">Service
                <select required defaultValue="" onChange={() => setRequestPreviewed(false)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
                  <option value="" disabled>Select a service</option>
                  <option>Home eye-test enquiry</option>
                  <option>Home try-on enquiry</option>
                  <option>In-store consultation</option>
                </select>
              </label>
              <label className="text-sm font-medium">Preferred city
                <input required name="city" autoComplete="address-level2" placeholder="Enter your city" onChange={() => setRequestPreviewed(false)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]" />
              </label>
              <label className="text-sm font-medium">Preferred date
                <input required type="date" min={new Date().toISOString().split('T')[0]} onChange={() => setRequestPreviewed(false)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]" />
              </label>
              <label className="text-sm font-medium">Email address
                <input required type="email" autoComplete="email" placeholder="you@example.com" onChange={() => setRequestPreviewed(false)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-green)] px-5 py-3 text-sm font-semibold text-[#172015] transition hover:brightness-105"><CalendarDays className="h-4 w-4" /> Preview enquiry</button>
              </div>
            </form>
            {requestPreviewed ? <p role="status" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-primary)]">Preview only: no appointment has been sent or booked. A backend booking integration is required to confirm visits.</p> : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
