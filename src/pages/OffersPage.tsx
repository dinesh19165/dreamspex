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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Offers" title="Limited time deals and savings" description="Enjoy festival offers, bank discounts, and referral rewards all in one place." />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">{coupon.discount}</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{coupon.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{coupon.description}</p>
              <div className="mt-6 flex items-center justify-between gap-3 rounded-[16px] bg-[var(--bg-secondary)] p-4 text-sm font-semibold text-[var(--text-primary)]"><span>Code: {coupon.code}</span><button type="button" onClick={() => copyCode(coupon.code)} className="text-cyan-300 transition hover:text-[var(--text-primary)]">{copiedCode === coupon.code ? 'Copied' : 'Copy'}</button></div>
              <Button fullWidth className="mt-6" onClick={() => copyCode(coupon.code)}>{copiedCode === coupon.code ? 'Copied' : 'Claim offer'}</Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
