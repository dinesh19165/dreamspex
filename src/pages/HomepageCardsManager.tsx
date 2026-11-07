import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import { adminService, type CmsCardDestinationType, type CmsCardSection, type CmsHomepageCard, type CmsHomepageCardRequest } from '../services/adminService';
import type { AdminCategory, AdminProduct } from '../services/adminProductService';
import { resolveCmsMediaUrl } from '../config/api';

const cardTabs: Array<{ key: CmsCardSection; label: string }> = [
  { key: 'CATEGORY_BANNER', label: 'Category Banner Cards' },
  { key: 'FRAME_SHAPE', label: 'Frame Shape Cards' },
  { key: 'TRENDING_PRODUCT', label: 'Trending Products' },
  { key: 'PROMOTIONAL', label: 'Promotional Cards' },
  { key: 'SHOP_BY_WEARER', label: 'Shop by Wearer' },
  { key: 'EXPLORE_BY_BRAND', label: 'Explore by Brand' },
];

const requiredDestination: Partial<Record<CmsCardSection, CmsCardDestinationType>> = {
  CATEGORY_BANNER: 'CATEGORY',
  FRAME_SHAPE: 'SHAPE',
  TRENDING_PRODUCT: 'PRODUCT',
  SHOP_BY_WEARER: 'GENDER',
  EXPLORE_BY_BRAND: 'BRAND',
};

const pageDestinations = [
  { value: '/', label: 'Homepage' },
  { value: '/shop', label: 'Shop all' },
  { value: '/categories', label: 'Categories' },
  { value: '/offers', label: 'Offers' },
  { value: '/virtual-try-on', label: 'Virtual Try-On' },
  { value: '/stores', label: 'Stores' },
];

const fieldClass = 'mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';

function emptyDraft(sectionKey: CmsCardSection): CmsHomepageCardRequest {
  return {
    sectionKey,
    title: '',
    subtitle: null,
    description: null,
    imageUrl: null,
    imageStorageKey: null,
    buttonText: null,
    destinationType: requiredDestination[sectionKey] ?? 'PAGE',
    destinationValue: '',
    displayOrder: 0,
    status: 'DRAFT',
    enabled: true,
  };
}

function primaryImage(product: AdminProduct) {
  return product.images.find((image) => image.primaryImage)?.imageUrl ?? product.images[0]?.imageUrl ?? null;
}

export default function HomepageCardsManager({ token, products, categories, sectionKey }: { token: string; products: AdminProduct[]; categories: AdminCategory[]; sectionKey: CmsCardSection }) {
  const [cards, setCards] = useState<CmsHomepageCard[]>([]);
  const [draft, setDraft] = useState<CmsHomepageCardRequest>(() => emptyDraft(sectionKey));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pageSize = 20;

  const publishedProducts = useMemo(() => products.filter((product) => product.status.toUpperCase() === 'PUBLISHED'), [products]);
  const activeCategories = useMemo(() => categories.filter((category) => category.status.toUpperCase() === 'ACTIVE'), [categories]);
  const brands = useMemo(() => [...new Set(publishedProducts.map((product) => product.brand).filter(Boolean))].sort(), [publishedProducts]);
  const genders = useMemo(() => [...new Set(publishedProducts.map((product) => product.gender).filter((value): value is string => Boolean(value)))].sort(), [publishedProducts]);
  const shapes = useMemo(() => [...new Set(publishedProducts.map((product) => product.frameShape).filter((value): value is string => Boolean(value)))].sort(), [publishedProducts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.cmsCards(token, sectionKey, page, pageSize);
      setCards(result.items);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load homepage cards.');
    } finally {
      setLoading(false);
    }
  }, [page, sectionKey, token]);

  useEffect(() => { void load(); }, [load]);

  const destinationOptions = useMemo(() => {
    const type = draft.destinationType;
    if (type === 'CATEGORY') return activeCategories.map((item) => ({ value: item.slug, label: item.name }));
    if (type === 'PRODUCT') return publishedProducts.map((item) => ({ value: item.id, label: `${item.name} (${item.sku})` }));
    if (type === 'BRAND') return brands.map((value) => ({ value, label: value }));
    if (type === 'GENDER') return genders.map((value) => ({ value, label: value }));
    if (type === 'SHAPE') return shapes.map((value) => ({ value, label: value }));
    return pageDestinations;
  }, [activeCategories, brands, draft.destinationType, genders, publishedProducts, shapes]);

  const imageOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Use catalogue image where available' },
      ...activeCategories.filter((item) => item.imageUrl).map((item) => ({ value: item.imageUrl as string, label: `Category: ${item.name}` })),
      ...publishedProducts.flatMap((item) => {
      const image = primaryImage(item);
      return image ? [{ value: image, label: `Product: ${item.name}` }] : [];
      }),
    ];
    if (draft.imageUrl && !options.some((option) => option.value === draft.imageUrl)) {
      options.push({ value: draft.imageUrl, label: 'Current uploaded image' });
    }
    return options;
  }, [activeCategories, draft.imageUrl, publishedProducts]);

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft(sectionKey));
    setFormOpen(true);
    setPreview(false);
    setError('');
    setNotice('');
  };

  const cancelForm = () => {
    setEditingId(null);
    setDraft(emptyDraft(sectionKey));
    setFormOpen(false);
    setPreview(false);
    setError('');
  };

  const edit = (card: CmsHomepageCard) => {
    setEditingId(card.id);
    setDraft({
      sectionKey: card.sectionKey,
      title: card.title,
      subtitle: card.subtitle,
      description: card.description,
      imageUrl: card.imageUrl,
      imageStorageKey: card.imageStorageKey,
      buttonText: card.buttonText,
      destinationType: card.destinationType,
      destinationValue: card.destinationValue,
      displayOrder: card.displayOrder,
      status: card.status,
      enabled: card.enabled,
    });
    setFormOpen(true);
    setPreview(false);
    setError('');
    setNotice('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) await adminService.updateCmsCard(token, editingId, draft);
      else await adminService.createCmsCard(token, draft);
      const message = editingId ? 'Card updated.' : 'Card created.';
      setEditingId(null);
      setDraft(emptyDraft(sectionKey));
      setFormOpen(false);
      setNotice(message);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save homepage card.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (card: CmsHomepageCard) => {
    if (!window.confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      await adminService.deleteCmsCard(token, card.id);
      if (editingId === card.id) cancelForm();
      setNotice('Card deleted.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete homepage card.');
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) {
      setError('Use a JPEG, PNG, or WebP image up to 10 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const result = await adminService.uploadCmsImage(token, file);
      setDraft((current) => ({ ...current, imageUrl: result.url, imageStorageKey: result.storageKey }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const destinationTypeOptions = requiredDestination[sectionKey]
    ? [requiredDestination[sectionKey] as CmsCardDestinationType]
    : ['PAGE', 'CATEGORY', 'PRODUCT', 'BRAND'] as CmsCardDestinationType[];

  const sectionLabel = cardTabs.find((tab) => tab.key === sectionKey)?.label ?? 'Homepage cards';

  return <section className="mt-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
    {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p> : null}
    {notice ? <p className="mt-4 text-sm text-emerald-300" role="status">{notice}</p> : null}

    {formOpen ? <form onSubmit={(event) => void save(event)} className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? 'Edit card' : `Add ${sectionLabel.toLowerCase()}`}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{sectionLabel}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Title<input required maxLength={180} className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="text-sm">Subtitle<input maxLength={500} className={fieldClass} value={draft.subtitle ?? ''} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value || null })} /></label>
          <label className="text-sm sm:col-span-2">Description<textarea maxLength={5000} rows={3} className={fieldClass} value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value || null })} /></label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Destination type
            <select className={fieldClass} value={draft.destinationType} disabled={Boolean(requiredDestination[sectionKey])} onChange={(event) => setDraft({ ...draft, destinationType: event.target.value as CmsCardDestinationType, destinationValue: '' })}>
              {destinationTypeOptions.map((type) => <option key={type} value={type}>{type[0] + type.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <label className="text-sm">Destination
            <select required className={fieldClass} value={draft.destinationValue} onChange={(event) => setDraft({ ...draft, destinationValue: event.target.value })}>
              <option value="">Select a destination</option>
              {destinationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Card image
            <select className={fieldClass} value={draft.imageUrl ?? ''} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value || null, imageStorageKey: event.target.value === draft.imageUrl ? draft.imageStorageKey : null })}>
              {imageOptions.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm">Upload image
            <span className="mt-1 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2">
              <Upload className="h-4 w-4" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="min-w-0 flex-1 text-xs" disabled={uploading} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ''; }} />
            </span>
            {uploading ? <span className="text-xs text-[var(--text-secondary)]">Uploading...</span> : null}
          </label>
        </div>
        <label className="block text-sm">Button text<input maxLength={120} className={fieldClass} value={draft.buttonText ?? ''} onChange={(event) => setDraft({ ...draft, buttonText: event.target.value || null })} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Display order<input type="number" min="0" required className={fieldClass} value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} /></label>
          <label className="text-sm">Publish status<select className={fieldClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="INACTIVE">Inactive</option></select></label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Active</label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || uploading}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create card'}</Button>
          <Button type="button" variant="secondary" disabled={saving || uploading} onClick={cancelForm}>Cancel</Button>
          <Button type="button" variant="secondary" onClick={() => setPreview((value) => !value)}><Eye className="mr-2 h-4 w-4" />{preview ? 'Hide preview' : 'Preview card'}</Button>
        </div>
        {preview ? <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Preview</p>{draft.imageUrl ? <img src={resolveCmsMediaUrl(draft.imageUrl) ?? draft.imageUrl} alt="" className={`w-full rounded-xl object-cover ${sectionKey === 'FRAME_SHAPE' ? 'aspect-square' : 'aspect-[4/3]'}`} /> : <div className="grid aspect-[4/3] place-items-center rounded-xl bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">Catalogue image will be used when available</div>}<p className="mt-3 font-semibold">{draft.title || 'Card title'}</p>{draft.subtitle ? <p className="text-sm text-[var(--text-secondary)]">{draft.subtitle}</p> : null}{draft.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{draft.description}</p> : null}</div> : null}
      </form>
      : <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{sectionLabel}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage, order, and publish this homepage content.</p>
          </div>
          <Button type="button" onClick={startNew}><Plus className="mr-2 h-4 w-4" />Add New</Button>
        </div>
        <div className="mt-5">
        {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading cards...</p> : cards.length ? <div className="space-y-3">{cards.map((card) => <article key={card.id} className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
          {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-[var(--bg-secondary)]" />}
          <div className="min-w-0 flex-1"><p className="truncate font-medium">{card.title}</p><p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{card.destinationType}: {card.destinationValue}</p><p className="mt-1 text-xs"><span className="rounded-full bg-[var(--bg-secondary)] px-2 py-1">{card.status}</span> · {card.enabled ? 'Active' : 'Inactive'} · Order {card.displayOrder}</p></div>
          <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" className="px-2 py-2" aria-label={`Edit ${card.title}`} onClick={() => edit(card)}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" className="px-2 py-2" aria-label={`Delete ${card.title}`} onClick={() => void remove(card)}><Trash2 className="h-4 w-4" /></Button></div>
        </article>)}</div> : <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">No cards have been created in this section.</p>}
        {!loading && total > pageSize ? <div className="mt-4 flex items-center justify-between gap-3 text-sm"><Button type="button" variant="ghost" className="px-3 py-2" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page + 1} of {Math.ceil(total / pageSize)}</span><Button type="button" variant="ghost" className="px-3 py-2" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</Button></div> : null}
      </div>
      </div>}
  </section>;
}
