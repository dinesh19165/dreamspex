import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileHeart, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import PrescriptionUpload from '../components/prescription/PrescriptionUpload';
import PrescriptionPreview from '../components/prescription/PrescriptionPreview';
import PrescriptionForm from '../components/prescription/PrescriptionForm';
import PrescriptionSummary from '../components/prescription/PrescriptionSummary';
import PrescriptionTable from '../components/prescription/PrescriptionTable';
import LensSelector from '../components/lens/LensSelector';
import { catalogService, toProduct, type CatalogProduct } from '../services/catalogService';
import {
  prescriptionService,
  recognizePrescription,
  uploadPrescription,
  validatePrescriptionFile,
  type LensOption,
  type PrescriptionRecord,
  type PrescriptionUpload as UploadedPrescription,
  type PrescriptionValues,
} from '../services/prescriptionService';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/useAuth';
import type { LensSelection, Prescription } from '../types';
import { formatINR } from '../utils/currency';

const blankValues = (patientName = ''): PrescriptionValues => ({
  patientName, prescriptionDate: '', expiryDate: '', rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '',
  leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '', pd: '', rightPd: '', leftPd: '',
});

function fromRecord(record: PrescriptionRecord): PrescriptionValues {
  const text = (value: string | number | null) => value == null ? '' : String(value);
  return {
    patientName: record.patientName, prescriptionDate: record.prescriptionDate ?? '', expiryDate: record.expiryDate ?? '',
    rightSph: text(record.rightSph), rightCyl: text(record.rightCyl), rightAxis: text(record.rightAxis), rightAdd: text(record.rightAdd),
    leftSph: text(record.leftSph), leftCyl: text(record.leftCyl), leftAxis: text(record.leftAxis), leftAdd: text(record.leftAdd),
    pd: text(record.pd), rightPd: text(record.rightPd), leftPd: text(record.leftPd),
  };
}

function toPrescription(values: PrescriptionValues): Prescription {
  return {
    patientName: values.patientName, prescriptionDate: values.prescriptionDate, expiryDate: values.expiryDate,
    pd: values.pd, rightPd: values.rightPd, leftPd: values.leftPd,
    rightEye: { sph: values.rightSph, cyl: values.rightCyl, axis: values.rightAxis, add: values.rightAdd },
    leftEye: { sph: values.leftSph, cyl: values.leftCyl, axis: values.leftAxis, add: values.leftAdd },
  };
}

function validatePrescription(values: PrescriptionValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const checkNumber = (field: string, value: string, min: number, max: number, integer = false) => {
    if (!value.trim()) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
      errors[field] = `Enter a value between ${min} and ${max}${integer ? ' (whole number)' : ''}.`;
      return null;
    }
    return number;
  };
  if (!values.patientName.trim()) errors.patientName = 'Enter the patient name.';
  const rightCyl = checkNumber('rightEye.cyl', values.rightCyl, -15, 15);
  const leftCyl = checkNumber('leftEye.cyl', values.leftCyl, -15, 15);
  if (!values.rightSph.trim()) errors['rightEye.sph'] = 'Enter the right-eye SPH value.';
  if (!values.leftSph.trim()) errors['leftEye.sph'] = 'Enter the left-eye SPH value.';
  if (!values.rightCyl.trim()) errors['rightEye.cyl'] = 'Enter the right-eye CYL value (use 0 if none).';
  if (!values.leftCyl.trim()) errors['leftEye.cyl'] = 'Enter the left-eye CYL value (use 0 if none).';
  checkNumber('rightEye.sph', values.rightSph, -30, 30);
  checkNumber('leftEye.sph', values.leftSph, -30, 30);
  checkNumber('rightEye.add', values.rightAdd, -10, 10);
  checkNumber('leftEye.add', values.leftAdd, -10, 10);
  const rightAxis = checkNumber('rightEye.axis', values.rightAxis, 0, 180, true);
  const leftAxis = checkNumber('leftEye.axis', values.leftAxis, 0, 180, true);
  if (rightCyl != null && rightCyl !== 0 && rightAxis == null && !errors['rightEye.axis']) errors['rightEye.axis'] = 'Enter an AXIS when CYL is non-zero.';
  if (leftCyl != null && leftCyl !== 0 && leftAxis == null && !errors['leftEye.axis']) errors['leftEye.axis'] = 'Enter an AXIS when CYL is non-zero.';
  const pd = checkNumber('pd', values.pd, 20, 80);
  const rightPd = checkNumber('rightPd', values.rightPd ?? '', 10, 40);
  const leftPd = checkNumber('leftPd', values.leftPd ?? '', 10, 40);
  if (pd == null && (rightPd == null || leftPd == null)) errors.pd = 'Enter total PD or both right and left PD values.';
  if (values.prescriptionDate && Number.isNaN(Date.parse(values.prescriptionDate))) errors.prescriptionDate = 'Enter a valid prescription date.';
  if (values.expiryDate && Number.isNaN(Date.parse(values.expiryDate))) errors.expiryDate = 'Enter a valid expiry date.';
  if (values.prescriptionDate && values.expiryDate && values.expiryDate < values.prescriptionDate) errors.expiryDate = 'Expiry date cannot be before prescription date.';
  return errors;
}

function extractionFieldErrors(fields: string[]) {
  const fieldNames: Record<string, string> = {
    patientName: 'patientName',
    rightSph: 'rightEye.sph',
    rightCyl: 'rightEye.cyl',
    rightAxis: 'rightEye.axis',
    leftSph: 'leftEye.sph',
    leftCyl: 'leftEye.cyl',
    leftAxis: 'leftEye.axis',
    pd: 'pd',
  };
  return Object.fromEntries(fields.map((field) => [
    fieldNames[field] ?? field,
    field === 'pd'
      ? 'PD is missing or ambiguous. Enter total PD or both right and left PD values.'
      : 'Missing or uncertain; check the original document.',
  ]));
}

export default function PrescriptionPage() {
  const { productId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedVariantId = searchParams.get('variantId') ?? '';
  const { user } = useAuth();
  const { addConfiguredToCart, cartLoading } = useShop();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const [product, setProduct] = useState<CatalogProduct>();
  const [savedPrescriptions, setSavedPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [record, setRecord] = useState<PrescriptionRecord>();
  const [lensOptions, setLensOptions] = useState<LensOption[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [values, setValues] = useState<PrescriptionValues>(() => blankValues());
  const [uploaded, setUploaded] = useState<UploadedPrescription>();
  const [mode, setMode] = useState<'choice' | 'details'>('choice');
  const [step, setStep] = useState<'details' | 'review' | 'lens'>('details');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number }>();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([catalogService.get(productId), prescriptionService.list(productId)])
      .then(([nextProduct, prescriptions]) => {
        if (!active) return;
        setProduct(nextProduct);
        setSavedPrescriptions(prescriptions);
      })
      .catch((reason: unknown) => setPageError(reason instanceof Error ? reason.message : 'Unable to load prescription setup.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const mappedProduct = useMemo(() => product ? toProduct(product) : undefined, [product]);
  const selectedProduct = useMemo(() => {
    if (!mappedProduct) return undefined;
    const selectedVariant = product?.variants.find((variant) => variant.id === requestedVariantId)?.id;
    return { ...mappedProduct, variantId: requestedVariantId ? selectedVariant : mappedProduct.variantId };
  }, [mappedProduct, product, requestedVariantId]);
  const lensAdditionalPrice = useMemo(() => selectedCodes.reduce((sum, code) =>
    sum + (lensOptions.find((option) => option.code === code)?.additionalCost ?? 0), 0), [selectedCodes, lensOptions]);

  const ensureDraft = async (source: 'UPLOAD' | 'MANUAL' = 'MANUAL') => {
    if (record) return record;
    if (!product) throw new Error('The selected frame is not available.');
    const patientName = source === 'UPLOAD' ? '' : values.patientName || user?.name || '';
    const created = await prescriptionService.create({ ...values, patientName }, product.id);
    setRecord(created);
    setValues(fromRecord(created));
    setSavedPrescriptions((current) => [created, ...current]);
    setMode('details');
    setStep('details');
    return created;
  };

  const handleFile = async (file: File) => {
    setFileError('');
    setExtractionError('');
    setValues((current) => ({ ...current, patientName: '' }));
    try {
      validatePrescriptionFile(file);
      setBusy(true);
      const draft = await ensureDraft('UPLOAD');
      setUploadProgress(0);
      const savedFile = await uploadPrescription(file, draft.id, setUploadProgress);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = savedFile.previewUrl;
      setUploaded(savedFile);
      setMode('details');
      setStep('details');
      setOcrProgress({ status: file.type === 'application/pdf' ? 'Checking PDF text layer…' : 'Preparing local OCR…', progress: 0 });
      const recognized = await recognizePrescription(file, (status, progress) =>
        setOcrProgress({ status, progress }));
      const extracted = await prescriptionService.extract(draft.id, recognized.text, recognized.confidence);
      setRecord(extracted);
      setValues(fromRecord(extracted));
      setErrors(extractionFieldErrors(extracted.missingFields));
      setConfirmed(false);
      if (extracted.extractionStatus === 'LOW_CONFIDENCE') {
        setExtractionError('Some values are missing or unclear. Review every field and enter anything the document did not clearly show.');
      } else {
        setExtractionError(`Values extracted ${recognized.method === 'PDF_TEXT' ? 'from the PDF text layer' : 'from the document image'}. Verify them against your original prescription before confirming.`);
      }
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : 'Unable to process the prescription file.');
    } finally {
      setBusy(false);
      setUploadProgress(0);
      setOcrProgress(undefined);
    }
  };

  const startManual = async () => {
    setFileError('');
    try {
      setBusy(true);
      const draft = await ensureDraft();
      setRecord(draft);
      setValues((current) => ({ ...current, patientName: current.patientName || user?.name || '' }));
      setMode('details');
      setStep('details');
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : 'Unable to start manual entry.');
    } finally {
      setBusy(false);
    }
  };

  const resume = async (saved: PrescriptionRecord) => {
    setBusy(true);
    setFileError('');
    try {
      setRecord(saved);
      setValues(fromRecord(saved));
      setConfirmed(saved.customerConfirmed);
      setMode('details');
      setStep(saved.customerConfirmed ? 'lens' : 'details');
      const document = saved.files[0];
      if (document) {
        const previewUrl = await prescriptionService.document(document.id);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = previewUrl;
        setUploaded({ fileId: document.id, fileName: document.originalName, contentType: document.contentType, sizeBytes: document.sizeBytes, previewUrl });
      } else setUploaded(undefined);
      if (saved.customerConfirmed) {
        const options = await prescriptionService.recommendations(saved.id);
        setLensOptions(options);
        setSelectedCodes(saved.selectedLensCodes.filter((code) => options.some((option) => option.code === code)));
      } else setSelectedCodes(saved.selectedLensCodes);
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : 'Unable to resume this prescription.');
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    const nextErrors = validatePrescription(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    setPageError('');
    try {
      const draft = await ensureDraft();
      const updated = await prescriptionService.update(draft.id, values, product!.id, uploaded || draft.source === 'UPLOAD' ? 'UPLOAD' : 'MANUAL', false,
        draft.extractionStatus, draft.extractionConfidence);
      setRecord(updated);
      setValues(fromRecord(updated));
      setConfirmed(false);
      setStep('review');
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : 'Unable to save prescription values.');
    } finally {
      setBusy(false);
    }
  };

  const confirmPrescription = async () => {
    if (!record) return;
    const nextErrors = validatePrescription(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStep('details');
      return;
    }
    setBusy(true);
    setPageError('');
    try {
      const saved = await prescriptionService.update(record.id, values, product!.id, uploaded || record.source === 'UPLOAD' ? 'UPLOAD' : 'MANUAL', true,
        record.extractionStatus, record.extractionConfidence);
      setRecord(saved);
      setConfirmed(true);
      const options = await prescriptionService.recommendations(saved.id);
      setLensOptions(options);
      setSelectedCodes(saved.selectedLensCodes.length ? saved.selectedLensCodes : [
        options.find((option) => option.category === 'TYPE' && option.recommended && option.available && option.additionalCost != null)?.code
          ?? options.find((option) => option.category === 'TYPE' && option.available && option.additionalCost != null)?.code,
      ].filter((code): code is string => Boolean(code)));
      setStep('lens');
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : 'Prescription could not be confirmed.');
    } finally {
      setBusy(false);
    }
  };

  const addToCart = async () => {
    if (!record || !selectedProduct || !product) return;
    setBusy(true);
    setPageError('');
    try {
      const currentOptions = await prescriptionService.recommendations(record.id);
      setLensOptions(currentOptions);
      const currentCodes = selectedCodes.filter((code) => currentOptions.some((option) => option.code === code));
      if (currentCodes.length !== selectedCodes.length) {
        setSelectedCodes(currentCodes);
        throw new Error('A selected lens is no longer available. Review your selection and try again.');
      }
      const configuredOptions = currentOptions.filter((option) => currentCodes.includes(option.code));
      const currentLens: LensSelection = {
        type: configuredOptions.find((option) => option.category === 'TYPE')?.name ?? '',
        material: configuredOptions.find((option) => option.category === 'MATERIAL')?.name ?? '',
        coatings: configuredOptions.filter((option) => option.category === 'COATING').map((option) => option.name),
        additionalPrice: configuredOptions.reduce((sum, option) => sum + (option.additionalCost ?? 0), 0),
        codes: currentCodes,
      };
      const saved = await prescriptionService.saveLenses(record.id, currentCodes);
      setRecord(saved);
      await addConfiguredToCart(selectedProduct, currentLens, saved.id);
      navigate('/cart');
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : 'Unable to add this lens configuration to your cart.');
    } finally {
      setBusy(false);
    }
  };

  const viewPrescription = toPrescription(values);
  const loadingOcr = Boolean(ocrProgress);
  const hasLensType = selectedCodes.some((code) => lensOptions.some((option) => option.code === code && option.category === 'TYPE'));
  const activeRecordId = record?.id;

  useEffect(() => {
    if (step !== 'lens' || !activeRecordId) return;
    let active = true;
    const refreshOptions = async () => {
      try {
        const options = await prescriptionService.recommendations(activeRecordId);
        if (!active) return;
        setLensOptions(options);
        setSelectedCodes((current) => current.filter((code) => options.some((option) => option.code === code)));
      } catch (reason) {
        if (active) setPageError(reason instanceof Error ? reason.message : 'Unable to refresh lens options.');
      }
    };
    window.addEventListener('focus', refreshOptions);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshOptions);
    };
  }, [activeRecordId, step]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Prescription lenses" title="Add Your Prescription" description="Upload your prescription or enter your lens power details manually." />
        {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading selected frame and saved prescriptions…</p> : null}
        {pageError ? <p role="alert" className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">{pageError}</p> : null}
        {!loading && product && selectedProduct ? <div className="mt-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="h-fit rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Selected frame</p>
            <img src={selectedProduct.image} alt={selectedProduct.name} className="mt-5 aspect-[4/3] w-full rounded-[20px] object-cover" />
            <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">{selectedProduct.name}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{selectedProduct.brand} · {selectedProduct.category}</p>
            <p className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{formatINR(selectedProduct.price)}</p>
            <div className="mt-6 flex items-start gap-3 border-t border-[var(--border-subtle)] pt-5 text-xs leading-5 text-[var(--text-secondary)]"><ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />Documents are stored privately and are not sent to an external OCR service.</div>
          </aside>
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]"><span className={mode === 'choice' || step === 'details' ? 'text-cyan-300' : ''}>1. Add prescription</span><span>→</span><span className={step === 'review' ? 'text-cyan-300' : ''}>2. Review</span><span>→</span><span className={step === 'lens' ? 'text-cyan-300' : ''}>3. Lens selection</span></div>
            {mode === 'choice' ? <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div><PrescriptionUpload onFile={(file) => void handleFile(file)} />{fileError ? <p role="alert" className="mt-3 text-sm text-red-300">{fileError}</p> : null}</div>
                <button type="button" disabled={busy} onClick={() => void startManual()} className="flex min-h-56 flex-col items-center justify-center rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 text-center transition hover:border-cyan-400/60 disabled:opacity-50"><FileHeart className="h-10 w-10 text-cyan-300" /><span className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Enter Prescription Manually</span><span className="mt-2 text-sm text-[var(--text-secondary)]">Enter OD, OS, and PD values</span></button>
              </div>
              {savedPrescriptions.length ? <div className="mt-8 border-t border-[var(--border-subtle)] pt-6"><h2 className="font-semibold">Resume a saved prescription</h2><div className="mt-3 space-y-2">{savedPrescriptions.map((saved) => <button key={saved.id} type="button" disabled={busy} onClick={() => void resume(saved)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-left"><span><span className="block font-medium">{saved.source === 'UPLOAD' ? 'Uploaded document' : 'Manual entry'}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">{saved.status} · {saved.prescriptionDate ?? 'No prescription date'}</span></span><span className="text-sm text-cyan-200">Resume</span></button>)}</div></div> : null}
            </> : null}

            {mode === 'details' && step === 'details' ? <div className="mt-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Prescription Details</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">OD means right eye. OS means left eye. Positive and negative values are supported.</p></div><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200">{uploaded ? 'Replace document' : 'Upload document'}</button></div>
              {uploaded ? <div className="mb-6"><PrescriptionPreview fileName={uploaded.fileName} contentType={uploaded.contentType} sizeBytes={uploaded.sizeBytes} previewUrl={uploaded.previewUrl} onRemove={() => setUploaded(undefined)} onReplace={() => fileInputRef.current?.click()} /></div> : null}
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.currentTarget.value = ''; }} className="sr-only" />
              {uploadProgress ? <div className="mb-4" role="status"><p className="text-sm text-[var(--text-secondary)]">Uploading document… {uploadProgress}%</p><progress value={uploadProgress} max="100" className="mt-2 w-full accent-cyan-400" /></div> : null}
              {loadingOcr ? <div className="mb-5 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4" role="status"><div className="flex items-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" /><span>Processing document locally: {ocrProgress?.status}</span></div><progress value={Math.round((ocrProgress?.progress ?? 0) * 100)} max="100" className="mt-3 w-full accent-cyan-400" /></div> : null}
              {fileError ? <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{fileError}</p> : null}
              {extractionError ? <p role="status" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{extractionError}</p> : null}
              <PrescriptionForm value={viewPrescription} errors={errors} onChange={(next) => {
                const rightPd = next.rightPd ?? '';
                const leftPd = next.leftPd ?? '';
                const totalPd = rightPd.trim() && leftPd.trim()
                  ? String(Number(rightPd) + Number(leftPd))
                  : next.pd;
                setValues({
                  ...values, patientName: next.patientName ?? '', prescriptionDate: next.prescriptionDate ?? '', expiryDate: next.expiryDate ?? '',
                  rightSph: next.rightEye.sph, rightCyl: next.rightEye.cyl, rightAxis: next.rightEye.axis, rightAdd: next.rightEye.add,
                  leftSph: next.leftEye.sph, leftCyl: next.leftEye.cyl, leftAxis: next.leftEye.axis, leftAdd: next.leftEye.add,
                  pd: totalPd, rightPd, leftPd,
                });
                setConfirmed(false);
              }} />
              <Button fullWidth className="mt-8" disabled={busy || loadingOcr} onClick={() => void saveDetails()}>{busy ? 'Saving…' : 'Review Prescription'}</Button>
            </div> : null}

            {mode === 'details' && step === 'review' ? <div className="mt-8 space-y-6">
              <div><h2 className="text-2xl font-semibold">Review Your Prescription</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Check each value against the original document. Missing information must be entered before continuing.</p></div>
              <PrescriptionSummary prescription={viewPrescription} />
              {uploaded ? <PrescriptionPreview fileName={uploaded.fileName} contentType={uploaded.contentType} sizeBytes={uploaded.sizeBytes} previewUrl={uploaded.previewUrl} onRemove={() => setUploaded(undefined)} onReplace={() => fileInputRef.current?.click()} /> : null}
              <p className="text-sm text-[var(--text-secondary)]">Selected frame: <span className="font-semibold text-[var(--text-primary)]">{selectedProduct.name}</span> · {formatINR(selectedProduct.price)}</p>
              <button type="button" onClick={() => { setStep('details'); setConfirmed(false); }} className="text-sm font-semibold text-cyan-300">Edit Prescription</button>
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[#7CBF00]" />I confirm that these prescription details match the original document or my manual entry.</label>
              <Button fullWidth disabled={!confirmed || busy} onClick={() => void confirmPrescription()}>{busy ? 'Confirming…' : 'Confirm and Continue'}</Button>
            </div> : null}

            {mode === 'details' && step === 'lens' ? <div className="mt-8 space-y-8">
              <div><h2 className="text-2xl font-semibold">Lens Selection</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Compare available options. Suggestions are not a prescription; consult an optician for complex needs.</p></div>
              <PrescriptionTable prescription={viewPrescription} />
              {lensOptions.length ? <LensSelector options={lensOptions} selectedCodes={selectedCodes} onChange={setSelectedCodes} /> : <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Lens options are not configured yet. Contact Dream Spex to continue.</p>}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5"><div><p className="text-sm text-[var(--text-secondary)]">Additional lens cost</p><p className="mt-1 text-2xl font-semibold">+{formatINR(lensAdditionalPrice)}</p></div><Button disabled={!hasLensType || busy || cartLoading} onClick={() => void addToCart()}>{busy || cartLoading ? 'Adding…' : <><Check className="mr-2 h-4 w-4" />Add to Cart</>}</Button></div>
            </div> : null}
          </section>
        </div> : null}
        {!loading && !product ? <p role="alert" className="mt-8 text-center text-sm text-red-300">{pageError || 'The selected frame could not be found.'}</p> : null}
      </main>
      <Footer />
    </div>
  );
}
