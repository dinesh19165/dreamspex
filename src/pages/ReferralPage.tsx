import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';

export default function ReferralPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Referral Program" title="Refer a friend and earn beautiful rewards" description="Invite, share, and collect credits that can be redeemed on your next purchase." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-900">How it works</h3>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-[16px] bg-slate-50 p-4">1. Share your link with friends.</div>
              <div className="rounded-[16px] bg-slate-50 p-4">2. They make their first purchase.</div>
              <div className="rounded-[16px] bg-slate-50 p-4">3. You both receive reward credits.</div>
            </div>
            <Button className="mt-6">Get referral link</Button>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-900 p-8 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Reward cards</p>
            <p className="mt-4 text-3xl font-semibold">Earn up to $120</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">For each successful friend referral, enjoy a combination of store credit and exclusive offers.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
