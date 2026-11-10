import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import { resolveCmsMediaUrl } from '../config/api';
import { formatINR } from '../utils/currency';
import { adminProductService, type AdminCategory, type AdminProduct } from '../services/adminProductService';
import { AdminApiError, adminService } from '../services/adminService';
import type { Offer, OfferRequest } from '../services/offerService';
import { DashboardShell } from './FranchiseSystemPages';

type OfferDraft = {
  couponCode: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  category: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: string;
  minSubtotal: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
  customerEligibility: OfferRequest['customerEligibility'];
  displayOrder: string;
  active: boolean;
  publicationStatus: OfferRequest['publicationStatus'];
  applicableProductIds: string[];
  applicableCategoryIds: string[];
};

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: string;
  sortOrder: string;
};

type DashboardTab = 'offers' | 'categories' | 'membership' | 'coupons';
type OfferState = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';
type SortKey = 'title' | 'category' | 'couponCode' | 'discountType' | 'discountValue' | 'minSubtotal' | 'maxDiscount' | 'startsAt' | 'endsAt' | 'status' | 'displayOrder';

const localInputDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const emptyDraft = (category = ''): OfferDraft => ({
  couponCode: '',
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  category,
  discountType: 'PERCENT',
  discountValue: '',
  minSubtotal: '',
  maxDiscount: '',
  startsAt: localInputDate(new Date()),
  endsAt: '',
  usageLimit: '',
  perUserLimit: '',
  customerEligibility: 'ALL',
  displayOrder: '0',
  active: true,
  publicationStatus: 'DRAFT',
  applicableProductIds: [],
  applicableCategoryIds: [],
});
const emptyCategoryDraft = (): CategoryDraft => ({
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
  sortOrder: '0',
});

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10';
const imageFileIsValid = (file: File) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10_000_000;

function slugFromName(value: string) {
  const slug = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `offer-${slug}` : '';
}

function offerRequest(offer: Offer): OfferRequest {
  const { id: _id, linkUrl: _linkUrl, ...request } = offer;
  return request;
}

function draftFromOffer(offer: Offer): OfferDraft {
  return {
    couponCode: offer.couponCode ?? '',
    title: offer.title,
    subtitle: offer.subtitle ?? '',
    description: offer.description,
    imageUrl: offer.imageUrl ?? '',
    category: offer.category,
    discountType: offer.discountType,
    discountValue: String(offer.discountValue),
    minSubtotal: offer.minSubtotal == null ? '' : String(offer.minSubtotal),
    maxDiscount: offer.maxDiscount == null ? '' : String(offer.maxDiscount),
    startsAt: localInputDate(new Date(offer.startsAt)),
    endsAt: offer.endsAt ? localInputDate(new Date(offer.endsAt)) : '',
    usageLimit: offer.usageLimit == null ? '' : String(offer.usageLimit),
    perUserLimit: offer.perUserLimit == null ? '' : String(offer.perUserLimit),
    customerEligibility: offer.customerEligibility,
    displayOrder: String(offer.displayOrder),
    active: offer.active,
    publicationStatus: offer.publicationStatus,
    applicableProductIds: offer.applicableProductIds ?? [],
    applicableCategoryIds: offer.applicableCategoryIds ?? [],
  };
}

function toOfferRequest(draft: OfferDraft, publicationStatus: OfferRequest['publicationStatus']): OfferRequest {
  return {
    couponCode: draft.couponCode.trim() || null,
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim() || null,
    description: draft.description.trim(),
    imageUrl: draft.imageUrl,
    category: draft.category.trim(),
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    minSubtotal: draft.minSubtotal ? Number(draft.minSubtotal) : null,
    maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null,
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
    perUserLimit: draft.perUserLimit ? Number(draft.perUserLimit) : null,
    customerEligibility: draft.customerEligibility,
    displayOrder: Number(draft.displayOrder),
    active: draft.active,
    publicationStatus,
    applicableProductIds: draft.applicableProductIds,
    applicableCategoryIds: draft.applicableCategoryIds,
  };
}

function offerState(offer: Offer, now: number): OfferState {
  if (!offer.active || offer.publicationStatus !== 'PUBLISHED') return 'INACTIVE';
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return 'EXPIRED';
  if (new Date(offer.startsAt).getTime() > now) return 'SCHEDULED';
  return 'ACTIVE';
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(status: OfferState) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function StatusPill({ status }: { status: OfferState | string }) {
  const color = status === 'ACTIVE' || status === 'PUBLISHED'
    ? 'bg-emerald-50 text-emerald-800'
    : status === 'SCHEDULED'
      ? 'bg-blue-50 text-blue-700'
      : status === 'EXPIRED'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>{status === 'ACTIVE' || status === 'INACTIVE' || status === 'SCHEDULED' || status === 'EXPIRED' ? statusLabel(status) : status}</span>;
}

function Drawer({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer: ReactNode }) {
  return <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/35" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" aria-label={title} aria-modal="true" role="dialog">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Dream Spex · Promotions</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2></div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
      <footer className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7">{footer}</footer>
    </aside>
  </div>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-slate-100 py-5 first:pt-0 last:border-0">
    <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </section>;
}

export default function AdminOffersPage() {
  const { user, refreshAccessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [offerCategories, setOfferCategories] = useState<AdminCategory[]>([]);
  const [productCategories, setProductCategories] = useState<AdminCategory[]>([]);
  const [draft, setDraft] = useState<OfferDraft>(() => emptyDraft());
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<'offer' | 'category' | null>(null);
  const [tab, setTab] = useState<DashboardTab>(() => (searchParams.get('section') as DashboardTab) || 'offers');
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get('category') ?? '');
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('displayOrder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const request = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!user) throw new Error('Your admin session has expired. Please sign in again.');
    const initialToken = user.accessToken ?? await refreshAccessToken();
    if (!initialToken) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return await operation(initialToken);
    } catch (reason) {
      if (!(reason instanceof AdminApiError) || reason.status !== 401) throw reason;
      const accessToken = await refreshAccessToken(initialToken);
      if (!accessToken) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(accessToken);
    }
  }, [refreshAccessToken, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextOffers, nextProducts, nextOfferCategories, nextProductCategories] = await Promise.all([
        request((token) => adminService.offers(token)),
        adminProductService.list(),
        request((token) => adminService.categories(token, 'OFFER')),
        adminProductService.categories(),
      ]);
      setOffers(nextOffers);
      setProducts(nextProducts);
      setOfferCategories(nextOfferCategories);
      setProductCategories(nextProductCategories.filter((category) => category.status === 'ACTIVE'));
      setDraft((current) => current.category
        ? current
        : { ...current, category: nextOfferCategories.find((category) => category.status === 'ACTIVE')?.slug ?? '' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load offers.');
    } finally {
      setLoading(false);
    }
  }, [request, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const section = searchParams.get('section');
    setTab(section === 'categories' || section === 'membership' || section === 'coupons' ? section : 'offers');
    setQuery(searchParams.get('q') ?? '');
    setFilterCategory(searchParams.get('category') ?? '');
    setFilterStatus(searchParams.get('status') ?? '');
  }, [searchParams]);

  const updateOfferFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => value && value !== 'ALL' ? next.set(key, value) : next.delete(key));
    setSearchParams(next, { replace: true });
  };

  const uploadCmsImage = async (file: File) => {
    if (!imageFileIsValid(file)) throw new Error('Use a JPEG, PNG, or WebP image up to 10 MB.');
    let token = user?.accessToken ?? await refreshAccessToken();
    if (!token) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return await adminService.uploadCmsImage(token, file);
    } catch (reason) {
      if (!(reason instanceof AdminApiError) || reason.status !== 401) throw reason;
      token = await refreshAccessToken(token);
      if (!token) throw new Error('Your admin session has expired. Please sign in again.');
      return adminService.uploadCmsImage(token, file);
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadCmsImage(file);
      setDraft((current) => ({ ...current, imageUrl: result.url }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Offer image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const uploadCategoryImage = async (file?: File) => {
    if (!file) return;
    setUploadingCategoryImage(true);
    setError('');
    try {
      const result = await uploadCmsImage(file);
      setCategoryDraft((current) => ({ ...current, imageUrl: result.url }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Category image upload failed.');
    } finally {
      setUploadingCategoryImage(false);
    }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    setSavingCategory(true);
    setError('');
    setNotice('');
    try {
      const slug = categoryDraft.slug.trim();
      if (!slug) throw new Error('Enter a category name that can be used to create a URL slug.');
      const payload = {
        name: categoryDraft.name.trim(),
        slug,
        description: categoryDraft.description.trim() || null,
        imageUrl: categoryDraft.imageUrl || null,
        status: categoryDraft.status,
        sortOrder: Number(categoryDraft.sortOrder),
        categoryType: 'OFFER' as const,
      };
      const saved = await request((token) => editingCategoryId
        ? adminService.updateCategory(token, editingCategoryId, payload)
        : adminService.createCategory(token, payload));
      if (!editingCategoryId) setDraft((current) => ({ ...current, category: saved.slug }));
      setDrawer(null);
      setCategoryDraft(emptyCategoryDraft());
      setEditingCategoryId(null);
      setNotice('Offer category saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save offer category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategoryDraft());
    setError('');
    setDrawer('category');
  };

  const editCategory = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      status: category.status,
      sortOrder: String(category.sortOrder),
    });
    setError('');
    setDrawer('category');
  };

  const toggleCategoryStatus = async (category: AdminCategory) => {
    try {
      await request((token) => adminService.updateCategory(token, category.id, {
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        sortOrder: category.sortOrder,
        categoryType: 'OFFER',
      }));
      setNotice(`Category ${category.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change category status.');
    }
  };

  const deleteCategory = async (category: AdminCategory) => {
    if (!window.confirm(`Delete "${category.name}"? Categories linked to offers cannot be deleted.`)) return;
    try {
      await request((token) => adminService.deleteCategory(token, category.id));
      setNotice('Offer category deleted.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete offer category.');
    }
  };

  const saveOffer = async (publicationStatus: OfferRequest['publicationStatus']) => {
    const discountValue = Number(draft.discountValue);
    const minimum = draft.minSubtotal === '' ? null : Number(draft.minSubtotal);
    const maximum = draft.maxDiscount === '' ? null : Number(draft.maxDiscount);
    const usageLimit = draft.usageLimit === '' ? null : Number(draft.usageLimit);
    const perUserLimit = draft.perUserLimit === '' ? null : Number(draft.perUserLimit);
    const displayOrder = Number(draft.displayOrder);
    const starts = new Date(draft.startsAt);
    const ends = draft.endsAt ? new Date(draft.endsAt) : null;
    if (!draft.title.trim() || !draft.description.trim() || !draft.imageUrl || !draft.category) {
      setError('Complete the title, description, image, and category before saving.');
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0 || (draft.discountType === 'PERCENT' && discountValue > 100)) {
      setError(draft.discountType === 'PERCENT' ? 'Percentage discount must be greater than 0 and no more than 100.' : 'Discount value must be greater than 0.');
      return;
    }
    if (Number.isNaN(starts.getTime()) || (ends && (Number.isNaN(ends.getTime()) || ends <= starts))) {
      setError('The expiry date must be later than the start date.');
      return;
    }
    if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) {
      setError('Minimum purchase must be zero or greater.');
      return;
    }
    if (maximum !== null && (!Number.isFinite(maximum) || maximum <= 0 || (minimum !== null && maximum > minimum))) {
      setError('Maximum discount must be greater than zero and cannot exceed the minimum purchase amount.');
      return;
    }
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)
      || perUserLimit !== null && (!Number.isInteger(perUserLimit) || perUserLimit < 1)) {
      setError('Usage limits must be whole numbers greater than zero.');
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError('Display order must be a whole number greater than or equal to zero.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = toOfferRequest(draft, publicationStatus);
      await request((token) => editingId
        ? adminService.updateOffer(token, editingId, payload)
        : adminService.createOffer(token, payload));
      setDrawer(null);
      setDraft(emptyDraft(offerCategories.find((category) => category.status === 'ACTIVE')?.slug ?? ''));
      setEditingId(null);
      setNotice(publicationStatus === 'PUBLISHED' ? 'Offer published.' : 'Offer saved as a draft.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save offer.');
    } finally {
      setSaving(false);
    }
  };

  const editOffer = (offer: Offer) => {
    setEditingId(offer.id);
    setDraft(draftFromOffer(offer));
    setError('');
    setNotice('');
    setDrawer('offer');
  };

  const openNewOffer = () => {
    setEditingId(null);
    setDraft(emptyDraft(offerCategories.find((category) => category.status === 'ACTIVE')?.slug ?? ''));
    setError('');
    setDrawer('offer');
  };

  const updateOffer = async (offer: Offer, changes: Partial<OfferRequest>) => {
    try {
      await request((token) => adminService.updateOffer(token, offer.id, { ...offerRequest(offer), ...changes }));
      setNotice('Offer updated.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update offer.');
    }
  };

  const removeOffer = async (offer: Offer) => {
    if (!window.confirm(`Deactivate and unpublish "${offer.title}"? This keeps the record but removes it from customer-facing offers.`)) return;
    try {
      await request((token) => adminService.deleteOffer(token, offer.id));
      setSelectedIds((ids) => ids.filter((id) => id !== offer.id));
      setNotice('Offer deactivated and unpublished.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to deactivate offer.');
    }
  };

  const now = Date.now();
  const counts = useMemo(() => offers.reduce((result, offer) => {
    result.total += 1;
    result[offerState(offer, now).toLowerCase() as 'active' | 'inactive' | 'scheduled' | 'expired'] += 1;
    return result;
  }, { total: 0, active: 0, inactive: 0, scheduled: 0, expired: 0 }), [offers, now]);

  const tabOffers = useMemo(() => offers.filter((offer) => {
    if (tab === 'membership') return offer.customerEligibility === 'MEMBERSHIP_MEMBERS';
    if (tab === 'coupons') return Boolean(offer.couponCode);
    return true;
  }), [offers, tab]);

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tabOffers.filter((offer) => {
      const matchesQuery = !normalizedQuery
        || offer.title.toLowerCase().includes(normalizedQuery)
        || (offer.couponCode ?? '').toLowerCase().includes(normalizedQuery);
      const matchesCategory = !filterCategory || offer.category === filterCategory;
      const matchesStatus = !filterStatus || offerState(offer, now) === filterStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    }).sort((first, second) => {
      const left = sortKey === 'status' ? offerState(first, now) : first[sortKey];
      const right = sortKey === 'status' ? offerState(second, now) : second[sortKey];
      const compare = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return compare * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [filterCategory, filterStatus, now, query, sortDirection, sortKey, tabOffers]);

  const pageCount = Math.max(1, Math.ceil(filteredOffers.length / pageSize));
  const pageOffers = filteredOffers.slice((page - 1) * pageSize, page * pageSize);
  const visibleIds = pageOffers.map((offer) => offer.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  useEffect(() => { setPage(1); setSelectedIds([]); }, [filterCategory, filterStatus, pageSize, query, tab]);

  const toggleSelection = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const togglePageSelection = () => setSelectedIds((ids) => allVisibleSelected
    ? ids.filter((id) => !visibleIds.includes(id))
    : Array.from(new Set([...ids, ...visibleIds])));

  const bulkUpdate = async (changes: Partial<OfferRequest>, label: string) => {
    const chosen = offers.filter((offer) => selectedIds.includes(offer.id));
    if (!chosen.length) return;
    setError('');
    const results = await Promise.allSettled(chosen.map((offer) => request((token) => adminService.updateOffer(token, offer.id, { ...offerRequest(offer), ...changes }))));
    const failures = results.filter((result) => result.status === 'rejected').length;
    setSelectedIds([]);
    await load();
    if (failures) setError(`${chosen.length - failures} offer(s) ${label}; ${failures} could not be updated. Refresh and retry the failed offers.`);
    else setNotice(`${chosen.length} offer(s) ${label}.`);
  };

  const bulkDeactivate = async () => {
    const chosen = offers.filter((offer) => selectedIds.includes(offer.id));
    if (!chosen.length || !window.confirm(`Deactivate and unpublish ${chosen.length} selected offer(s)?`)) return;
    setError('');
    const results = await Promise.allSettled(chosen.map((offer) => request((token) => adminService.deleteOffer(token, offer.id))));
    const failures = results.filter((result) => result.status === 'rejected').length;
    setSelectedIds([]);
    await load();
    if (failures) setError(`${chosen.length - failures} offer(s) deactivated; ${failures} could not be deactivated.`);
    else setNotice(`${chosen.length} offer(s) deactivated and unpublished.`);
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortButton = (label: string, key: SortKey) => <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:text-emerald-800" onClick={() => changeSort(key)}>
    {label}{sortKey === key ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
  </button>;

  const discountText = (offer: Offer) => offer.discountType === 'PERCENT' ? `${offer.discountValue}%` : formatINR(offer.discountValue);
  const offerStateFor = (offer: Offer) => offerState(offer, now);

  const tabs: { id: DashboardTab; label: string; icon: typeof Tag }[] = [
    { id: 'offers', label: 'All Offers', icon: Tag },
    { id: 'categories', label: 'Offer Categories', icon: ImagePlus },
    { id: 'membership', label: 'Membership Offers', icon: Check },
    { id: 'coupons', label: 'Coupons', icon: CalendarClock },
  ];

  const stats: { label: string; value: number; color: string; status?: string }[] = [
    { label: 'Total Offers', value: counts.total, color: 'text-slate-900' },
    { label: 'Active Offers', value: counts.active, color: 'text-emerald-800', status: 'ACTIVE' },
    { label: 'Inactive Offers', value: counts.inactive, color: 'text-amber-800', status: 'INACTIVE' },
    { label: 'Scheduled Offers', value: counts.scheduled, color: 'text-blue-700', status: 'SCHEDULED' },
    { label: 'Expired Offers', value: counts.expired, color: 'text-slate-500', status: 'EXPIRED' },
  ];

  return <DashboardShell>
    <div className="mx-auto max-w-[1600px] pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="Sales and promotions" title="Offers Management" description="Manage promotions, coupon campaigns, and offer categories." />
        <Button type="button" className="!rounded-lg !px-4 !py-2.5 !shadow-none" onClick={tab === 'categories' ? openNewCategory : openNewOffer}>
          <Plus className="mr-2 h-4 w-4" />{tab === 'categories' ? 'New category' : 'Create offer'}
        </Button>
      </div>

      {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      {notice ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Offer summary">
        {stats.map((stat) => <Link key={stat.label} to={`/admin/offers${stat.status ? `?section=offers&status=${stat.status}` : ''}`} className="group rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          <p className="text-xs font-medium text-slate-500">{stat.label}</p><p className={`mt-2 text-2xl font-semibold ${stat.color}`}>{loading ? '—' : stat.value}</p><span className="mt-1 block text-[10px] font-medium text-emerald-800 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View details →</span>
        </Link>)}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-2" aria-label="Offer management sections">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setSelectedIds([]); const next = new URLSearchParams(searchParams); next.set('section', id); setSearchParams(next); }} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${tab === id ? 'border-emerald-800 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>)}
        </nav>

        {tab === 'categories' ? <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div><h2 className="font-semibold text-slate-900">Offer categories</h2><p className="mt-1 text-xs text-slate-500">Categories organize offers on customer-facing pages.</p></div>
            <Button type="button" variant="secondary" className="!rounded-lg !px-3 !py-2 !shadow-none" onClick={openNewCategory}><Plus className="mr-1.5 h-4 w-4" />Add category</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-4 py-3 font-semibold">Image</th><th className="px-4 py-3 font-semibold">Category name</th><th className="px-4 py-3 font-semibold">Slug</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Order</th><th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {offerCategories.map((category) => <tr key={category.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">{category.imageUrl ? <img src={category.imageUrl} alt="" className="h-10 w-14 rounded-md object-cover" /> : <div className="grid h-10 w-14 place-items-center rounded-md bg-slate-100 text-slate-400"><ImagePlus className="h-4 w-4" /></div>}</td>
                  <td className="max-w-48 truncate px-4 py-3 font-medium text-slate-800">{category.name}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{category.slug}</td><td className="max-w-64 truncate px-4 py-3 text-slate-500">{category.description || '—'}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => void toggleCategoryStatus(category)} aria-label={`${category.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${category.name}`}><StatusPill status={category.status} /></button></td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{category.sortOrder}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <button type="button" onClick={() => editCategory(category)} aria-label={`Edit ${category.name}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void deleteCategory(category)} aria-label={`Delete ${category.name}`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>)}
                {!offerCategories.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No offer categories are available.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div> : <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div><h2 className="font-semibold text-slate-900">{tab === 'membership' ? 'Membership offers' : tab === 'coupons' ? 'Coupon offers' : 'All offers'}</h2><p className="mt-1 text-xs text-slate-500">{filteredOffers.length} {filteredOffers.length === 1 ? 'offer' : 'offers'} · Changes apply to the existing coupon system</p></div>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
          <div className="grid gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_200px_180px] sm:px-6">
            <label className="relative block"><span className="sr-only">Search title or coupon code</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); updateOfferFilters({ q: event.target.value }); }} placeholder="Search title or coupon code" className={`${fieldClass} mt-0 pl-9`} /></label>
            <select aria-label="Filter by offer category" value={filterCategory} onChange={(event) => { setFilterCategory(event.target.value); updateOfferFilters({ category: event.target.value }); }} className={`${fieldClass} mt-0`}><option value="">All categories</option>{offerCategories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
            <select aria-label="Filter by offer status" value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); updateOfferFilters({ status: event.target.value }); }} className={`${fieldClass} mt-0`}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SCHEDULED">Scheduled</option><option value="EXPIRED">Expired</option></select>
          </div>
          {selectedIds.length > 0 ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-emerald-50/70 px-4 py-3 sm:px-6">
            <span className="mr-2 text-sm font-medium text-slate-700">{selectedIds.length} selected</span>
            <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => void bulkUpdate({ active: true }, 'activated')}>Activate</button>
            <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => void bulkUpdate({ active: false }, 'deactivated')}>Deactivate</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => void bulkDeactivate()}><Trash2 className="h-3.5 w-3.5" />Delete</button>
          </div> : null}

          {loading ? <p className="px-6 py-12 text-center text-sm text-slate-500">Loading offers…</p> : filteredOffers.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-500">No offers match these filters.</p> : <>
            <div className="hidden overflow-auto md:block">
              <table className="w-full min-w-[1580px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_#e2e8f0]"><tr>
                  <th className="sticky left-0 z-20 w-10 bg-slate-50 px-3 py-3"><input type="checkbox" aria-label="Select visible offers" checked={allVisibleSelected} onChange={togglePageSelection} /></th>
                  <th className="w-20 px-3 py-3 font-semibold">Image</th><th className="min-w-52 px-3 py-3">{sortButton('Offer title', 'title')}</th><th className="min-w-32 px-3 py-3">{sortButton('Category', 'category')}</th><th className="min-w-32 px-3 py-3">{sortButton('Coupon code', 'couponCode')}</th><th className="px-3 py-3">{sortButton('Discount type', 'discountType')}</th><th className="px-3 py-3">{sortButton('Value', 'discountValue')}</th><th className="px-3 py-3">{sortButton('Min. purchase', 'minSubtotal')}</th><th className="px-3 py-3">{sortButton('Max discount', 'maxDiscount')}</th><th className="px-3 py-3">{sortButton('Start date', 'startsAt')}</th><th className="px-3 py-3">{sortButton('End date', 'endsAt')}</th><th className="px-3 py-3">{sortButton('Status', 'status')}</th><th className="px-3 py-3">{sortButton('Order', 'displayOrder')}</th><th className="sticky right-0 z-20 bg-slate-50 px-3 py-3 text-right font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pageOffers.map((offer) => <tr key={offer.id} className="hover:bg-slate-50/70">
                    <td className="sticky left-0 bg-white px-3 py-2.5"><input type="checkbox" aria-label={`Select ${offer.title}`} checked={selectedIds.includes(offer.id)} onChange={() => toggleSelection(offer.id)} /></td>
                    <td className="px-3 py-2.5">{offer.imageUrl ? <img src={offer.imageUrl} alt="" className="h-9 w-12 rounded object-cover" /> : <div className="grid h-9 w-12 place-items-center rounded bg-slate-100 text-slate-400"><ImagePlus className="h-4 w-4" /></div>}</td>
                    <td className="max-w-56 px-3 py-2.5"><p className="truncate font-medium text-slate-800" title={offer.title}>{offer.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{offer.customerEligibility.replaceAll('_', ' ').toLowerCase()}</p></td>
                    <td className="px-3 py-2.5">{offerCategories.find((category) => category.slug === offer.category)?.name ?? offer.category}</td><td className="px-3 py-2.5 font-mono">{offer.couponCode || '—'}</td><td className="px-3 py-2.5">{offer.discountType === 'PERCENT' ? 'Percentage' : 'Fixed'}</td><td className="px-3 py-2.5 font-semibold">{discountText(offer)}</td><td className="px-3 py-2.5">{offer.minSubtotal == null ? '—' : formatINR(offer.minSubtotal)}</td><td className="px-3 py-2.5">{offer.maxDiscount == null ? '—' : formatINR(offer.maxDiscount)}</td><td className="whitespace-nowrap px-3 py-2.5">{dateLabel(offer.startsAt)}</td><td className="whitespace-nowrap px-3 py-2.5">{dateLabel(offer.endsAt)}</td>
                    <td className="px-3 py-2.5"><button type="button" onClick={() => void updateOffer(offer, { active: !offer.active })} aria-label={`${offer.active ? 'Deactivate' : 'Activate'} ${offer.title}`}><StatusPill status={offerStateFor(offer)} /></button></td><td className="px-3 py-2.5 tabular-nums">{offer.displayOrder}</td>
                    <td className="sticky right-0 bg-white px-3 py-2.5"><div className="flex justify-end gap-1">
                      <button type="button" aria-label={`Edit ${offer.title}`} onClick={() => editOffer(offer)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Deactivate and unpublish ${offer.title}`} onClick={() => void removeOffer(offer)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {pageOffers.map((offer) => <article key={offer.id} className="flex gap-3 px-4 py-4">
                <input type="checkbox" aria-label={`Select ${offer.title}`} checked={selectedIds.includes(offer.id)} onChange={() => toggleSelection(offer.id)} className="mt-1" />
                {offer.imageUrl ? <img src={offer.imageUrl} alt="" className="h-14 w-16 shrink-0 rounded-md object-cover" /> : <div className="grid h-14 w-16 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><ImagePlus className="h-4 w-4" /></div>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-900">{offer.title}</p><StatusPill status={offerStateFor(offer)} /></div>
                  <p className="mt-1 text-xs text-slate-500">{offerCategories.find((category) => category.slug === offer.category)?.name ?? offer.category} · {discountText(offer)}{offer.couponCode ? ` · ${offer.couponCode}` : ''}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{dateLabel(offer.startsAt)} – {dateLabel(offer.endsAt)}</p>
                  <div className="mt-2 flex gap-1">
                    <button type="button" onClick={() => editOffer(offer)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"><Pencil className="h-3 w-3" />Edit</button>
                    <button type="button" onClick={() => void updateOffer(offer, { active: !offer.active })} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">{offer.active ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" aria-label={`Deactivate and unpublish ${offer.title}`} onClick={() => void removeOffer(offer)} className="rounded-md border border-slate-200 px-2 py-1 text-slate-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </article>)}
            </div>
          </>}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
            <p>Showing {filteredOffers.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredOffers.length)} of {filteredOffers.length}</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">Rows <select aria-label="Rows per page" className="rounded-md border border-slate-200 bg-white px-2 py-1" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span>{page} / {pageCount}</span>
              <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        </div>}
      </section>
    </div>

    {drawer === 'offer' ? <Drawer title={editingId ? 'Edit offer' : 'Create offer'} onClose={() => setDrawer(null)} footer={<div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Coupon rules are revalidated at checkout.</p>
      <div className="flex gap-2"><Button type="button" variant="secondary" className="!rounded-lg !px-4 !py-2.5 !shadow-none" disabled={saving || uploading} onClick={() => void saveOffer('DRAFT')}>Save draft</Button><Button type="button" className="!rounded-lg !px-4 !py-2.5 !shadow-none" disabled={saving || uploading} onClick={() => void saveOffer('PUBLISHED')}>{saving ? 'Saving…' : editingId ? 'Save & publish' : 'Publish offer'}</Button></div>
    </div>}>
      {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}
      <form onSubmit={(event) => { event.preventDefault(); void saveOffer(draft.publicationStatus); }}>
        <FormSection title="Basic Information">
          <label className="text-xs font-medium text-slate-600">Offer title<input required maxLength={180} className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Subtitle<input maxLength={500} className={fieldClass} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">Description<textarea required maxLength={5000} className={`${fieldClass} min-h-20`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Offer category<select required className={fieldClass} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="">Choose category</option>{offerCategories.map((category) => <option key={category.id} value={category.slug} disabled={category.status !== 'ACTIVE'}>{category.name}{category.status !== 'ACTIVE' ? ' (inactive)' : ''}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Coupon code <span className="font-normal text-slate-400">optional</span><input maxLength={64} className={fieldClass} value={draft.couponCode} onChange={(event) => setDraft({ ...draft, couponCode: event.target.value.toUpperCase() })} /></label>
        </FormSection>
        <FormSection title="Discount Settings">
          <label className="text-xs font-medium text-slate-600">Discount type<select className={fieldClass} value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value as OfferDraft['discountType'] })}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
          <label className="text-xs font-medium text-slate-600">Discount value<input required type="number" min="0.01" max={draft.discountType === 'PERCENT' ? 100 : undefined} step="0.01" className={fieldClass} value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Minimum purchase<input type="number" min="0" step="0.01" className={fieldClass} value={draft.minSubtotal} onChange={(event) => setDraft({ ...draft, minSubtotal: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Maximum discount<input type="number" min="0.01" step="0.01" className={fieldClass} value={draft.maxDiscount} onChange={(event) => setDraft({ ...draft, maxDiscount: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Customer eligibility<select className={fieldClass} value={draft.customerEligibility} onChange={(event) => setDraft({ ...draft, customerEligibility: event.target.value as OfferDraft['customerEligibility'] })}><option value="ALL">All customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="MEMBERSHIP_MEMBERS">Membership members</option></select></label>
          <label className="text-xs font-medium text-slate-600">Display order<input type="number" min="0" step="1" className={fieldClass} value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Total usage limit<input type="number" min="1" step="1" className={fieldClass} value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">Per-customer usage limit<input type="number" min="1" step="1" className={fieldClass} value={draft.perUserLimit} onChange={(event) => setDraft({ ...draft, perUserLimit: event.target.value })} /></label>
        </FormSection>
        <FormSection title="Validity">
          <label className="text-xs font-medium text-slate-600">Start date and time<input required type="datetime-local" className={fieldClass} value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-600">End date and time <span className="font-normal text-slate-400">optional</span><input type="datetime-local" className={fieldClass} value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:col-span-2"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} className="h-4 w-4 accent-emerald-800" />Offer is active</label>
        </FormSection>
        <FormSection title="Image and Publication">
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">Offer image<input type="file" accept="image/jpeg,image/png,image/webp" className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs`} onChange={(event) => void uploadImage(event.target.files?.[0])} />{uploading ? <span className="mt-1 block text-xs text-slate-500">Uploading image…</span> : null}</label>
          {draft.imageUrl ? <div className="relative sm:col-span-2"><img src={resolveCmsMediaUrl(draft.imageUrl) ?? draft.imageUrl} alt="Offer preview" className="h-40 w-full rounded-lg object-cover" /><button type="button" aria-label="Remove offer image" onClick={() => setDraft({ ...draft, imageUrl: '' })} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow"><X className="h-4 w-4" /></button></div> : <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-5 text-xs text-slate-400 sm:col-span-2"><ImagePlus className="h-5 w-5" />Upload a JPEG, PNG, or WebP image (max 10 MB)</div>}
          <label className="text-xs font-medium text-slate-600">Applicable products<select multiple className={`${fieldClass} min-h-28`} value={draft.applicableProductIds} onChange={(event) => setDraft({ ...draft, applicableProductIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select><span className="mt-1 block font-normal text-slate-400">Leave both product lists empty to apply to the entire cart.</span></label>
          <label className="text-xs font-medium text-slate-600">Applicable product categories<select multiple className={`${fieldClass} min-h-28`} value={draft.applicableCategoryIds} onChange={(event) => setDraft({ ...draft, applicableCategoryIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </FormSection>
      </form>
    </Drawer> : null}

    {drawer === 'category' ? <Drawer title={editingCategoryId ? 'Edit offer category' : 'Create offer category'} onClose={() => setDrawer(null)} footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" className="!rounded-lg !px-4 !py-2.5 !shadow-none" onClick={() => setDrawer(null)}>Cancel</Button><Button type="submit" form="offer-category-form" className="!rounded-lg !px-4 !py-2.5 !shadow-none" disabled={savingCategory || uploadingCategoryImage}>{savingCategory ? 'Saving…' : 'Save category'}</Button></div>}>
      {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}
      <form id="offer-category-form" onSubmit={(event) => void saveCategory(event)} className="space-y-4">
        <label className="block text-xs font-medium text-slate-600">Category name<input required maxLength={120} className={fieldClass} value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value, slug: editingCategoryId ? current.slug : slugFromName(event.target.value) }))} /></label>
        <label className="block text-xs font-medium text-slate-600">Slug<input required maxLength={140} className={fieldClass} value={categoryDraft.slug} onChange={(event) => setCategoryDraft({ ...categoryDraft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /><span className="mt-1 block font-normal text-slate-400">Used in offer URLs and category matching.</span></label>
        <label className="block text-xs font-medium text-slate-600">Description<textarea maxLength={2000} className={`${fieldClass} min-h-24`} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} /></label>
        <label className="block text-xs font-medium text-slate-600">Category image<input type="file" accept="image/jpeg,image/png,image/webp" className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs`} onChange={(event) => void uploadCategoryImage(event.target.files?.[0])} />{uploadingCategoryImage ? <span className="mt-1 block text-xs text-slate-500">Uploading image…</span> : null}</label>
        {categoryDraft.imageUrl ? <img src={resolveCmsMediaUrl(categoryDraft.imageUrl) ?? categoryDraft.imageUrl} alt="Category preview" className="h-40 w-full rounded-lg object-cover" /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">Status<select className={fieldClass} value={categoryDraft.status} onChange={(event) => setCategoryDraft({ ...categoryDraft, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
          <label className="text-xs font-medium text-slate-600">Display order<input type="number" min="0" step="1" className={fieldClass} value={categoryDraft.sortOrder} onChange={(event) => setCategoryDraft({ ...categoryDraft, sortOrder: event.target.value })} /></label>
        </div>
      </form>
    </Drawer> : null}
  </DashboardShell>;
}
