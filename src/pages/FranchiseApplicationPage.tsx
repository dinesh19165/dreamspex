import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { franchiseApplicationService } from '../services/franchiseApplicationService';
import {
  validateFranchiseApplication,
  type FranchiseApplicationDraft,
  type FranchiseApplicationFieldErrors,
} from '../utils/franchiseApplicationValidation';

const initialDraft: FranchiseApplicationDraft = {
  fullName: '',
  mobileNumber: '',
  email: '',
  preferredCity: '',
  state: '',
  fullAddress: '',
  investmentBudget: '',
  preferredStoreFormat: '',
  additionalMessage: '',
};

const fieldClassName = 'mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]';

export default function FranchiseApplicationPage() {
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<FranchiseApplicationFieldErrors>({});
  const [requestError, setRequestError] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (field: keyof FranchiseApplicationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateFranchiseApplication(draft);
    setErrors(validationErrors);
    setRequestError('');
    if (Object.keys(validationErrors).length) return;

    setSaving(true);
    try {
      const created = await franchiseApplicationService.submit({
        ...draft,
        fullName: draft.fullName.trim(),
        mobileNumber: draft.mobileNumber.trim(),
        email: draft.email.trim(),
        preferredCity: draft.preferredCity.trim(),
        state: draft.state.trim(),
        fullAddress: draft.fullAddress.trim(),
        investmentBudget: Number(draft.investmentBudget),
        preferredStoreFormat: draft.preferredStoreFormat,
        additionalMessage: draft.additionalMessage.trim(),
      });
      setReferenceId(created.referenceId);
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : 'Unable to submit your application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Helmet><title>Franchise Application | Dream Spex</title></Helmet>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand-green-dark)]">Dream Spex Franchise</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Tell us about your franchise plans</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Share your details and our team will follow up. Submitting this application does not create an account or activate a store.
          </p>
        </div>

        {referenceId ? (
          <section role="status" className="rounded-3xl border border-emerald-700/20 bg-[var(--bg-card)] p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Application received</p>
            <h2 className="mt-3 text-2xl font-semibold">Thank you for your interest.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Your application reference is <strong className="text-[var(--text-primary)]">{referenceId}</strong>. The Super Admin team will review it and contact you.
            </p>
            <Link to="/franchise" className="mt-6 inline-flex">
              <Button variant="ghost">Back to franchise information</Button>
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} noValidate className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-8">
            {requestError ? <p role="alert" className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{requestError}</p> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">Applicant full name
                <input required autoComplete="name" maxLength={160} value={draft.fullName} onChange={(event) => updateField('fullName', event.target.value)}
                  aria-invalid={Boolean(errors.fullName)} className={fieldClassName} />
                {errors.fullName ? <span className="mt-1 block text-xs text-rose-700">{errors.fullName}</span> : null}
              </label>
              <label className="text-sm font-medium">Mobile number
                <input required type="tel" autoComplete="tel" maxLength={32} placeholder="+91 98765 43210" value={draft.mobileNumber}
                  onChange={(event) => updateField('mobileNumber', event.target.value)} aria-invalid={Boolean(errors.mobileNumber)} className={fieldClassName} />
                {errors.mobileNumber ? <span className="mt-1 block text-xs text-rose-700">{errors.mobileNumber}</span> : null}
              </label>
              <label className="text-sm font-medium">Email address
                <input required type="email" autoComplete="email" maxLength={255} value={draft.email}
                  onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} className={fieldClassName} />
                {errors.email ? <span className="mt-1 block text-xs text-rose-700">{errors.email}</span> : null}
              </label>
              <label className="text-sm font-medium">Preferred city
                <input required autoComplete="address-level2" maxLength={100} value={draft.preferredCity}
                  onChange={(event) => updateField('preferredCity', event.target.value)} aria-invalid={Boolean(errors.preferredCity)} className={fieldClassName} />
                {errors.preferredCity ? <span className="mt-1 block text-xs text-rose-700">{errors.preferredCity}</span> : null}
              </label>
              <label className="text-sm font-medium">State
                <input required autoComplete="address-level1" maxLength={100} value={draft.state}
                  onChange={(event) => updateField('state', event.target.value)} aria-invalid={Boolean(errors.state)} className={fieldClassName} />
                {errors.state ? <span className="mt-1 block text-xs text-rose-700">{errors.state}</span> : null}
              </label>
              <label className="text-sm font-medium">Investment budget (₹)
                <input required type="number" min="1" step="1" inputMode="numeric" value={draft.investmentBudget}
                  onChange={(event) => updateField('investmentBudget', event.target.value)} aria-invalid={Boolean(errors.investmentBudget)} className={fieldClassName} />
                {errors.investmentBudget ? <span className="mt-1 block text-xs text-rose-700">{errors.investmentBudget}</span> : null}
              </label>
              <label className="text-sm font-medium sm:col-span-2">Full address
                <textarea required maxLength={2000} rows={3} value={draft.fullAddress}
                  onChange={(event) => updateField('fullAddress', event.target.value)} aria-invalid={Boolean(errors.fullAddress)}
                  className={`${fieldClassName} resize-y`} />
                {errors.fullAddress ? <span className="mt-1 block text-xs text-rose-700">{errors.fullAddress}</span> : null}
              </label>
              <label className="text-sm font-medium">Preferred store format
                <select required value={draft.preferredStoreFormat} onChange={(event) => updateField('preferredStoreFormat', event.target.value)}
                  aria-invalid={Boolean(errors.preferredStoreFormat)} className={fieldClassName}>
                  <option value="">Select a store format</option>
                  <option value="PREMIUM_FLAGSHIP">Premium flagship</option>
                  <option value="BOUTIQUE">Boutique</option>
                  <option value="MALL_LOCATION">Mall location</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.preferredStoreFormat ? <span className="mt-1 block text-xs text-rose-700">{errors.preferredStoreFormat}</span> : null}
              </label>
              <label className="text-sm font-medium sm:col-span-2">Additional message <span className="font-normal text-[var(--text-secondary)]">(optional)</span>
                <textarea maxLength={2000} rows={4} value={draft.additionalMessage}
                  onChange={(event) => updateField('additionalMessage', event.target.value)} className={`${fieldClassName} resize-y`} />
              </label>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit application'}</Button>
              <Link to="/franchise" className="text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</Link>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
