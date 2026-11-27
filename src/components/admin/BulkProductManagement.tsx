import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, History, Image, PackagePlus, Upload } from 'lucide-react';
import Button from '../ui/Button';
import { resolveCmsMediaUrl } from '../../config/api';
import {
  adminProductService,
  type AdminCategory,
  type AdminProduct,
  type ProductBulkHistory,
  type ProductBulkSummary,
} from '../../services/adminProductService';

type Props = {
  products: AdminProduct[];
  categories: AdminCategory[];
  onImported: () => Promise<void>;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatImportDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatFileSize(file: File) {
  if (file.size < 1024) return `${file.size} B`;
  if (file.size < 1024 * 1024) return `${Math.round(file.size / 1024)} KB`;
  return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[#e3e9e3] bg-white p-3 shadow-sm">
    <p className="text-xs font-medium text-[#68756b]">{label}</p>
    <p className="mt-1 text-lg font-semibold text-[#24352a]">{value.toLocaleString('en-IN')}</p>
  </div>;
}

export default function BulkProductManagement({ products, categories, onImported }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState<'CREATE' | 'UPDATE'>('CREATE');
  const [inventoryMode, setInventoryMode] = useState<'SET' | 'ADD'>('SET');
  const [workbook, setWorkbook] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductBulkSummary | null>(null);
  const [history, setHistory] = useState<ProductBulkHistory[] | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const visibleProducts = useMemo(() => products.filter((product) =>
    (!categoryId || product.categories.some((category) => category.id === categoryId))
    && (!status || product.status === status)), [categoryId, products, status]);

  const toggleProduct = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  };

  const exportProducts = async (label: string, options: {
    productIds?: string[];
    categoryId?: string;
    status?: string;
    archive?: boolean;
  }, filename: string) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      downloadBlob(await adminProductService.exportBulkProducts(options), filename);
      setNotice(`${label} is ready to download.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Product export failed.');
    } finally {
      setBusy('');
    }
  };

  const downloadTemplate = async () => {
    setBusy('template');
    setError('');
    setNotice('');
    try {
      downloadBlob(await adminProductService.downloadBulkTemplate(), 'DreamSpex_Product_Import_Template.xlsx');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The Excel template could not be downloaded.');
    } finally {
      setBusy('');
    }
  };

  const previewImport = async () => {
    if (!workbook) return;
    setBusy('preview');
    setError('');
    setNotice('');
    setPreview(null);
    try {
      setPreview(await adminProductService.previewBulkImport(workbook, imagesZip, mode, inventoryMode));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The workbook could not be validated.');
    } finally {
      setBusy('');
    }
  };

  const importProducts = async () => {
    if (!preview || !workbook || preview.status !== 'PREVIEWED' || preview.validRecords < 1) return;
    if (!window.confirm(`Import ${preview.newProducts + preview.existingProducts} valid product(s) and ${preview.newVariants + preview.updatedVariants} valid variant(s)? Invalid records will be skipped.`)) return;
    setBusy('import');
    setError('');
    setNotice('');
    try {
      const result = await adminProductService.importBulkProducts(preview.jobId, workbook, imagesZip);
      setPreview(result);
      setNotice(`Import completed: ${result.importedRecords} workbook record(s) imported. Invalid records were skipped.`);
      await onImported();
      if (history) setHistory(await adminProductService.bulkImportHistory());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The product import failed.');
    } finally {
      setBusy('');
    }
  };

  const downloadErrors = async (jobId: string) => {
    setBusy('errors');
    setError('');
    try {
      downloadBlob(await adminProductService.downloadBulkErrorReport(jobId), 'DreamSpex_Product_Import_Errors.xlsx');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The error report could not be downloaded.');
    } finally {
      setBusy('');
    }
  };

  const toggleHistory = async () => {
    if (history) {
      setHistory(null);
      return;
    }
    setBusy('history');
    setError('');
    try {
      setHistory(await adminProductService.bulkImportHistory());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import history could not be loaded.');
    } finally {
      setBusy('');
    }
  };

  const resetPreview = () => {
    setPreview(null);
    setError('');
    setNotice('');
  };

  return <section className="mb-6 space-y-5"
    aria-labelledby="bulk-products-heading">
    <div className="flex flex-col gap-4 rounded-xl border border-[#e1e8e2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#527a4c]">Catalogue tools</p>
        <h2 id="bulk-products-heading" className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1d2b22]">
          <FileSpreadsheet className="h-5 w-5 text-[#527a4c]" /> Bulk Product Management
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[#68756b]">
          Import, export, validate and manage your product catalogue in bulk.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''} onClick={() => void downloadTemplate()}>
          <Download className="mr-2 h-4 w-4" /> Download Excel Template
        </Button>
        <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''} onClick={() => void toggleHistory()}>
          <History className="mr-2 h-4 w-4" /> {history ? 'Hide Import History' : 'View Import History'}
        </Button>
      </div>
    </div>

    {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
    {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-[#e1e8e2] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#527a4c]">01 · Download</p>
            <h3 className="mt-1 text-base font-semibold text-[#24352a]">Export catalogue</h3>
          </div>
          <Download className="h-5 w-5 text-[#527a4c]" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#68756b]">Category
            <select className="mt-1.5 h-10 w-full rounded-lg border border-[#d5dfd6] bg-white px-3 text-sm text-[#24352a] outline-none focus:border-[#527a4c] focus:ring-2 focus:ring-[#7cbf00]/15"
              value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[#68756b]">Product status
            <select className="mt-1.5 h-10 w-full rounded-lg border border-[#d5dfd6] bg-white px-3 text-sm text-[#24352a] outline-none focus:border-[#527a4c] focus:ring-2 focus:ring-[#7cbf00]/15"
              value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {['DRAFT', 'PUBLISHED', 'INACTIVE'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-[#e1e8e2]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e1e8e2] bg-[#f7f9f7] px-3 py-2.5">
            <span className="text-xs text-[#68756b]"><strong className="text-[#24352a]">{selectedIds.length}</strong> selected <span className="mx-1 text-[#a2aca3]">·</span> {visibleProducts.length} visible</span>
            <div className="flex items-center gap-1">
              <button type="button" className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#315b36] hover:bg-[#eaf2e8]"
                onClick={() => setSelectedIds((current) => [...new Set([...current, ...visibleProducts.map((item) => item.id)])])}>
                Select visible
              </button>
              <button type="button" className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[#68756b] hover:bg-white hover:text-[#24352a]" onClick={() => setSelectedIds([])}>
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-[#edf1ed]">
            {visibleProducts.map((product) => {
              const imageUrl = resolveCmsMediaUrl(product.images[0]?.imageUrl);
              return <label key={product.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-[#fbfcfb]">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#527a4c]" checked={selectedIds.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                {imageUrl ? <img src={imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md border border-[#e1e8e2] bg-[#f7f9f7] object-cover" />
                  : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e1e8e2] bg-[#f7f9f7]"><Image className="h-4 w-4 text-[#89958c]" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[#24352a]">{product.name}</span>
                  <span className="block truncate text-xs text-[#68756b]">{product.sku}</span>
                </span>
                <span className="hidden max-w-32 truncate text-right text-xs text-[#68756b] lg:block">{product.categories.map((category) => category.name).join(', ') || 'Uncategorized'}</span>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${product.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : product.status === 'INACTIVE' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'}`}>{product.status}</span>
              </label>;
            })}
            {!visibleProducts.length ? <p className="px-3 py-8 text-center text-sm text-[#68756b]">No products match these filters.</p> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#68756b]">Selection: <strong className="text-[#24352a]">{selectedIds.length} product{selectedIds.length === 1 ? '' : 's'}</strong></p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''} onClick={() => void exportProducts(
            'Export all products',
            {},
            'DreamSpex_Products.xlsx',
          )}>
            <Download className="mr-2 h-4 w-4 shrink-0" /> Export All Products
          </Button>
          <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== '' || selectedIds.length === 0} onClick={() => void exportProducts(
            'Export selected products',
            { productIds: selectedIds },
            'DreamSpex_Selected_Products.xlsx',
          )}>
            <Download className="mr-2 h-4 w-4 shrink-0" /> Export Selected Products
          </Button>
          <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''} onClick={() => void exportProducts(
            'Export filtered products',
            { categoryId, status },
            'DreamSpex_Filtered_Products.xlsx',
          )}>
            <Download className="mr-2 h-4 w-4 shrink-0" /> Export by Category / Status
          </Button>
          <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''} onClick={() => void exportProducts(
            'Export product archive',
            { categoryId, status, archive: true },
            'DreamSpex_Products.zip',
          )}>
            <Download className="mr-2 h-4 w-4 shrink-0" /> Export ZIP with Images
          </Button>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-[#e1e8e2] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#527a4c]">02 · Upload</p>
            <h3 className="mt-1 text-base font-semibold text-[#24352a]">Import workbook and images</h3>
          </div>
          <Upload className="h-5 w-5 text-[#527a4c]" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-lg border border-[#e7ece7] bg-[#f7f9f7] p-3 text-xs font-medium text-[#68756b]">Import mode
            <select className="mt-1.5 h-10 w-full rounded-lg border border-[#d5dfd6] bg-white px-3 text-sm text-[#24352a] outline-none focus:border-[#527a4c] focus:ring-2 focus:ring-[#7cbf00]/15"
              value={mode} onChange={(event) => { setMode(event.target.value as 'CREATE' | 'UPDATE'); resetPreview(); }}>
              <option value="CREATE">Create new products</option>
              <option value="UPDATE">Update existing products</option>
            </select>
            <span className="mt-2 block font-normal leading-5">{mode === 'CREATE' ? 'Creates products that do not already exist by SKU.' : 'Matches existing products by SKU and updates supplied fields.'}</span>
          </label>
          <label className="rounded-lg border border-[#e7ece7] bg-[#f7f9f7] p-3 text-xs font-medium text-[#68756b]">Default inventory operation
            <select className="mt-1.5 h-10 w-full rounded-lg border border-[#d5dfd6] bg-white px-3 text-sm text-[#24352a] outline-none focus:border-[#527a4c] focus:ring-2 focus:ring-[#7cbf00]/15"
              value={inventoryMode} onChange={(event) => { setInventoryMode(event.target.value as 'SET' | 'ADD'); resetPreview(); }}>
              <option value="SET">Set quantity to workbook value</option>
              <option value="ADD">Add workbook quantity to stock</option>
            </select>
            <span className="mt-2 block font-normal leading-5">{inventoryMode === 'SET' ? 'Replaces current quantity with the workbook quantity.' : 'Adds workbook quantity to current available inventory.'}</span>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-32 cursor-pointer flex-col justify-between rounded-lg border border-dashed border-[#b8cbb8] bg-[#fbfdfb] p-4 transition hover:border-[#527a4c] hover:bg-[#f5f9f4]">
            <span className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf2e8] text-[#315b36]"><FileSpreadsheet className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#24352a]">Excel workbook</span>
                <span className="mt-1 block text-xs text-[#68756b]">Choose a .xlsx product workbook</span>
              </span>
            </span>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => { setWorkbook(event.target.files?.[0] ?? null); resetPreview(); }} />
            <span className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-[#e7ece7] pt-3">
              <span className="min-w-0 truncate text-xs font-medium text-[#315b36]">{workbook ? workbook.name : 'Browse workbook'}</span>
              <span className="shrink-0 text-[11px] text-[#68756b]">{workbook ? formatFileSize(workbook) : 'Select file'}</span>
            </span>
          </label>
          <label className="flex min-h-32 cursor-pointer flex-col justify-between rounded-lg border border-dashed border-[#b8cbb8] bg-[#fbfdfb] p-4 transition hover:border-[#527a4c] hover:bg-[#f5f9f4]">
            <span className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf2e8] text-[#315b36]"><Upload className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#24352a]">Product images ZIP <span className="font-normal text-[#68756b]">(optional)</span></span>
                <span className="mt-1 block text-xs text-[#68756b]">Images are matched by exact filenames in the workbook</span>
              </span>
            </span>
            <input type="file" accept=".zip,application/zip"
              className="sr-only"
              onChange={(event) => { setImagesZip(event.target.files?.[0] ?? null); resetPreview(); }} />
            <span className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-[#e7ece7] pt-3">
              <span className="min-w-0 truncate text-xs font-medium text-[#315b36]">{imagesZip ? imagesZip.name : 'Browse ZIP file'}</span>
              <span className="shrink-0 text-[11px] text-[#68756b]">{imagesZip ? formatFileSize(imagesZip) : 'Select file'}</span>
            </span>
          </label>
        </div>
        <p className="mt-3 rounded-lg bg-[#f7f9f7] px-3 py-2.5 text-xs leading-5 text-[#68756b]">
          Workbook Adjustment is numeric. Inventory Operation accepts SET or ADD per variant; blank cells use this default. Blank update image fields preserve existing images; omitted variants are never deleted.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" className="h-10 rounded-lg px-4 py-2 shadow-none" disabled={!workbook || busy !== ''} onClick={() => void previewImport()}>
            <Upload className="mr-2 h-4 w-4" /> {busy === 'preview' ? 'Validating...' : 'Preview and Validate'}
          </Button>
          <Button type="button" variant="secondary" className="h-10 rounded-lg px-4 py-2 shadow-none" disabled={!preview || preview.status !== 'PREVIEWED'
            || preview.validRecords === 0 || busy !== ''} onClick={() => void importProducts()}>
            <PackagePlus className="mr-2 h-4 w-4" /> {busy === 'import' ? 'Importing...' : 'Import Valid Records'}
          </Button>
          {preview?.errors.length ? <Button type="button" variant="ghost" className="h-10 rounded-lg px-3 py-2 shadow-none" disabled={busy !== ''}
            onClick={() => void downloadErrors(preview.jobId)}>
            <Download className="mr-2 h-4 w-4" /> Download Import Error Report
          </Button> : null}
        </div>
        {busy === 'preview' || busy === 'import' ? <div className="mt-4">
          <label className="text-xs text-[var(--text-secondary)]" htmlFor="bulk-import-progress">
            {busy === 'preview' ? 'Validating workbook and image files...' : 'Saving valid products and inventory...'}
          </label>
          <progress id="bulk-import-progress" className="mt-2 h-2 w-full accent-[#527a4c]" />
        </div> : null}
      </div>
    </div>

    {preview ? <div className="rounded-xl border border-[#e1e8e2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#527a4c]">Validation results</p>
          <h3 className="mt-1 text-base font-semibold text-[#24352a]">Import preview</h3>
          <p className="mt-1 text-xs text-[#68756b]">
            {preview.totalRows} non-empty rows across both sheets · {preview.mode} · inventory {preview.inventoryMode}
          </p>
        </div>
        <span className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${preview.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[#dce7dc] bg-[#f4f8f3] text-[#315b36]'}`}>{preview.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        <Metric label="New products" value={preview.newProducts} />
        <Metric label="Existing products" value={preview.existingProducts} />
        <Metric label="New variants" value={preview.newVariants} />
        <Metric label="Variants to update" value={preview.updatedVariants} />
        <Metric label="Valid records" value={preview.validRecords} />
        <Metric label="Invalid records" value={preview.invalidRecords} />
        <Metric label="Missing images" value={preview.missingImages} />
        <Metric label="Duplicate SKUs" value={preview.duplicateSkus} />
        <Metric label="Invalid categories" value={preview.invalidCategories} />
        <Metric label="Invalid prices" value={preview.invalidPrices} />
        <Metric label="Invalid variants" value={preview.invalidVariants} />
        {preview.status === 'COMPLETED' ? <Metric label="Imported records" value={preview.importedRecords} /> : null}
      </div>
      {preview.errors.length ? <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-[#24352a]">Row-level validation issues</h4>
          <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{preview.errors.length} issue{preview.errors.length === 1 ? '' : 's'} · invalid records will be skipped</span>
        </div>
        <div className="max-h-72 overflow-auto rounded-lg border border-[#e1e8e2]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-[#f5f8f5] text-[#68756b]">
              <tr><th className="px-3 py-2.5 font-semibold">Excel sheet / row</th><th className="px-3 py-2.5 font-semibold">Product SKU</th><th className="px-3 py-2.5 font-semibold">Field</th><th className="px-3 py-2.5 font-semibold">Error message</th></tr>
            </thead>
            <tbody>{preview.errors.slice(0, 200).map((item, index) => <tr key={`${item.sheet}-${item.row}-${item.field}-${index}`} className="border-t border-[#edf1ed] odd:bg-white even:bg-[#fbfcfb]">
              <td className="whitespace-nowrap px-3 py-2.5 font-medium text-[#24352a]">{item.sheet} · {item.row}</td>
              <td className="px-3 py-2.5 text-[#24352a]">{item.sku || '—'}</td>
              <td className="px-3 py-2.5 text-[#68756b]">{item.field}</td>
              <td className="px-3 py-2.5 text-red-700">{item.message}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {preview.errors.length > 200 ? <p className="mt-2 text-xs text-[#68756b]">
          Showing the first 200 errors. Download the Excel error report for the full list.
        </p> : null}
      </div> : <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">Validation completed with no row errors.</p>}
    </div> : null}

    {history ? <div className="rounded-xl border border-[#e1e8e2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#527a4c]">Activity</p>
          <h3 className="mt-1 text-base font-semibold text-[#24352a]">Recent imports</h3>
        </div>
        <History className="h-5 w-5 text-[#527a4c]" />
      </div>
      {!history.length ? <p className="mt-4 rounded-lg bg-[#f7f9f7] px-4 py-8 text-center text-sm text-[#68756b]">No imports have been previewed yet.</p> : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#e1e8e2]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f5f8f5] text-xs text-[#68756b]">
              <tr><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Workbook</th><th className="px-3 py-3 font-semibold">Mode</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Imported / valid</th><th className="px-3 py-3 font-semibold">Action</th></tr>
            </thead>
            <tbody>{history.map((item) => <tr key={item.jobId} className="border-t border-[#edf1ed] hover:bg-[#fbfcfb]">
              <td className="whitespace-nowrap px-3 py-3 text-[#68756b]">{formatImportDate(item.createdAt)}</td>
              <td className="max-w-56 truncate px-3 py-3 font-medium text-[#24352a]" title={item.workbookName}>{item.workbookName}</td>
              <td className="px-3 py-3 text-[#68756b]">{item.mode} · {item.inventoryMode}</td>
              <td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f1f5f1] text-[#59665c]'}`}>{item.status}</span></td>
              <td className="px-3 py-3 font-medium text-[#24352a]">{item.importedRecords} / {item.validRecords}</td>
              <td className="px-3 py-3">
                {item.invalidRecords > 0 ? <button type="button" className="rounded-md px-2 py-1.5 text-xs font-semibold text-[#315b36] hover:bg-[#eaf2e8]"
                  disabled={busy !== ''} onClick={() => void downloadErrors(item.jobId)}>Download errors</button> : '—'}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div> : null}
  </section>;
}
