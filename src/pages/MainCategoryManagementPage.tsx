import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { DashboardShell } from './FranchiseSystemPages';
import { adminProductService, type AdminCategory, type AdminCategoryRequest } from '../services/adminProductService';

const emptyCategory: AdminCategoryRequest = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
  sortOrder: 0,
};

const fieldClass = 'mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';

export default function MainCategoryManagementPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [draft, setDraft] = useState<AdminCategoryRequest>(emptyCategory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await adminProductService.categories());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetDraft = () => {
    setDraft(emptyCategory);
    setEditingId(null);
  };

  const edit = (category: AdminCategory) => {
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      status: category.status,
      sortOrder: category.sortOrder,
    });
    setEditingId(category.id);
    setError('');
    setNotice('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const category = { ...draft, description: draft.description || null, imageUrl: draft.imageUrl || null };
    try {
      const saved = editingId
        ? await adminProductService.updateCategory(editingId, category)
        : await adminProductService.createCategory(category);
      setCategories((current) => {
        const next = editingId
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved];
        return next.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
      });
      resetDraft();
      setNotice(editingId ? 'Category updated.' : 'Category created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category: AdminCategory) => {
    const nextStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setError('');
    setNotice('');
    try {
      const saved = await adminProductService.updateCategory(category.id, {
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
        status: nextStatus,
      });
      setCategories((current) => current.map((item) => item.id === saved.id ? saved : item));
      setNotice(`${category.name} ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update category status.');
    }
  };

  const remove = async (category: AdminCategory) => {
    if (!window.confirm(`Delete "${category.name}"? This category will be deactivated.`)) return;
    setError('');
    setNotice('');
    try {
      await adminProductService.deleteCategory(category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetDraft();
      setNotice('Category deleted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete category.');
    }
  };

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Catalogue" title="Main Category Management" description="Manage catalogue categories using the existing category service." />
      <div className="mt-6 flex justify-end">
        <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-200" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-emerald-300" role="status">{notice}</p> : null}

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5" aria-labelledby="category-list-heading">
          <h2 id="category-list-heading" className="text-lg font-semibold">Categories</h2>
          {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">Loading categories...</p> : categories.length ? (
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <article key={category.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-center">
                  {category.imageUrl
                    ? <img src={category.imageUrl} alt="" className="h-16 w-16 rounded-lg bg-[var(--bg-secondary)] object-cover" />
                    : <div className="h-16 w-16 rounded-lg bg-[var(--bg-secondary)]" aria-hidden="true" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{category.slug} · Order {category.sortOrder}</p>
                    <p className="mt-1 text-xs">{category.status}</p>
                    {category.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{category.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => edit(category)} aria-label={`Edit ${category.name}`}>
                      <Pencil className="mr-1.5 h-4 w-4" />Edit
                    </Button>
                    <Button type="button" variant="secondary" className="px-3 py-2" onClick={() => void toggleStatus(category)}>
                      {category.status === 'ACTIVE' ? <X className="mr-1.5 h-4 w-4" /> : <Check className="mr-1.5 h-4 w-4" />}
                      {category.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button type="button" variant="ghost" className="px-3 py-2 text-red-300" onClick={() => void remove(category)} aria-label={`Delete ${category.name}`}>
                      <Trash2 className="mr-1.5 h-4 w-4" />Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">No active categories were returned by the category API.</p>}
        </section>

        <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit category' : 'Create category'}</h2>
            {editingId ? <Button type="button" variant="ghost" className="px-3 py-2" onClick={resetDraft}>Cancel</Button> : null}
          </div>
          <label className="block text-sm">Name
            <input required maxLength={120} className={fieldClass} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="block text-sm">Slug
            <input required maxLength={140} className={fieldClass} value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label className="block text-sm">Description
            <textarea maxLength={2000} rows={3} className={fieldClass} value={draft.description ?? ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="block text-sm">Image URL
            <input type="url" maxLength={1000} className={fieldClass} value={draft.imageUrl ?? ''} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Display order
              <input type="number" min="0" required className={fieldClass} value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
            </label>
            <label className="block text-sm">Status
              <select className={fieldClass} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create category'}
          </Button>
        </form>
      </div>
    </DashboardShell>
  );
}
