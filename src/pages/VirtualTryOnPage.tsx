import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CircleAlert, RotateCcw, Upload, Video } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import TryOnControls from '../components/virtualTryOn/TryOnControls';
import TryOnPreview from '../components/virtualTryOn/TryOnPreview';
import { products } from '../data/mockData';
import { useShop } from '../context/ShopContext';
import { useFaceLandmarks } from '../hooks/useFaceLandmarks';
import { getTryOnAsset } from '../services/virtualTryOnService';
import type { TryOnControls as Controls, TryOnState } from '../types/virtualTryOn';

const initialControls: Controls = { scale: 1, offsetY: 0, rotation: 0 };

export default function VirtualTryOnPage() {
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [cameraState, setCameraState] = useState<TryOnState>('idle');
  const [selectedFrame, setSelectedFrame] = useState(() => Math.max(0, products.findIndex((product) => product.id === Number(searchParams.get('productId')))));
  const [controls, setControls] = useState<Controls>(initialControls);
  const [imageUrl, setImageUrl] = useState<string>();
  const [captureUrl, setCaptureUrl] = useState<string>();
  const debug = searchParams.get('debug') === '1';
  const { addToCart } = useShop();
  const { landmarks, loading: detectionLoading, failed: detectionFailed, detectUploadedImage } = useFaceLandmarks(videoElement, cameraState === 'ready' && !imageUrl);
  const selectedProduct = products[selectedFrame];
  const selectedAsset = getTryOnAsset(selectedProduct);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVideoElement(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);
  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    setCameraState('loading-camera');
    setImageUrl(undefined);
    if (captureUrl) {
      URL.revokeObjectURL(captureUrl);
      setCaptureUrl(undefined);
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoElement(videoRef.current);
      }
      setCameraState('ready');
    } catch {
      setCameraState('denied');
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !['image/jpeg', 'image/png'].includes(file.type)) return;
    stopCamera();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setCaptureUrl(undefined);
    setCameraState('loading-detection');
  };

  const handleImageLoad = useCallback((image: HTMLImageElement) => {
    void detectUploadedImage(image).then(() => setCameraState('ready'));
  }, [detectUploadedImage]);

  const takePhoto = async () => {
    if (!landmarks || !selectedAsset) return;
    const source = imageUrl ? document.querySelector<HTMLImageElement>('img[alt="Uploaded try-on"]') : videoRef.current;
    if (!source) return;
    const width = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
    const height = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;
    if (!width || !height) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(source, 0, 0, width, height);
    const frameImage = new Image();
    frameImage.src = selectedAsset.src;
    await new Promise<void>((resolve) => { frameImage.onload = () => resolve(); frameImage.onerror = () => resolve(); });
    const frameWidth = landmarks.eyeDistance * width * 1.7 * controls.scale;
    const frameHeight = frameWidth * (selectedAsset.height / selectedAsset.width);
    context.save();
    context.translate(landmarks.eyeCenter.x * width, (landmarks.eyeCenter.y + controls.offsetY) * height);
    context.rotate((landmarks.rotation + controls.rotation) * Math.PI / 180);
    context.drawImage(frameImage, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
    context.restore();
    setCaptureUrl(canvas.toDataURL('image/png'));
  };

  const tryAnother = () => {
    setCaptureUrl(undefined);
    setControls(initialControls);
  };

  const statusText = cameraState === 'loading-camera' ? 'Starting camera...' : cameraState === 'loading-detection' || detectionLoading ? 'Detecting your face...' : landmarks ? 'Try on your selected frame' : 'Choose a frame, then allow camera or upload a photo.';

  return <div className="min-h-screen bg-[#050816] text-slate-100"><Navbar /><main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><SectionTitle eyebrow="Virtual try-on" title="Find the frame that feels like you" description="Try selected frames on your face with live tracking or an uploaded photo." /><div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]"><section><div className="relative"><TryOnPreview videoRef={videoRef} imageUrl={imageUrl} landmarks={landmarks} frame={selectedAsset} controls={controls} debug={debug} onImageLoad={handleImageLoad} />{!imageUrl && cameraState !== 'ready' ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center"><Video className="h-10 w-10 text-cyan-300" />{cameraState === 'denied' ? <><p className="text-lg font-semibold text-white">Camera access is required for Virtual Try-On.</p><p className="max-w-md text-sm text-slate-400">Allow camera access to place the selected frame on your face.</p></> : cameraState === 'unavailable' ? <p className="text-lg font-semibold text-white">Camera is unavailable on this device.</p> : <p className="text-lg font-semibold text-white">{statusText}</p>}</div> : null}{cameraState === 'failed' || detectionFailed ? <div className="absolute inset-x-4 bottom-4 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-slate-950/90 p-4 text-sm text-slate-300"><CircleAlert className="h-5 w-5 shrink-0 text-amber-300" /><div><p className="font-semibold text-white">We couldn't detect your face clearly.</p><p className="mt-1">Face the camera directly, improve lighting, remove anything covering your eyes, or move slightly closer.</p></div></div> : null}</div><div className="mt-4 flex flex-wrap gap-3"><Button onClick={requestCamera}><Camera className="mr-2 h-4 w-4" />{cameraState === 'denied' ? 'Allow Camera Access' : 'Start Camera'}</Button><Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload a Photo</Button><input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleUpload} className="sr-only" />{landmarks ? <Button variant="ghost" onClick={takePhoto}>Take Photo</Button> : null}</div></section><aside className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Choose a frame</p><div className="mt-5 space-y-3">{products.map((product, index) => <button key={product.id} onClick={() => { setSelectedFrame(index); setControls(initialControls); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selectedFrame === index ? 'border-[#7CBF00] bg-[#7CBF00]/10' : 'border-white/10 bg-slate-950/50'}`}><img src={product.image} alt="" className="h-12 w-12 rounded-xl object-cover" /><span className="text-sm font-semibold text-white">{selectedFrame === index ? '✓ ' : ''}{product.name}</span></button>)}</div>{!selectedAsset ? <p className="mt-4 text-sm text-slate-400">Virtual try-on unavailable for this frame.</p> : null}<div className="mt-6 grid gap-3"><TryOnControls controls={controls} onChange={setControls} onReset={() => setControls(initialControls)} /><button type="button" onClick={tryAnother} className="inline-flex items-center gap-2 text-sm font-semibold text-[#9ACD32]"><RotateCcw className="h-4 w-4" />Try Again</button><div className="grid gap-3 sm:grid-cols-2"><Link to={`/product/${selectedProduct.id}`} className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200">View Product</Link><Button onClick={() => addToCart(selectedProduct)} fullWidth>Add to Cart</Button><Link to={`/prescription/${selectedProduct.id}`} className="inline-flex items-center justify-center rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-white sm:col-span-2">Choose Prescription &amp; Lenses</Link></div></div></aside></div>{captureUrl ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03050c]/85 px-4 py-8 backdrop-blur-xl"><div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07101f] p-6"><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Try-On Preview</p><img src={captureUrl} alt="Try-On Preview" className="mt-5 max-h-[65vh] w-full rounded-[20px] object-contain" /><div className="mt-5 flex flex-wrap justify-end gap-3"><Button variant="ghost" onClick={() => setCaptureUrl(undefined)}>Try Again</Button><a href={captureUrl} download="dream-spex-try-on.png" className="inline-flex items-center justify-center rounded-full bg-[#7CBF00] px-5 py-3 text-sm font-semibold text-white">Save / Continue</a><Link to={`/product/${selectedProduct.id}`} className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200">View Product</Link></div></div></div> : null}</main><Footer /></div>;
}
