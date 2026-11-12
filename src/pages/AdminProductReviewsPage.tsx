import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Check, EyeOff, RefreshCw, Search, ShieldCheck, Star, X } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { DashboardShell } from './FranchiseSystemPages';
import { useAuth } from '../context/useAuth';
import {
  reviewService,
  type AdminReview,
  type AdminReviewResponse,
} from '../services/reviewService';

type ReviewStatus = 'ALL' | AdminReview['moderationStatus'];
type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function AdminProductReviewsPage() {
  const { user, refreshAccessToken } = useAuth();
  const [data, setData] = useState<AdminReviewResponse | null>(null);
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('ALL');
  const [rating, setRating] = useState('ALL');
  const [status, setStatus] = useState<ReviewStatus>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const token = useCallback(async () => {
    const value = user?.accessToken ?? await refreshAccessToken();
    if (!value) throw new Error('Your administrator session has expired. Please sign in again.');
    return value;
  }, [refreshAccessToken, user?.accessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await reviewService.adminList(await token()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load product reviews.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const products = useMemo(() => [...new Map((data?.reviews ?? [])
    .map((review) => [review.productId, review.productName])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1])), [data?.reviews]);

  const filteredReviews = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.reviews ?? []).filter((review) => {
      const submittedDate = review.submittedAt.slice(0, 10);
      const searchMatch = !needle || [
        review.productName, review.customerName, review.customerEmail, review.customerPhone,
        review.orderNumber, review.title, review.content,
      ].some((value) => value?.toLowerCase().includes(needle));
      return searchMatch
        && (productId === 'ALL' || review.productId === productId)
        && (rating === 'ALL' || review.rating === Number(rating))
        && (status === 'ALL' || review.moderationStatus === status)
        && (!fromDate || submittedDate >= fromDate)
        && (!toDate || submittedDate <= toDate);
    }).sort((left, right) => {
      if (sort === 'oldest') return left.submittedAt.localeCompare(right.submittedAt);
      if (sort === 'highest') return right.rating - left.rating || right.submittedAt.localeCompare(left.submittedAt);
      if (sort === 'lowest') return left.rating - right.rating || right.submittedAt.localeCompare(left.submittedAt);
      return right.submittedAt.localeCompare(left.submittedAt);
    });
  }, [data?.reviews, fromDate, productId, query, rating, sort, status, toDate]);

  const moderate = async (review: AdminReview, nextStatus: 'APPROVED' | 'HIDDEN' | 'REJECTED') => {
    setSavingId(review.id);
    setError('');
    setNotice('');
    try {
      const updated = await reviewService.moderate(await token(), review.id, nextStatus);
      setData((current) => current ? {
        ...current,
        reviews: current.reviews.map((item) => item.id === updated.id ? updated : item),
      } : current);
      setNotice(`Review ${nextStatus.toLowerCase()}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update review moderation.');
    } finally {
      setSavingId('');
    }
  };

  const stats = data?.statistics;
  const avg = stats && stats.validReviewCount > 0
    ? [1, 2, 3, 4, 5].reduce((sum, value) => sum + value * (stats.distribution[String(value)] ?? 0), 0)
      / stats.validReviewCount
    : 0;

  return <DashboardShell>
    <SectionTitle eyebrow="Customer voice" title="Product reviews" description="Review verified-purchase feedback, keep lower-rated feedback private, and moderate public reviews." />
    {stats ? <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ['All submissions', stats.totalReviews],
        ['Pending', stats.pendingReviews],
        ['Approved', stats.approvedReviews],
        ['Hidden', stats.hiddenReviews],
        ['Rejected', stats.rejectedReviews],
        ['Verified average', avg.toFixed(1)],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      </div>)}
    </div> : null}
    {stats ? <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      {[5, 4, 3, 2, 1].map((value) => <span key={value} className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />{value}: {stats.distribution[String(value)] ?? 0}
      </span>)}
    </div> : null}
    <section className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search reviews</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews, customer, order..."
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Product
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]">
            <option value="ALL">All products</option>{products.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Rating
          <select value={rating} onChange={(event) => setRating(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]">
            <option value="ALL">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Moderation status
          <select value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]">
            {['ALL', 'PENDING', 'APPROVED', 'HIDDEN', 'REJECTED'].map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : value}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Submitted from
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Submitted to
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="text-xs text-[var(--text-secondary)]">Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)]">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option>
          </select>
        </label>
        <div className="flex items-end"><Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
      </div>
    </section>
    {notice ? <p className="mt-4 text-sm text-[var(--brand-green-dark)]" role="status">{notice}</p> : null}
    {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-600" role="alert">{error}</p> : null}
    <div className="mt-5 flex items-center justify-between text-sm text-[var(--text-secondary)]">
      <span>{loading ? 'Loading reviews...' : `${filteredReviews.length} review${filteredReviews.length === 1 ? '' : 's'} shown`}</span>
    </div>
    {!loading && !error && !filteredReviews.length ? <div className="mt-4 rounded-[24px] border border-dashed border-[var(--border-subtle)] p-10 text-center">
      <p className="font-semibold text-[var(--text-primary)]">No reviews match these filters</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Try another product, rating, customer, date range, or moderation status.</p>
    </div> : null}
    <div className="mt-4 space-y-4">{filteredReviews.map((review) => {
      const privateRating = review.rating <= 3;
      return <article key={review.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {review.productImageUrl ? <img src={review.productImageUrl} alt={review.productName} className="h-20 w-20 rounded-xl object-cover" loading="lazy" /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[var(--text-primary)]">{review.productName}</h2>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${privateRating ? 'bg-amber-400/15 text-amber-700' : 'bg-[var(--brand-green)]/10 text-[var(--brand-green-dark)]'}`}>
                {privateRating ? 'Private feedback' : 'Public-eligible rating'}
              </span>
              <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase">{review.moderationStatus}</span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-amber-400" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'text-[var(--text-secondary)]'}`} />)}
              <span className="ml-1 text-xs text-[var(--text-secondary)]">{review.rating}/5</span>
            </p>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{review.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{review.content}</p>
          </div>
        </div>
        {review.imageUrls.length ? <div className="mt-4 flex flex-wrap gap-3">{review.imageUrls.map((url) =>
          <img key={url} src={url} alt="Customer shared product" className="h-20 w-20 rounded-xl object-cover" loading="lazy" />)}</div> : null}
        <div className="mt-5 grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
          <p className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[var(--brand-green-dark)]" />{review.customerName} · {review.customerEmail ?? review.customerPhone ?? 'Contact unavailable'}</p>
          <p>Order {review.orderNumber} · {new Date(review.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {review.moderationStatus !== 'APPROVED' ? <Button type="button" disabled={savingId === review.id}
            onClick={() => void moderate(review, 'APPROVED')}><Check className="mr-2 h-4 w-4" />Approve</Button> : null}
          {review.moderationStatus !== 'HIDDEN' ? <Button type="button" variant="ghost" disabled={savingId === review.id}
            onClick={() => void moderate(review, 'HIDDEN')}><EyeOff className="mr-2 h-4 w-4" />Hide</Button> : null}
          {review.moderationStatus !== 'REJECTED' ? <Button type="button" variant="ghost" disabled={savingId === review.id}
            onClick={() => void moderate(review, 'REJECTED')}><X className="mr-2 h-4 w-4" />Reject</Button> : null}
          {review.moderationStatus === 'APPROVED' && review.rating >= 4 ? <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-green)]/10 px-3 py-2 text-xs font-semibold text-[var(--brand-green-dark)]"><ShieldCheck className="h-4 w-4" />Public</span> : null}
        </div>
      </article>;
    })}</div>
  </DashboardShell>;
}
