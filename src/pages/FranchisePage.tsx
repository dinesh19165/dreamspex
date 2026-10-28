import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { formatINR } from '../utils/currency';

export default function FranchisePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Franchise" title="Build a premium eyewear business with VisionEye" description="A scalable, design-first retail opportunity with premium support and brand recognition." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 shadow-sm">
            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Why partner with us</h3>
            <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
              <li>• Proven premium retail model</li>
              <li>• Full merchandising and training support</li>
              <li>• Strong margins and recurring membership revenue</li>
            </ul>
            <Link to="/contact" className="mt-8 inline-flex"><Button>Apply now</Button></Link>
          </div>
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 text-[var(--text-primary)] shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Investment</p>
            <p className="mt-4 text-3xl font-semibold">Starting at {formatINR(750000)}</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">Flexible retail formats for premium flagship, boutique, and mall locations.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
