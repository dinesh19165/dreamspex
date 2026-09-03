import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { coupons } from '../data/mockData';

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = useState('');
  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(''), 1800);
  };
  return (
    <div className="min-h-screen bg-[#0B0D18] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Offers" title="Limited time deals and savings" description="Enjoy festival offers, bank discounts, and referral rewards all in one place." />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-[24px] border border-white/10 bg-[#151823] p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">{coupon.discount}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{coupon.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{coupon.description}</p>
              <div className="mt-6 flex items-center justify-between gap-3 rounded-[16px] bg-[#1B1F2B] p-4 text-sm font-semibold text-white"><span>Code: {coupon.code}</span><button type="button" onClick={() => copyCode(coupon.code)} className="text-cyan-300 transition hover:text-white">{copiedCode === coupon.code ? 'Copied' : 'Copy'}</button></div>
              <Button fullWidth className="mt-6" onClick={() => copyCode(coupon.code)}>{copiedCode === coupon.code ? 'Copied' : 'Claim offer'}</Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
