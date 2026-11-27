import { RefreshCw } from 'lucide-react';
import BrandLogo from '../components/ui/BrandLogo';
import Button from '../components/ui/Button';
import { useMaintenance } from '../context/MaintenanceContext';

export default function MaintenancePage() {
  const { status, refresh, loading } = useMaintenance();
  const endAt = status?.endAt ? new Date(status.endAt) : null;
  const completion = endAt && !Number.isNaN(endAt.getTime())
    ? endAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
    : null;

  return (
    <main className="maintenance-page flex min-h-screen items-center justify-center px-5 py-12">
      <section className="maintenance-animated-border w-full max-w-xl rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 text-center shadow-2xl sm:p-10">
        <div className="maintenance-card-content">
          <div className="mx-auto flex w-fit"><BrandLogo /></div>
          <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-[var(--brand-green)]" />
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.32em] text-[var(--brand-green-dark)]">Scheduled maintenance</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
            {status?.title || 'DreamSpex is temporarily unavailable'}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
            {status?.message || 'We are upgrading our services. Please try again shortly.'}
          </p>
          {completion ? (
            <p className="mt-6 rounded-2xl bg-[var(--bg-primary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
              Expected completion: {completion} UTC
            </p>
          ) : null}
          <p className="mt-6 text-xs text-[var(--text-secondary)]">
            Need help? Contact <a className="font-semibold text-[var(--brand-green-dark)] underline" href="/contact">8885681789</a>.
          </p>
          <Button type="button" className="mt-7" disabled={loading} onClick={() => void refresh()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Check again'}
          </Button>
        </div>
      </section>
    </main>
  );
}
