import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { coupons } from '../data/mockData';

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Offers" title="Limited time deals and savings" description="Enjoy festival offers, bank discounts, and referral rewards all in one place." />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">{coupon.discount}</p>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">{coupon.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{coupon.description}</p>
              <div className="mt-6 rounded-[16px] bg-slate-50 p-4 text-sm font-semibold text-slate-900">Code: {coupon.code}</div>
              <Button fullWidth className="mt-6">Claim offer</Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
