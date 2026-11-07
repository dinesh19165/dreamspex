import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Pencil, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import { adminProductService, type AdminCategory, type AdminProduct } from '../services/adminProductService';
import { AdminApiError, adminService } from '../services/adminService';
import type { Offer, OfferRequest } from '../services/offerService';
import { resolveCmsMediaUrl } from '../config/api';
import { formatINR } from '../utils/currency';
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

function slugFromName(value: string) {
  const slug = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `offer-${slug}` : '';
}

const fieldClass = 'mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';
const imageFileIsValid = (file: File) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10_000_000;

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

function toOfferRequest(draft: OfferDraft): OfferRequest {
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
    publicationStatus: draft.publicationStatus,
    applicableProductIds: draft.applicableProductIds,
    applicableCategoryIds: draft.applicableCategoryIds,
  };
}

export default function AdminOffersPage() {
  const { user, refreshAccessToken } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [offerCategories, setOfferCategories] = useState<AdminCategory[]>([]);
  const [productCategories, setProductCategories] = useState<AdminCategory[]>([]);
  const [draft, setDraft] = useState<OfferDraft>(() => emptyDraft());
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPublication, setFilterPublication] = useState('');
  const [filterActive, setFilterActive] = useState('');
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
        request((token) => adminService.offers(token, {
          q: query,
          category: filterCategory,
          publicationStatus: filterPublication,
          active: filterActive,
        })),
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
  }, [filterActive, filterCategory, filterPublication, query, request, user]);

  useEffect(() => { void load(); }, [load]);

  const uploadCmsImage = async (file: File) => {
    if (!imageFileIsValid(file)) {
      throw new Error('Use a JPEG, PNG, or WebP image up to 10 MB.');
    }
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

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingCategory(true);
    setError('');
    setNotice('');
    try {
      const slug = editingCategoryId
        ? categoryDraft.slug
        : slugFromName(categoryDraft.slug || categoryDraft.name);
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

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = toOfferRequest(draft);
      await request((token) => editingId
        ? adminService.updateOffer(token, editingId, payload)
        : adminService.createOffer(token, payload));
      setDraft(emptyDraft(offerCategories.find((category) => category.status === 'ACTIVE')?.slug ?? ''));
      setEditingId(null);
      setNotice('Offer saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save offer.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (offer: Offer) => {
    setEditingId(offer.id);
    setDraft(draftFromOffer(offer));
    setError('');
    setNotice('');
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

  const remove = async (offer: Offer) => {
    if (!window.confirm(`Deactivate and unpublish "${offer.title}"?`)) return;
    try {
      await request((token) => adminService.deleteOffer(token, offer.id));
      setNotice('Offer deactivated.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to deactivate offer.');
    }
  };

  const discountLabel = draft.discountType === 'PERCENT'
    ? `${draft.discountValue || '0'}% OFF`
    : `${formatINR(Number(draft.discountValue || 0))} OFF`;

  return <DashboardShell>
    <SectionTitle eyebrow="Sales and promotions" title="Offers Management" description="Create and publish offers using the existing coupon system. Coupon values are validated again by the backend at checkout." />
    {error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200" role="alert">{error}</p> : null}
    {notice ? <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200" role="status">{notice}</p> : null}

    <section className="mt-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Offer Categories</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage categories used to organize customer-facing offers.</p>
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="space-y-3">
          {offerCategories.map((category) => <article key={category.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 sm:flex-nowrap">
            {category.imageUrl ? <img src={category.imageUrl} alt="" className="h-14 w-20 rounded-lg object-cover" /> : <div className="grid h-14 w-20 place-items-center rounded-lg bg-[var(--bg-secondary)]"><ImagePlus className="h-5 w-5" /></div>}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{category.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{category.description || category.slug}</p><p className="mt-1 text-xs">{category.status}</p></div>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" aria-label={`Edit ${category.name}`} onClick={() => editCategory(category)}><Pencil className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" onClick={() => void toggleCategoryStatus(category)}>{category.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
              <Button type="button" variant="ghost" aria-label={`Delete ${category.name}`} onClick={() => void deleteCategory(category)}><Trash2 className="h-4 w-4 text-red-300" /></Button>
            </div>
          </article>)}
          {!offerCategories.length ? <p className="rounded-xl bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)]">No offer categories are available.</p> : null}
        </div>
        <form onSubmit={saveCategory} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{editingCategoryId ? 'Edit category' : 'Create category'}</h3><Button type="button" variant="ghost" onClick={() => { setEditingCategoryId(null); setCategoryDraft(emptyCategoryDraft()); }}><Plus className="mr-2 h-4 w-4" />New</Button></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Name<input required maxLength={120} className={fieldClass} value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value, slug: editingCategoryId ? current.slug : slugFromName(event.target.value) }))} /></label>
            <label className="text-sm sm:col-span-2">Category image<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadCategoryImage(event.target.files?.[0])} />{uploadingCategoryImage ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">Uploading...</span> : null}</label>
            {categoryDraft.imageUrl ? <img src={resolveCmsMediaUrl(categoryDraft.imageUrl) ?? categoryDraft.imageUrl} alt="Category preview" className="h-24 w-full rounded-xl object-cover sm:col-span-2" /> : null}
            <label className="text-sm sm:col-span-2">Description<textarea maxLength={2000} className={`${fieldClass} min-h-20`} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} /></label>
            <label className="text-sm">Status<select className={fieldClass} value={categoryDraft.status} onChange={(event) => setCategoryDraft({ ...categoryDraft, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label className="text-sm">Display order<input type="number" min="0" step="1" className={fieldClass} value={categoryDraft.sortOrder} onChange={(event) => setCategoryDraft({ ...categoryDraft, sortOrder: event.target.value })} /></label>
          </div>
          <Button type="submit" className="mt-4" disabled={savingCategory || uploadingCategoryImage || !categoryDraft.name.trim()}><Save className="mr-2 h-4 w-4" />{savingCategory ? 'Saving...' : editingCategoryId ? 'Save category' : 'Create category'}</Button>
        </form>
      </div>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,.7fr)]">
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Offers</h2>
          <Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="relative block"><span className="sr-only">Search offers</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or coupon code" className={`${fieldClass} pl-9`} /></label>
          <select aria-label="Filter by offer category" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className={fieldClass}><option value="">All categories</option>{offerCategories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
          <select aria-label="Filter by publication status" value={filterPublication} onChange={(event) => setFilterPublication(event.target.value)} className={fieldClass}><option value="">All publication states</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select>
          <select aria-label="Filter by active status" value={filterActive} onChange={(event) => setFilterActive(event.target.value)} className={fieldClass}><option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option></select>
        </div>
        {loading ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading offers...</p> : offers.length === 0 ? <p className="mt-6 rounded-xl bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)]">No offers match these filters.</p> : <div className="mt-5 space-y-3">
          {offers.map((offer) => <article key={offer.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 sm:flex-nowrap">
            {offer.imageUrl ? <img src={offer.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover" /> : <div className="grid h-16 w-24 place-items-center rounded-lg bg-[var(--bg-secondary)]"><ImagePlus className="h-5 w-5" /></div>}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{offer.title}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{offerCategories.find((category) => category.slug === offer.category)?.name ?? offer.category} · {offer.couponCode || 'No coupon code'} · order {offer.displayOrder}</p><p className="mt-1 text-xs">{offer.active ? 'Active' : 'Inactive'} · {offer.publicationStatus}</p></div>
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="ghost" aria-label={`Edit ${offer.title}`} onClick={() => edit(offer)}><Pencil className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" onClick={() => void updateOffer(offer, { active: !offer.active })}>{offer.active ? 'Deactivate' : 'Activate'}</Button>
              <Button type="button" variant="ghost" onClick={() => void updateOffer(offer, { publicationStatus: offer.publicationStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}>{offer.publicationStatus === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
              <Button type="button" variant="ghost" aria-label={`Deactivate and unpublish ${offer.title}`} onClick={() => void remove(offer)}><Trash2 className="h-4 w-4 text-red-300" /></Button>
            </div>
          </article>)}
        </div>}
      </section>

      <form onSubmit={save} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? 'Edit offer' : 'Create offer'}</h2><Button type="button" variant="ghost" onClick={() => { setEditingId(null); setDraft(emptyDraft(offerCategories.find((category) => category.status === 'ACTIVE')?.slug ?? '')); }}><Plus className="mr-2 h-4 w-4" />New</Button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Title<input required maxLength={180} className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="text-sm">Subtitle<input maxLength={500} className={fieldClass} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
          <label className="text-sm">Offer category<select required className={fieldClass} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="" disabled>Select a category</option>{offerCategories.filter((category) => category.status === 'ACTIVE' || category.slug === draft.category).map((category) => <option key={category.id} value={category.slug}>{category.name}{category.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select>{offerCategories.filter((category) => category.status === 'ACTIVE').length === 0 ? <span className="mt-1 block text-xs text-amber-300">Create or activate an offer category before creating an offer.</span> : null}</label>
          <label className="text-sm">Coupon code (optional)<input maxLength={64} className={fieldClass} value={draft.couponCode} onChange={(event) => setDraft({ ...draft, couponCode: event.target.value.toUpperCase() })} /></label>
          <label className="text-sm sm:col-span-2">Description<textarea required maxLength={5000} className={`${fieldClass} min-h-24`} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="text-sm">Offer image/banner (JPEG, PNG, WebP)<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} />{uploading ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">Uploading...</span> : null}</label>
          <div className="flex items-end">{draft.imageUrl ? <img src={resolveCmsMediaUrl(draft.imageUrl) ?? draft.imageUrl} alt="Offer banner preview" className="h-24 w-full rounded-xl object-cover" /> : <p className="w-full rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-secondary)]">Upload an image to preview.</p>}</div>
          <label className="text-sm">Discount type<select className={fieldClass} value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value as OfferDraft['discountType'] })}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
          <label className="text-sm">Discount value<input required type="number" min="0.01" max={draft.discountType === 'PERCENT' ? 100 : undefined} step="0.01" className={fieldClass} value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })} /></label>
          <label className="text-sm">Minimum purchase amount<input type="number" min="0" step="0.01" className={fieldClass} value={draft.minSubtotal} onChange={(event) => setDraft({ ...draft, minSubtotal: event.target.value })} /></label>
          <label className="text-sm">Maximum discount amount<input type="number" min="0.01" step="0.01" className={fieldClass} value={draft.maxDiscount} onChange={(event) => setDraft({ ...draft, maxDiscount: event.target.value })} /></label>
          <label className="text-sm">Starts at<input required type="datetime-local" className={fieldClass} value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
          <label className="text-sm">Expires at<input type="datetime-local" className={fieldClass} value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label>
          <label className="text-sm">Total usage limit<input type="number" min="1" step="1" className={fieldClass} value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} /></label>
          <label className="text-sm">Per-customer usage limit<input type="number" min="1" step="1" className={fieldClass} value={draft.perUserLimit} onChange={(event) => setDraft({ ...draft, perUserLimit: event.target.value })} /></label>
          <label className="text-sm">Customer eligibility<select className={fieldClass} value={draft.customerEligibility} onChange={(event) => setDraft({ ...draft, customerEligibility: event.target.value as OfferDraft['customerEligibility'] })}><option value="ALL">All customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="MEMBERSHIP_MEMBERS">Active members</option></select></label>
          <label className="text-sm">Display order<input type="number" min="0" step="1" className={fieldClass} value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: event.target.value })} /></label>
          <label className="text-sm">Publication status<select className={fieldClass} value={draft.publicationStatus} onChange={(event) => setDraft({ ...draft, publicationStatus: event.target.value as OfferDraft['publicationStatus'] })}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
          <label className="flex items-center gap-2 self-end rounded-xl border border-[var(--border-subtle)] p-3 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Active</label>
          <label className="text-sm sm:col-span-2">Applicable products<select multiple className={`${fieldClass} min-h-28`} value={draft.applicableProductIds} onChange={(event) => setDraft({ ...draft, applicableProductIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select><span className="mt-1 block text-xs text-[var(--text-secondary)]">Leave products and categories empty to apply to the entire cart.</span></label>
          <label className="text-sm sm:col-span-2">Applicable product categories<select multiple className={`${fieldClass} min-h-24`} value={draft.applicableCategoryIds} onChange={(event) => setDraft({ ...draft, applicableCategoryIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </div>
        <aside className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]" aria-label="Offer preview">
          {draft.imageUrl ? <img src={resolveCmsMediaUrl(draft.imageUrl) ?? draft.imageUrl} alt="" className="h-36 w-full object-cover" /> : null}
          <div className="p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">{discountLabel}</p><h3 className="mt-2 text-lg font-semibold">{draft.title || 'Offer title preview'}</h3>{draft.subtitle ? <p className="mt-1 text-sm">{draft.subtitle}</p> : null}<p className="mt-2 line-clamp-3 text-sm text-[var(--text-secondary)]">{draft.description || 'Offer description preview'}</p></div>
        </aside>
        <Button type="submit" className="mt-4" disabled={saving || uploading || !draft.imageUrl || !draft.category}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create offer'}</Button>
      </form>
    </div>
  </DashboardShell>;
}
