import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';

export default function FranchisePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Franchise" title="Build a premium eyewear business with VisionEye" description="A scalable, design-first retail opportunity with premium support and brand recognition." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900">Why partner with us</h3>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li>• Proven premium retail model</li>
              <li>• Full merchandising and training support</li>
              <li>• Strong margins and recurring membership revenue</li>
            </ul>
            <Button className="mt-8">Apply now</Button>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-900 p-8 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Investment</p>
            <p className="mt-4 text-3xl font-semibold">Starting at $75K</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">Flexible retail formats for premium flagship, boutique, and mall locations.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
