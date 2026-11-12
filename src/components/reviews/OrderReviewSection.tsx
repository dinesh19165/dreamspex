import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, ImagePlus, Star, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import {
  reviewService,
  ReviewApiError,
  type ReviewEligibility,
} from '../../services/reviewService';

export default function OrderReviewSection({ orderId, orderStatus }: {
  orderId: string;
  orderStatus: string;
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (orderStatus !== 'DELIVERED') {
      setLoading(false);
      setReviews([]);
      return;
    }
    if (!user?.accessToken) {
      setLoading(false);
      setError('Your customer session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setReviews(await reviewService.orderEligibility(user.accessToken, orderId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load review eligibility.');
    } finally {
      setLoading(false);
    }
  }, [orderId, orderStatus, user?.accessToken]);

  useEffect(() => { void load(); }, [load]);

  if (orderStatus !== 'DELIVERED') return null;

  return <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
    aria-labelledby={`order-reviews-${orderId}`}>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-green-dark)]">Verified purchases</p>
      <h2 id={`order-reviews-${orderId}`} className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Product reviews</h2>
    </div>
    {loading ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Checking review eligibility...</p>
      : error ? <p className="mt-5 text-sm text-red-600" role="alert">{error}</p>
        : reviews.length ? <div className="mt-5 space-y-4">{reviews.map((entry) =>
          <ReviewComposer key={entry.productId} entry={entry} onSaved={(updated) =>
            setReviews((current) => current.map((item) => item.productId === updated.productId ? updated : item))} />)}
        </div> : <p className="mt-5 text-sm text-[var(--text-secondary)]">No products in this order are eligible for a review.</p>}
  </section>;
}

function ReviewComposer({ entry, onSaved }: {
  entry: ReviewEligibility;
  onSaved: (review: ReviewEligibility) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(entry.rating ?? 5);
  const [title, setTitle] = useState(entry.title ?? '');
  const [content, setContent] = useState(entry.content ?? '');
  const [imageUrls, setImageUrls] = useState(entry.imageUrls);
  const [imageDraft, setImageDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const openForm = () => {
    setRating(entry.rating ?? 5);
    setTitle(entry.title ?? '');
    setContent(entry.content ?? '');
    setImageUrls(entry.imageUrls);
    setImageDraft('');
    setError('');
    setNotice('');
    setEditing(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.accessToken) {
      setError('Your customer session has expired. Please sign in again.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { rating, title: title.trim(), content: content.trim(), imageUrls };
      const updated = entry.reviewId
        ? await reviewService.update(user.accessToken, entry.reviewId, payload)
        : await reviewService.create(user.accessToken, entry.orderId, entry.productId, payload);
      onSaved(updated);
      setEditing(false);
      setNotice('Your review was submitted and is awaiting moderation.');
    } catch (reason) {
      setError(reason instanceof ReviewApiError && reason.status === 401
        ? 'Your customer session has expired. Please sign in again.'
        : reason instanceof Error ? reason.message : 'Unable to submit your review.');
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => {
    const value = imageDraft.trim();
    if (!value || imageUrls.includes(value) || imageUrls.length >= 5) return;
    setImageUrls((current) => [...current, value]);
    setImageDraft('');
  };

  return <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-5">
    <div className="flex flex-wrap items-start gap-4">
      {entry.productImageUrl ? <img src={entry.productImageUrl} alt={entry.productName}
        className="h-16 w-16 rounded-xl object-cover" loading="lazy" /> : null}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[var(--text-primary)]">{entry.productName}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Order {entry.orderNumber}</p>
        {entry.submittedAt ? <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Submitted {new Date(entry.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </p> : null}
        {entry.moderationStatus ? <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Review status: <span className="font-semibold">{entry.moderationStatus.toLowerCase()}</span>
        </p> : null}
      </div>
      {entry.eligible ? <button type="button" onClick={openForm}
        className="rounded-full border border-[var(--brand-green)]/40 px-4 py-2 text-sm font-semibold text-[var(--brand-green-dark)] transition hover:bg-[var(--brand-green)]/10">
        {entry.reviewId ? 'Edit your review' : 'Write a Review'}
      </button> : <p className="text-xs text-[var(--text-secondary)]">Not eligible for review</p>}
    </div>
    {notice ? <p className="mt-4 text-sm text-[var(--brand-green-dark)]" role="status">{notice}</p> : null}
    {editing ? <form onSubmit={submit} className="mt-5 space-y-4 border-t border-[var(--border-subtle)] pt-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)]">Your rating</label>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio"
              aria-checked={rating === value} aria-label={`${value} star${value === 1 ? '' : 's'}`}
              onClick={() => setRating(value)} className="rounded-md p-1 focus-visible:outline-2 focus-visible:outline-[var(--brand-green)]">
              <Star className={`h-7 w-7 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-secondary)]'}`} />
            </button>)}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-green)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--brand-green-dark)]">
          <BadgeCheck className="h-4 w-4" /> Verified Purchase
        </span>
      </div>
      <label className="block text-sm font-medium text-[var(--text-primary)]">Review title
        <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]" />
      </label>
      <label className="block text-sm font-medium text-[var(--text-primary)]">Your feedback
        <textarea required maxLength={3000} rows={4} value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-2 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]"
          placeholder="Share how the fit, comfort, and quality work for you." />
      </label>
      <div>
        <label htmlFor={`review-image-${entry.productId}`} className="block text-sm font-medium text-[var(--text-primary)]">Product images (optional)</label>
        <div className="mt-2 flex gap-2">
          <input id={`review-image-${entry.productId}`} type="url" maxLength={1000} value={imageDraft}
            onChange={(event) => setImageDraft(event.target.value)} placeholder="Paste an image URL"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]" />
          <button type="button" onClick={addImage} disabled={!imageDraft.trim() || imageUrls.length >= 5}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50">
            <ImagePlus className="h-4 w-4" /><span className="hidden sm:inline">Add</span>
          </button>
        </div>
        {imageUrls.length ? <ul className="mt-3 flex flex-wrap gap-3">{imageUrls.map((url) =>
          <li key={url} className="relative">
            <img src={url} alt="Review upload preview" className="h-16 w-16 rounded-lg object-cover" />
            <button type="button" onClick={() => setImageUrls((current) => current.filter((value) => value !== url))}
              aria-label="Remove review image" className="absolute -right-2 -top-2 rounded-full bg-[var(--bg-card)] p-1 text-[var(--text-primary)] shadow">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>)}</ul> : null}
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Add up to five publicly accessible image URLs.</p>
      </div>
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving}
          className="rounded-full bg-[var(--brand-green)] px-5 py-3 text-sm font-semibold text-[#142015] disabled:opacity-60">
          {saving ? 'Submitting...' : entry.reviewId ? 'Save changes' : 'Submit review'}
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving}
          className="rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)]">Cancel</button>
      </div>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">Reviews are verified against this delivered order and are public only after approval. Ratings of 1–3 stars remain private.</p>
    </form> : null}
  </article>;
}
