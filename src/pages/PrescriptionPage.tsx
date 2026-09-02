import { useRef, useState } from 'react';
import { Check, FileHeart, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import PrescriptionUpload from '../components/prescription/PrescriptionUpload';
import PrescriptionPreview from '../components/prescription/PrescriptionPreview';
import PrescriptionForm from '../components/prescription/PrescriptionForm';
import PrescriptionSummary from '../components/prescription/PrescriptionSummary';
import LensSelector from '../components/lens/LensSelector';
import { uploadPrescription, type PrescriptionUpload as UploadedPrescription } from '../services/prescriptionService';
import { products } from '../data/mockData';
import { useShop } from '../context/ShopContext';
import type { LensSelection, Prescription } from '../types';

const blankEye = { sph: '', cyl: '', axis: '', add: '' };
const blankPrescription: Prescription = { rightEye: { ...blankEye }, leftEye: { ...blankEye }, pd: '', prescriptionDate: '02 Sep 2026' };
const defaultLens: LensSelection = { type: 'Standard Lens', material: 'Standard', coatings: [], additionalPrice: 0 };

function validatePrescription(value: Prescription): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const eye of ['rightEye', 'leftEye'] as const) {
    const axis = value[eye].axis;
    if (axis && (!Number.isFinite(Number(axis)) || Number(axis) < 0 || Number(axis) > 180)) errors[`${eye}.axis`] = 'Please enter a valid axis between 0° and 180°.';
  }
  if (!value.pd || !Number.isFinite(Number(value.pd)) || Number(value.pd) <= 0) errors.pd = 'Please enter a valid PD.';
  return errors;
}

export default function PrescriptionPage() {
  const { productId } = useParams();
  const product = products.find((item) => item.id === Number(productId)) ?? products[0];
  const { addConfiguredToCart } = useShop();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'choice' | 'details'>('choice');
  const [step, setStep] = useState<'details' | 'review' | 'lens'>('details');
  const [prescription, setPrescription] = useState<Prescription>(blankPrescription);
  const [lensSelection, setLensSelection] = useState<LensSelection>(defaultLens);
  const [uploaded, setUploaded] = useState<UploadedPrescription | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleFile = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setFileError('Please choose a JPG, JPEG, PNG, or PDF file under 10 MB.');
      return;
    }
    setFileError('');
    setUploaded(await uploadPrescription(file));
    setMode('details');
  };

  const continueFromDetails = () => {
    const nextErrors = validatePrescription(prescription);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep('review');
  };

  const addToCart = () => {
    addConfiguredToCart(product, prescription, lensSelection);
    navigate('/cart');
  };

  return <div className="min-h-screen bg-[#050816] text-slate-100"><Navbar /><main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><SectionTitle eyebrow="Prescription lenses" title="Add Your Prescription" description="Upload your prescription or enter your lens power details manually." /><div className="mt-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]"><aside className="h-fit rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Selected frame</p><img src={product.image} alt={product.name} className="mt-5 aspect-[4/3] w-full rounded-[20px] object-cover" /><h2 className="mt-5 text-xl font-semibold text-white">{product.name}</h2><p className="mt-2 text-sm text-slate-400">{product.brand} · {product.category}</p><p className="mt-4 text-2xl font-semibold text-white">${product.price}</p><div className="mt-6 flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />Your prescription is used only to prepare your selected lenses.</div></aside><section className="rounded-[28px] border border-white/10 bg-white/5 p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500"><span className={mode === 'choice' ? 'text-cyan-300' : ''}>1. Add prescription</span><span>→</span><span className={step === 'review' ? 'text-cyan-300' : ''}>2. Review</span><span>→</span><span className={step === 'lens' ? 'text-cyan-300' : ''}>3. Lens selection</span></div>{mode === 'choice' ? <div className="mt-10 grid gap-4 sm:grid-cols-2"><div><PrescriptionUpload onFile={handleFile} />{fileError ? <p className="mt-3 text-sm text-red-300">{fileError}</p> : null}</div><button onClick={() => { setMode('details'); setStep('details'); }} className="flex min-h-56 flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#1B1F2B] p-8 text-center transition hover:border-cyan-400/60"><FileHeart className="h-10 w-10 text-cyan-300" /><span className="mt-4 text-lg font-semibold text-white">Enter Prescription Manually</span><span className="mt-2 text-sm text-slate-400">Enter your OD, OS, and PD values</span></button></div> : null}{mode === 'details' && step === 'details' ? <div className="mt-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold text-white">Prescription Details</h2><p className="mt-2 text-sm text-slate-400">OD means right eye. OS means left eye.</p></div>{uploaded ? <button onClick={() => fileInputRef.current?.click()} className="rounded-full border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200">Edit Prescription</button> : null}</div>{uploaded ? <div className="mb-6"><PrescriptionPreview file={uploaded.file} previewUrl={uploaded.previewUrl} onRemove={() => setUploaded(undefined)} onReplace={() => fileInputRef.current?.click()} /><input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} className="sr-only" /></div> : null}<PrescriptionForm value={prescription} errors={errors} onChange={setPrescription} /><Button fullWidth className="mt-8" onClick={continueFromDetails}>Save Prescription</Button></div> : null}{step === 'review' ? <div className="mt-8 space-y-6"><div><h2 className="text-2xl font-semibold text-white">Review Your Prescription</h2><p className="mt-2 text-sm text-slate-400">Prescription uploaded. Please review the details below.</p></div><PrescriptionSummary prescription={prescription} /><button onClick={() => setStep('details')} className="text-sm font-semibold text-cyan-300">Edit Prescription</button><label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1B1F2B] p-4 text-sm text-slate-300"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[#7CBF00]" />I confirm that the prescription details entered above are correct.</label><Button fullWidth disabled={!confirmed} onClick={() => setStep('lens')}>Continue to Lens Selection</Button></div> : null}{step === 'lens' ? <div className="mt-8 space-y-8"><div><h2 className="text-2xl font-semibold text-white">Lens Selection</h2><p className="mt-2 text-sm text-slate-400">Choose the material and coatings for your selected frame.</p></div><LensSelector value={lensSelection} onChange={setLensSelection} /><div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5"><div><p className="text-sm text-slate-300">Additional lens price</p><p className="mt-1 text-2xl font-semibold text-white">+${lensSelection.additionalPrice}</p></div><Button onClick={addToCart}><Check className="mr-2 h-4 w-4" />Add to Cart</Button></div></div> : null}</section></div></main><Footer /></div>;
}
