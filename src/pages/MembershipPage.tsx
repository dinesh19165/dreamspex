import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { membershipPlans } from '../data/mockData';

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Membership" title="Elevated perks for every member" description="Designed to offer premium support, savings, and priority access." />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {membershipPlans.map((plan) => (
            <div key={plan.id} className={`rounded-[24px] border p-8 backdrop-blur-xl ${plan.featured ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{plan.name}</p>
              <p className="mt-4 text-4xl font-semibold text-white">${plan.price}<span className="text-base text-slate-400">/mo</span></p>
              <p className="mt-4 text-sm leading-7 text-slate-400">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {plan.perks.map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
              <Button fullWidth className="mt-8">Join {plan.name}</Button>
            </div>
          ))}
        </div>
        <div className="mt-16 overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-sm backdrop-blur-xl">
          <div className="grid gap-8 p-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Comparison</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Find the tier that fits your lifestyle.</h2>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">
              <p>Silver: Daily essentials and priority support</p>
              <p className="mt-2">Gold: Premium savings and faster delivery</p>
              <p className="mt-2">Platinum: VIP access, luxury benefits, and concierge care</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
