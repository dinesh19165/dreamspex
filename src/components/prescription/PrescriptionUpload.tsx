import { UploadCloud } from 'lucide-react';
import type { DragEvent, ChangeEvent } from 'react';

type PrescriptionUploadProps = { onFile: (file: File) => void };

export default function PrescriptionUpload({ onFile }: PrescriptionUploadProps) {
  const accept = '.jpg,.jpeg,.png,.pdf';
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) onFile(file); };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onFile(file); };
  return <label onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/20 bg-[#151823] p-8 text-center transition hover:border-cyan-400/60 hover:bg-cyan-400/5"><UploadCloud className="h-10 w-10 text-cyan-300" /><p className="mt-4 text-lg font-semibold text-white">Upload prescription</p><p className="mt-2 text-sm text-slate-400">Drag & drop your prescription here or browse</p><span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#7CBF00] px-5 py-3 text-sm font-semibold text-white">Upload Prescription</span><p className="mt-4 text-xs text-slate-500">JPG, JPEG, PNG or PDF · Maximum 10 MB</p><input type="file" accept={accept} onChange={handleChange} className="sr-only" /></label>;
}