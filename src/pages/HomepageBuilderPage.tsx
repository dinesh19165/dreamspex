import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Eye,
  Image,
  Layers,
  Megaphone,
  PanelsTopLeft,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shapes,
  Tag,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DashboardShell } from './FranchiseSystemPages';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import { adminProductService, type AdminCategory, type AdminProduct } from '../services/adminProductService';
import { adminService, type CmsBanner, type CmsCardSection, type CmsHomepage, type CmsSection } from '../services/adminService';
import { resolveCmsMediaUrl } from '../config/api';
import HomepageCardsManager from './HomepageCardsManager';

const sectionTypes = ['CATEGORY_GRID', 'PRODUCT_GRID', 'TRENDING_PRODUCTS', 'BEST_SELLERS', 'NEW_ARRIVALS', 'FEATURED_COLLECTION', 'PROMO_BANNER', 'RICH_TEXT'];
const cardModules: Array<{ key: CmsCardSection; title: string; description: string; icon: typeof Image }> = [
  { key: 'CATEGORY_BANNER', title: 'Category Banner Cards', description: 'Feature category imagery and destination links.', icon: PanelsTopLeft },
  { key: 'FRAME_SHAPE', title: 'Frame Shape Cards', description: 'Showcase frame shapes with catalogue destinations.', icon: Shapes },
  { key: 'TRENDING_PRODUCT', title: 'Trending Products', description: 'Choose and order products featured as trending.', icon: TrendingUp },
  { key: 'PROMOTIONAL', title: 'Promotional Cards', description: 'Manage homepage promotions and their destinations.', icon: Tag },
  { key: 'SHOP_BY_WEARER', title: 'Shop by Wearer', description: 'Organize cards by wearer and audience.', icon: Users },
  { key: 'EXPLORE_BY_BRAND', title: 'Explore by Brand', description: 'Feature catalogue brands on the homepage.', icon: Layers },
];
const homepageModules: Array<{ key: string; title: string; description: string; icon: typeof Image }> = [
  { key: 'banners', title: 'Home Banners', description: 'Manage responsive image and video hero banners.', icon: Image },
  ...cardModules,
  { key: 'sections', title: 'Homepage Sections', description: 'Configure homepage layouts, products, and categories.', icon: Megaphone },
];
const emptySection = { slug: '', sectionType: 'PRODUCT_GRID', title: '', subtitle: '', contentJson: '', displayOrder: 0, status: 'DRAFT', enabled: true, productIds: [] as string[], categoryIds: [] as string[] };
const emptyBanner = { title: '', subtitle: '', description: '', desktopImageUrl: '', mobileImageUrl: '', desktopStorageKey: '', mobileStorageKey: '', desktopMediaType: 'IMAGE' as 'IMAGE' | 'VIDEO', desktopVideoUrl: '', desktopVideoStorageKey: '', buttonText: '', linkUrl: '', secondaryButtonText: '', secondaryLinkUrl: '', positioning: 'center', sortOrder: 0, status: 'DRAFT', startsAt: '', endsAt: '' };
const fieldClass = 'mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';

function toInputDate(value: string | null | undefined) { return value ? value.slice(0, 16) : ''; }
function fileIsImage(file: File) { return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10_000_000; }
function fileIsVideo(file: File) { return ['video/mp4', 'video/webm'].includes(file.type) && file.size <= 100_000_000; }

function CmsBannerImage({ bannerId, imageUrl, alt, className }: { bannerId: string; imageUrl: string; alt: string; className: string }) {
  return <img
    src={resolveCmsMediaUrl(imageUrl) ?? imageUrl}
    alt={alt}
    className={className}
    onLoad={() => {
      if (import.meta.env.DEV) console.info('[CMS homepage] Admin banner image rendered', { id: bannerId, imageUrl });
    }}
    onError={() => {
      if (import.meta.env.DEV) console.error('[CMS homepage] Admin banner image failed', { id: bannerId, imageUrl });
    }}
  />;
}

export default function HomepageBuilderPage() {
  const { user, refreshSession } = useAuth();
  const token = user?.accessToken ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedModule = homepageModules.find((item) => item.key === searchParams.get('module'));
  const [content, setContent] = useState<CmsHomepage | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [section, setSection] = useState<typeof emptySection>(emptySection);
  const [banner, setBanner] = useState<typeof emptyBanner>(emptyBanner);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [bannerFormOpen, setBannerFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | 'video' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [nextContent, nextProducts, nextCategories] = await Promise.all([
        adminService.cmsHomepage(token),
        adminProductService.list(),
        adminProductService.categories(),
      ]);
      if (import.meta.env.DEV) {
        console.info('[CMS homepage] Admin banner list rendered', nextContent.banners.map(({ id, title, status, desktopImageUrl, mobileImageUrl }) => ({
          id, title, status, desktopImageUrl, mobileImageUrl,
        })));
      }
      setContent(nextContent);
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (reason) {
      if ((reason as { status?: number }).status === 401) await refreshSession();
      setError(reason instanceof Error ? reason.message : 'Unable to load homepage content.');
    } finally {
      setLoading(false);
    }
  }, [refreshSession, token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setSectionFormOpen(false);
    setBannerFormOpen(false);
    setError('');
    setNotice('');
  }, [selectedModule?.key]);

  const saveSection = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editingSection
        ? await adminService.updateCmsSection(token, editingSection, section)
        : await adminService.createCmsSection(token, section);
      setContent((current) => current ? {
        ...current,
        sections: editingSection
          ? current.sections.map((item) => item.id === saved.id ? saved : item)
          : [...current.sections, saved].sort((a, b) => a.displayOrder - b.displayOrder),
      } : current);
      setSection(emptySection);
      setEditingSection(null);
      setSectionFormOpen(false);
      setNotice('Section saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save section.');
    } finally {
      setSaving(false);
    }
  };

  const saveBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...banner,
        startsAt: banner.startsAt ? new Date(banner.startsAt).toISOString() : null,
        endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString() : null,
      };
      const saved = editingBanner
        ? await adminService.updateCmsBanner(token, editingBanner, payload)
        : await adminService.createCmsBanner(token, payload);
      setContent((current) => current ? {
        ...current,
        banners: editingBanner
          ? current.banners.map((item) => item.id === saved.id ? saved : item)
          : [...current.banners, saved].sort((a, b) => a.sortOrder - b.sortOrder),
      } : current);
      setBanner(emptyBanner);
      setEditingBanner(null);
      setBannerFormOpen(false);
      setNotice('Banner saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save banner.');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (kind: 'desktop' | 'mobile' | 'video', file?: File) => {
    if (!file) return;
    if (kind === 'video' ? !fileIsVideo(file) : !fileIsImage(file)) {
      setError(kind === 'video' ? 'Use an MP4 or WebM video up to 100 MB.' : 'Use a JPEG, PNG, or WebP image up to 10 MB.');
      return;
    }
    setUploading(kind);
    setError('');
    try {
      if (kind === 'video') {
        const result = await adminService.uploadCmsVideo(token, file);
        setBanner((current) => ({ ...current, desktopVideoUrl: result.url, desktopVideoStorageKey: result.storageKey }));
      } else {
        const result = await adminService.uploadCmsImage(token, file);
        setBanner((current) => ({ ...current, [`${kind}ImageUrl`]: result.url, [`${kind}StorageKey`]: result.storageKey }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${kind === 'video' ? 'Video' : 'Image'} upload failed.`);
    } finally {
      setUploading(null);
    }
  };

  const editSection = (value: CmsSection) => {
    setEditingSection(value.id);
    setSection({
      slug: value.slug,
      sectionType: value.sectionType,
      title: value.title ?? '',
      subtitle: value.subtitle ?? '',
      contentJson: value.contentJson ?? '',
      displayOrder: value.displayOrder,
      status: value.status,
      enabled: value.enabled,
      productIds: value.products.map((item) => item.id),
      categoryIds: value.categories.map((item) => item.id),
    });
    setSectionFormOpen(true);
  };

  const editBanner = (value: CmsBanner) => {
    setEditingBanner(value.id);
    setBanner({
      title: value.title,
      subtitle: value.subtitle ?? '',
      description: value.description ?? '',
      desktopImageUrl: value.desktopImageUrl,
      mobileImageUrl: value.mobileImageUrl ?? '',
      desktopStorageKey: value.desktopStorageKey ?? '',
      mobileStorageKey: value.mobileStorageKey ?? '',
      desktopMediaType: value.desktopMediaType ?? 'IMAGE',
      desktopVideoUrl: value.desktopVideoUrl ?? '',
      desktopVideoStorageKey: value.desktopVideoStorageKey ?? '',
      buttonText: value.buttonText ?? '',
      linkUrl: value.linkUrl ?? '',
      secondaryButtonText: value.secondaryButtonText ?? '',
      secondaryLinkUrl: value.secondaryLinkUrl ?? '',
      positioning: value.positioning ?? 'center',
      sortOrder: value.sortOrder,
      status: value.status,
      startsAt: toInputDate(value.startsAt),
      endsAt: toInputDate(value.endsAt),
    });
    setBannerFormOpen(true);
  };

  const duplicateBanner = (value: CmsBanner) => {
    editBanner(value);
    setEditingBanner(null);
  };

  const remove = async (kind: 'section' | 'banner', id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError('');
    try {
      if (kind === 'section') await adminService.deleteCmsSection(token, id);
      else await adminService.deleteCmsBanner(token, id);
      await load();
      setNotice(`${kind === 'section' ? 'Section' : 'Banner'} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to delete ${kind}.`);
    }
  };

  const moveSection = async (value: CmsSection, delta: number) => {
    const next = value.displayOrder + delta;
    if (next < 0) return;
    try {
      await adminService.updateCmsSection(token, value.id, {
        slug: value.slug,
        sectionType: value.sectionType,
        title: value.title ?? '',
        subtitle: value.subtitle ?? '',
        contentJson: value.contentJson ?? '',
        displayOrder: next,
        status: value.status,
        enabled: value.enabled,
        productIds: value.products.map((item) => item.id),
        categoryIds: value.categories.map((item) => item.id),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reorder section.');
    }
  };

  const openModule = (key: string) => setSearchParams({ module: key });
  const returnToLanding = () => setSearchParams({});
  const selectedCardModule = selectedModule && cardModules.find((item) => item.key === selectedModule.key);
  const cancelBannerForm = () => {
    setBanner(emptyBanner);
    setEditingBanner(null);
    setBannerFormOpen(false);
    setError('');
  };
  const cancelSectionForm = () => {
    setSection(emptySection);
    setEditingSection(null);
    setSectionFormOpen(false);
    setError('');
  };

  if (loading) {
    return <DashboardShell>
      <SectionTitle eyebrow="Website Content" title="Homepage Management" description="Manage published homepage content without a frontend deployment." />
      <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading content...</p>
    </DashboardShell>;
  }

  return <DashboardShell>
    {!selectedModule ? <>
      <SectionTitle eyebrow="Website Content" title="Homepage Management" description="Choose a content area to manage the homepage experience." />
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/" target="_blank" rel="noreferrer"><Button variant="secondary"><Eye className="mr-2 h-4 w-4" />Preview homepage</Button></a>
        <Button variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {homepageModules.map((module) => {
          const Icon = module.icon;
          return <button
            key={module.key}
            type="button"
            onClick={() => openModule(module.key)}
            className="group flex min-h-44 flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-green)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)]"><Icon className="h-5 w-5" /></span>
            <span className="mt-4 text-base font-semibold text-[var(--text-primary)]">{module.title}</span>
            <span className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">{module.description}</span>
            <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-[var(--brand-green)]">Manage <span aria-hidden="true">→</span></span>
          </button>;
        })}
      </div>
    </> : <>
      <div className="mb-5">
        <button type="button" onClick={returnToLanding} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--brand-green)]">
          <ArrowLeft className="h-4 w-4" /> Back to Homepage Management
        </button>
        <nav className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]" aria-label="Breadcrumb">
          <button type="button" onClick={returnToLanding} className="hover:text-[var(--brand-green)]">Homepage Management</button>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--text-primary)]">{selectedModule.title}</span>
        </nav>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-green)]">Website Content</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{selectedModule.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{selectedModule.description}</p>
        </div>
        {!selectedCardModule && !bannerFormOpen && !sectionFormOpen ? <Button variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button> : null}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-800" role="status">{notice}</p> : null}

      {selectedCardModule ? <HomepageCardsManager key={selectedCardModule.key} token={token} products={products} categories={categories} sectionKey={selectedCardModule.key} /> : null}

      {selectedModule.key === 'banners' ? bannerFormOpen ? <form onSubmit={saveBanner} className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">{editingBanner ? 'Edit banner' : 'Add home banner'}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(['title', 'subtitle', 'description', 'buttonText', 'linkUrl', 'secondaryButtonText', 'secondaryLinkUrl', 'positioning'] as const).map((key) => <label key={key} className={`text-sm font-medium ${key === 'description' ? 'sm:col-span-2' : ''}`}>
            {key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}
            <input required={key === 'title'} className={fieldClass} value={banner[key]} onChange={(event) => setBanner({ ...banner, [key]: event.target.value })} />
          </label>)}
        </div>
        <label className="mt-4 block text-sm font-medium">Desktop media type
          <select className={fieldClass} value={banner.desktopMediaType} onChange={(event) => setBanner({ ...banner, desktopMediaType: event.target.value as 'IMAGE' | 'VIDEO' })}>
            <option value="IMAGE">Image</option><option value="VIDEO">Video</option>
          </select>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {banner.desktopMediaType === 'IMAGE' ? <label className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm font-medium">
            Desktop image (required)
            <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload('desktop', event.target.files?.[0])} />
            {uploading === 'desktop' ? <span className="text-xs text-[var(--text-secondary)]">Uploading...</span> : banner.desktopImageUrl ? <CmsBannerImage bannerId={editingBanner ?? 'unsaved'} imageUrl={banner.desktopImageUrl} alt="Desktop banner preview" className="mt-3 aspect-video w-full rounded-lg object-cover" /> : <span className="mt-2 block text-xs text-red-600">No desktop image selected</span>}
          </label> : <label className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm font-medium">
            Desktop video (MP4 or WebM, max 100 MB)
            <input className="mt-2 block w-full text-xs" type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => void upload('video', event.target.files?.[0])} />
            {uploading === 'video' ? <span className="text-xs text-[var(--text-secondary)]">Uploading...</span> : banner.desktopVideoUrl ? <video key={banner.desktopVideoUrl} src={resolveCmsMediaUrl(banner.desktopVideoUrl) ?? banner.desktopVideoUrl} muted loop autoPlay playsInline controls className="mt-3 aspect-video w-full rounded-lg bg-black object-cover" /> : <span className="mt-2 block text-xs text-red-600">No desktop video selected</span>}
          </label>}
          <label className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm font-medium">
            {banner.desktopMediaType === 'VIDEO' ? 'Mobile banner image (required for video)' : 'Mobile banner image (optional)'}
            <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload('mobile', event.target.files?.[0])} />
            {uploading === 'mobile' ? <span className="text-xs text-[var(--text-secondary)]">Uploading...</span> : banner.mobileImageUrl ? <CmsBannerImage bannerId={editingBanner ?? 'unsaved'} imageUrl={banner.mobileImageUrl} alt="Mobile banner preview" className="mt-3 aspect-video w-full rounded-lg object-cover" /> : <span className="mt-2 block text-xs text-[var(--text-secondary)]">No mobile image selected</span>}
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Order<input type="number" min="0" className={fieldClass} value={banner.sortOrder} onChange={(event) => setBanner({ ...banner, sortOrder: Number(event.target.value) })} /></label>
          <label className="text-sm font-medium">Status<select className={fieldClass} value={banner.status} onChange={(event) => setBanner({ ...banner, status: event.target.value })}><option>DRAFT</option><option>PUBLISHED</option><option>INACTIVE</option></select></label>
          <label className="text-sm font-medium">Position<select className={fieldClass} value={banner.positioning} onChange={(event) => setBanner({ ...banner, positioning: event.target.value })}><option>center</option><option>center top</option><option>center bottom</option><option>left center</option><option>right center</option></select></label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Starts at<input type="datetime-local" className={fieldClass} value={banner.startsAt} onChange={(event) => setBanner({ ...banner, startsAt: event.target.value })} /></label>
          <label className="text-sm font-medium">Ends at<input type="datetime-local" className={fieldClass} value={banner.endsAt} onChange={(event) => setBanner({ ...banner, endsAt: event.target.value })} /></label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || uploading !== null || (banner.desktopMediaType === 'IMAGE' ? !banner.desktopImageUrl : !banner.desktopVideoUrl || !banner.mobileImageUrl)}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save banner'}</Button>
          <Button type="button" variant="secondary" disabled={saving || uploading !== null} onClick={cancelBannerForm}>Cancel</Button>
        </div>
      </form> : <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Home banners</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Responsive banners, media, scheduling, and publishing status.</p></div>
          <Button onClick={() => { setBanner(emptyBanner); setEditingBanner(null); setBannerFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add New</Button>
        </div>
        <div className="mt-5 space-y-3">
          {content?.banners.length ? content.banners.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
            <CmsBannerImage bannerId={item.id} imageUrl={item.desktopImageUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Order {item.sortOrder} · {item.desktopMediaType ?? 'IMAGE'}</p><span className="mt-2 inline-flex rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium">{item.status}</span></div>
            <div className="flex gap-1">
              <Button variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => editBanner(item)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" aria-label={`Duplicate ${item.title}`} onClick={() => duplicateBanner(item)}><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" aria-label={`Delete ${item.title}`} onClick={() => void remove('banner', item.id, item.title)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          </article>) : <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-sm text-[var(--text-secondary)]">No homepage banners yet. Add one to get started.</div>}
        </div>
      </section> : null}

      {selectedModule.key === 'sections' ? sectionFormOpen ? <form onSubmit={saveSection} className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">{editingSection ? 'Edit section' : 'Add homepage section'}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Slug<input required className={fieldClass} value={section.slug} onChange={(event) => setSection({ ...section, slug: event.target.value })} /></label>
          <label className="text-sm font-medium">Type<select className={fieldClass} value={section.sectionType} onChange={(event) => setSection({ ...section, sectionType: event.target.value })}>{sectionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-sm font-medium">Title<input className={fieldClass} value={section.title} onChange={(event) => setSection({ ...section, title: event.target.value })} /></label>
          <label className="text-sm font-medium">Subtitle<input className={fieldClass} value={section.subtitle} onChange={(event) => setSection({ ...section, subtitle: event.target.value })} /></label>
        </div>
        <label className="mt-4 block text-sm font-medium">Content JSON (optional)<textarea className={`${fieldClass} min-h-24 font-mono text-xs`} value={section.contentJson} onChange={(event) => setSection({ ...section, contentJson: event.target.value })} /></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Products<select multiple className={`${fieldClass} h-36`} value={section.productIds} onChange={(event) => setSection({ ...section, productIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{products.filter((item) => item.status === 'PUBLISHED').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium">Categories<select multiple className={`${fieldClass} h-36`} value={section.categoryIds} onChange={(event) => setSection({ ...section, categoryIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{categories.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Order<input type="number" min="0" className={fieldClass} value={section.displayOrder} onChange={(event) => setSection({ ...section, displayOrder: Number(event.target.value) })} /></label>
          <label className="text-sm font-medium">Status<select className={fieldClass} value={section.status} onChange={(event) => setSection({ ...section, status: event.target.value })}><option>DRAFT</option><option>PUBLISHED</option><option>INACTIVE</option></select></label>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={section.enabled} onChange={(event) => setSection({ ...section, enabled: event.target.checked })} />Enabled</label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save section'}</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={cancelSectionForm}>Cancel</Button>
        </div>
      </form> : <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Homepage sections</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Configure section content and display order.</p></div>
          <Button onClick={() => { setSection(emptySection); setEditingSection(null); setSectionFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add New</Button>
        </div>
        <div className="mt-5 space-y-3">
          {content?.sections.length ? content.sections.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title || item.slug}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.sectionType} · Order {item.displayOrder} · {item.enabled ? 'Enabled' : 'Disabled'}</p><span className="mt-2 inline-flex rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium">{item.status}</span></div>
            <div className="flex gap-1">
              <Button variant="ghost" aria-label={`Move ${item.title || item.slug} up`} onClick={() => void moveSection(item, -1)}>↑</Button>
              <Button variant="ghost" aria-label={`Move ${item.title || item.slug} down`} onClick={() => void moveSection(item, 1)}>↓</Button>
              <Button variant="ghost" aria-label={`Edit ${item.title || item.slug}`} onClick={() => editSection(item)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" aria-label={`Delete ${item.title || item.slug}`} onClick={() => void remove('section', item.id, item.title || item.slug)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          </article>) : <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-sm text-[var(--text-secondary)]">No homepage sections yet. Add one to get started.</div>}
        </div>
      </section> : null}
    </>}
  </DashboardShell>;
}
