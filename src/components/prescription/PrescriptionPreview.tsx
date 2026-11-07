import { FileText, X } from 'lucide-react';

type PrescriptionPreviewProps = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  previewUrl?: string;
  onRemove: () => void;
  onReplace: () => void;
};

export default function PrescriptionPreview({ fileName, contentType, sizeBytes, previewUrl, onRemove, onReplace }: PrescriptionPreviewProps) {
  return (
    <div className="rounded-[24px] border border-cyan-400/30 bg-cyan-400/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-secondary)]">
            {previewUrl && contentType.startsWith('image/') ? <img src={previewUrl} alt="Prescription preview" className="h-full w-full object-cover" /> : <FileText className="h-6 w-6 text-cyan-300" />}
          </div>
          <div className="min-w-0"><p className="truncate font-semibold text-[var(--text-primary)]">{fileName}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{contentType} · {(sizeBytes / 1024 / 1024).toFixed(2)} MB</p></div>
        </div>
        <button type="button" onClick={onRemove} className="rounded-full border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)]" aria-label="Remove prescription preview"><X className="h-4 w-4" /></button>
      </div>
      {previewUrl && contentType === 'application/pdf' ? <iframe title="Prescription document preview" src={previewUrl} className="mt-4 h-72 w-full rounded-xl bg-white" /> : null}
      <p className="mt-4 text-sm text-cyan-200">Your document is stored privately and is only available to you and authorized administrators.</p>
      <div className="mt-4 flex gap-3"><button type="button" onClick={onReplace} className="rounded-full border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200">Replace</button><button type="button" onClick={onRemove} className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">Remove preview</button></div>
    </div>
  );
}
