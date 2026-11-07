import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CircleAlert, LoaderCircle, RotateCcw, ShoppingBag, Upload, Video, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import TryOnControls from '../components/virtualTryOn/TryOnControls';
import TryOnPreview from '../components/virtualTryOn/TryOnPreview';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/useAuth';
import { catalogService, toProduct, type CatalogProduct } from '../services/catalogService';
import { resolveCmsMediaUrl } from '../config/api';
import { formatINR } from '../utils/currency';
import { useFaceLandmarks } from '../hooks/useFaceLandmarks';
import type { TryOnControls as Controls, TryOnFrame, TryOnState } from '../types/virtualTryOn';

const initialControls: Controls = { scale: 1, offsetY: 0, rotation: 0 };
const maxPhotoSize = 10 * 1024 * 1024;
const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const catalogueFrameOverlay = '/assets/try-on/catalogue-frame.svg';

type TryOnProduct = {
  catalog: CatalogProduct;
  product: ReturnType<typeof toProduct>;
};

function isEyewearProduct(product: CatalogProduct) {
  const productDetails = `${product.name} ${product.categories.map((category) => category.name).join(' ')}`;
  return product.status.toUpperCase() === 'PUBLISHED'
    && product.images.some((image) => Boolean(image.imageUrl))
    && !/contact\s*lenses?/i.test(productDetails)
    && (Boolean(product.frameShape || product.frameType) || /eyewear|eyeglasses|glasses|spectacles|sunglasses|frames?/i.test(productDetails));
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied. Allow camera access in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'No compatible camera was found. Connect a camera or upload a photo instead.';
  return 'The camera could not be started. Check that it is connected and not being used by another app.';
}

export default function VirtualTryOnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestId = useRef(0);
  const photoRequestId = useRef(0);
  const uploadedImageRef = useRef<HTMLImageElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [cameraState, setCameraState] = useState<TryOnState>('idle');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [products, setProducts] = useState<TryOnProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(searchParams.get('productId') ?? '');
  const [controls, setControls] = useState<Controls>(initialControls);
  const [imageUrl, setImageUrl] = useState<string>();
  const [captureUrl, setCaptureUrl] = useState<string>();
  const [mediaAspectRatio, setMediaAspectRatio] = useState('16 / 9');
  const [pageError, setPageError] = useState('');
  const [frameImageError, setFrameImageError] = useState(false);
  const [cartActionError, setCartActionError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const debug = searchParams.get('debug') === '1';
  const { addToCart, cartLoading, cartNotice, cartError } = useShop();
  const { role } = useAuth();
  const {
    landmarks,
    loading: detectionLoading,
    failed: detectionFailed,
    error: detectionError,
    detectUploadedImage,
    resetLandmarks,
  } = useFaceLandmarks(videoElement, cameraState === 'ready' && !imageUrl);
  const selectedEntry = products.find((entry) => entry.catalog.id === selectedProductId) ?? products[0];
  const selectedProduct = selectedEntry?.product;
  const tryOnImageUrl = resolveCmsMediaUrl(selectedEntry?.catalog.tryOnImageUrl);
  const selectedFrame: TryOnFrame | undefined = selectedProduct?.image
    ? { src: tryOnImageUrl ?? catalogueFrameOverlay, fallbackSrc: tryOnImageUrl ? catalogueFrameOverlay : selectedProduct.image }
    : undefined;
  const canAddToCart = Boolean(selectedProduct?.variantId && selectedProduct.stock !== 'Out of Stock');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: '0', pageSize: '100', sort: 'newest' });
    setProductsLoading(true);
    setProductsError('');
    void catalogService.search(params)
      .then((response) => {
        if (cancelled) return;
        const nextProducts = response.items
          .filter(isEyewearProduct)
          .map((catalog) => {
            const resolvedCatalog = {
              ...catalog,
              tryOnImageUrl: resolveCmsMediaUrl(catalog.tryOnImageUrl),
            };
            const product = toProduct(resolvedCatalog);
            return {
              catalog: resolvedCatalog,
              product: { ...product, image: resolveCmsMediaUrl(product.image) ?? product.image },
            };
          })
          .filter((entry) => Boolean(entry.product.image));
        setProducts(nextProducts);
        setSelectedProductId((current) => nextProducts.find((entry) => (
          entry.catalog.id === current
          || entry.product.backendId === current
          || String(entry.product.id) === current
        ))?.catalog.id ?? nextProducts[0]?.catalog.id ?? '');
      })
      .catch((reason: unknown) => {
        if (!cancelled) setProductsError(reason instanceof Error ? reason.message : 'Unable to load eyewear products.');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestId.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVideoElement(null);
  }, []);

  useEffect(() => () => {
    cameraRequestId.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (imageUrl) return () => URL.revokeObjectURL(imageUrl);
    return undefined;
  }, [imageUrl]);

  useEffect(() => {
    if (captureUrl) return () => URL.revokeObjectURL(captureUrl);
    return undefined;
  }, [captureUrl]);

  const requestCamera = async () => {
    photoRequestId.current += 1;
    setPageError('');
    setCameraError('');
    setActiveTab('camera');
    stopCamera();
    resetLandmarks();
    setImageUrl(undefined);
    uploadedImageRef.current = null;
    setCaptureUrl(undefined);
    setMediaAspectRatio('16 / 9');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setCameraError('Camera access requires HTTPS or localhost and a browser with camera support.');
      return;
    }

    setCameraState('loading-camera');
    const requestId = ++cameraRequestId.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (requestId !== cameraRequestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        setCameraState('failed');
        setCameraError('The camera preview could not be initialized. Please try again.');
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (requestId !== cameraRequestId.current) return;
      setVideoElement(video);
      setCameraState('ready');
    } catch (reason) {
      if (requestId !== cameraRequestId.current) return;
      stopCamera();
      const denied = reason instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(reason.name);
      const unavailable = reason instanceof DOMException && ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].includes(reason.name);
      setCameraState(denied ? 'denied' : unavailable ? 'unavailable' : 'failed');
      setCameraError(cameraErrorMessage(reason));
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!allowedPhotoTypes.has(file.type) || file.size > maxPhotoSize) {
      setPageError('Choose a JPG, PNG, or WEBP photo no larger than 10 MB.');
      return;
    }
    photoRequestId.current += 1;
    stopCamera();
    resetLandmarks();
    setCameraError('');
    setPageError('');
    setCaptureUrl(undefined);
    setMediaAspectRatio('16 / 9');
    setImageUrl(URL.createObjectURL(file));
    setCameraState('loading-detection');
  };

  const handleImageLoad = useCallback((image: HTMLImageElement) => {
    if (image.src !== imageUrl || uploadedImageRef.current === image) return;
    uploadedImageRef.current = image;
    setMediaAspectRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
    const requestId = photoRequestId.current;
    void detectUploadedImage(image).then(() => {
      if (requestId === photoRequestId.current && uploadedImageRef.current === image) setCameraState('ready');
    });
  }, [detectUploadedImage, imageUrl]);

  const handleImageError = useCallback(() => {
    photoRequestId.current += 1;
    uploadedImageRef.current = null;
    setCameraState('failed');
    setPageError('This image could not be opened. Choose a valid JPG, PNG, or WEBP photo.');
    resetLandmarks();
  }, [resetLandmarks]);

  const handleVideoMetadata = useCallback((width: number, height: number) => {
    if (width > 0 && height > 0) setMediaAspectRatio(`${width} / ${height}`);
  }, []);

  const removePhoto = () => {
    photoRequestId.current += 1;
    setImageUrl(undefined);
    uploadedImageRef.current = null;
    setCaptureUrl(undefined);
    setMediaAspectRatio('16 / 9');
    setCameraState('idle');
    setPageError('');
    resetLandmarks();
  };

  const selectTab = (tab: 'camera' | 'upload') => {
    setActiveTab(tab);
    setCameraError('');
    if (tab === 'upload') {
      stopCamera();
      setCameraState(imageUrl ? 'ready' : 'idle');
      if (!imageUrl) {
        setMediaAspectRatio('16 / 9');
        resetLandmarks();
      }
    } else if (imageUrl) {
      photoRequestId.current += 1;
      setImageUrl(undefined);
      uploadedImageRef.current = null;
      setCaptureUrl(undefined);
      setMediaAspectRatio('16 / 9');
      setCameraState('idle');
      resetLandmarks();
    }
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !canAddToCart) return;
    if (role !== 'CUSTOMER') {
      navigate('/login');
      return;
    }
    setCartActionError('');
    try {
      await addToCart(selectedProduct);
    } catch (reason) {
      setCartActionError(reason instanceof Error ? reason.message : 'Unable to add this frame to your cart.');
    }
  };

  const takePhoto = async () => {
    if (!landmarks || !selectedFrame) return;
    const source = imageUrl ? uploadedImageRef.current : videoRef.current;
    if (!source) return;
    const width = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
    const height = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;
    if (!width || !height) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      setPageError('Your browser could not create a try-on photo.');
      return;
    }
    try {
      context.drawImage(source, 0, 0, width, height);
      const loadFrameImage = async (src: string) => {
        const frameImage = new Image();
        frameImage.crossOrigin = 'anonymous';
        frameImage.src = src;
        await frameImage.decode();
        return frameImage;
      };
      let frameImage: HTMLImageElement;
      try {
        frameImage = await loadFrameImage(selectedFrame.src);
      } catch (error) {
        if (!selectedFrame.fallbackSrc) throw error;
        frameImage = await loadFrameImage(selectedFrame.fallbackSrc);
      }
      const frameWidth = Math.min(width, landmarks.eyeDistance * width * 2.35 * controls.scale);
      const frameHeight = frameWidth * frameImage.naturalHeight / frameImage.naturalWidth;
      context.save();
      context.translate(landmarks.eyeCenter.x * width, (landmarks.eyeCenter.y + controls.offsetY) * height);
      context.rotate((landmarks.rotation + controls.rotation) * Math.PI / 180);
      context.drawImage(frameImage, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
      context.restore();
      setPageError('');
      setCaptureUrl(canvas.toDataURL('image/png'));
    } catch {
      setPageError('Your browser could not save this preview. You can still try on and view the selected product.');
    }
  };

  const statusText = productsLoading
    ? 'Loading published eyewear...'
    : cameraState === 'loading-camera'
      ? 'Starting camera...'
      : cameraState === 'loading-detection' || detectionLoading
        ? 'Detecting your face...'
        : landmarks
          ? 'Try on your selected frame'
          : cameraState === 'ready'
            ? 'Position your face in view to try on a frame.'
            : 'Start your camera or upload a photo to begin.';
  const noFaceDetected = detectionFailed && !detectionLoading;

  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <SectionTitle eyebrow="Virtual try-on" title="Find the frame that feels like you" description="Try real Dream Spex frames on with live face tracking or a photo on your device." />
      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
        <section className="min-w-0">
          <div className="mb-4 flex w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1" role="tablist" aria-label="Try-on method">
            <button type="button" role="tab" aria-selected={activeTab === 'camera'} onClick={() => selectTab('camera')} className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'camera' ? 'bg-[var(--brand-green)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}><Camera className="h-4 w-4" />Camera</button>
            <button type="button" role="tab" aria-selected={activeTab === 'upload'} onClick={() => selectTab('upload')} className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'upload' ? 'bg-[var(--brand-green)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}><Upload className="h-4 w-4" />Upload photo</button>
          </div>

          <div className="relative">
            <TryOnPreview
              videoRef={videoRef}
              imageUrl={imageUrl}
              landmarks={landmarks}
              frame={selectedFrame}
              controls={controls}
              debug={debug}
              onFrameImageError={() => setFrameImageError(true)}
              onImageLoad={handleImageLoad}
              onImageError={handleImageError}
              onVideoMetadata={handleVideoMetadata}
              aspectRatio={mediaAspectRatio}
            />
            {!imageUrl && cameraState !== 'ready' ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)]/95 p-6 text-center sm:gap-4 sm:p-8">
              {cameraState === 'loading-camera' || productsLoading ? <LoaderCircle className="h-10 w-10 animate-spin text-cyan-300" /> : <Video className="h-10 w-10 text-cyan-300" />}
              <p className="text-lg font-semibold text-[var(--text-primary)]">{cameraError || statusText}</p>
              {cameraError ? <p className="max-w-md text-sm text-[var(--text-secondary)]">You can also switch to Upload photo to try on a picture from this device.</p> : null}
            </div> : null}
            {cameraState === 'loading-detection' || detectionLoading ? <div role="status" className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-black/70 px-4 py-3 text-sm text-white sm:inset-x-4 sm:bottom-4"><LoaderCircle className="h-4 w-4 animate-spin" />Detecting your face on this device...</div> : null}
            {noFaceDetected ? <div role="status" className="absolute inset-x-3 bottom-3 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-[var(--bg-card)] p-4 text-sm text-[var(--text-secondary)] sm:inset-x-4 sm:bottom-4"><CircleAlert className="h-5 w-5 shrink-0 text-amber-300" /><div><p className="font-semibold text-[var(--text-primary)]">No face detected</p><p className="mt-1">Face the camera directly, improve lighting, and move closer to the camera.</p></div></div> : null}
            {imageUrl ? <button type="button" onClick={removePhoto} aria-label="Remove uploaded photo" className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"><X className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {activeTab === 'camera' ? <>
              {cameraState === 'ready' ? <Button variant="secondary" onClick={() => { stopCamera(); setCameraState('idle'); resetLandmarks(); }}><Video className="mr-2 h-4 w-4" />Stop Camera</Button> : <Button onClick={() => void requestCamera()} disabled={cameraState === 'loading-camera'}><Camera className="mr-2 h-4 w-4" />{cameraState === 'loading-camera' ? 'Starting camera...' : cameraState === 'denied' ? 'Try Camera Again' : 'Start Camera'}</Button>}
              <Button variant="secondary" onClick={() => { setActiveTab('upload'); fileInputRef.current?.click(); }}><Upload className="mr-2 h-4 w-4" />Upload Photo</Button>
              {landmarks && selectedFrame && !imageUrl ? <Button variant="ghost" onClick={takePhoto}>Take Photo</Button> : null}
            </> : <>
              <Button onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{imageUrl ? 'Replace Photo' : 'Choose Photo'}</Button>
              {imageUrl ? <Button variant="secondary" onClick={removePhoto}><X className="mr-2 h-4 w-4" />Remove Photo</Button> : null}
              {landmarks && selectedFrame && imageUrl ? <Button variant="ghost" onClick={takePhoto}>Save Try-On Photo</Button> : null}
            </>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="sr-only" />
          </div>
          {pageError ? <p role="alert" className="mt-3 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{pageError}</p> : null}
          {frameImageError ? <p role="alert" className="mt-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100">The selected frame image could not be loaded. Try another product or refresh the catalogue.</p> : null}
          {detectionError ? <p role="alert" className="mt-3 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{detectionError}</p> : null}
          {activeTab === 'upload' && !imageUrl ? <p className="mt-3 text-sm text-[var(--text-secondary)]">JPG, PNG, or WEBP · up to 10 MB. Your photo stays on this device.</p> : null}
          {landmarks ? <div className="mt-5"><TryOnControls controls={controls} onChange={setControls} onReset={() => setControls(initialControls)} /></div> : null}
        </section>

        <aside className="min-w-0 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Choose a frame</p>
            {products.length ? <span className="text-xs text-[var(--text-secondary)]">{products.length} available</span> : null}
          </div>
          {productsLoading ? <div role="status" className="mt-5 flex items-center gap-3 text-sm text-[var(--text-secondary)]"><LoaderCircle className="h-4 w-4 animate-spin" />Loading published products...</div> : null}
          {productsError ? <div role="alert" className="mt-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{productsError}</div> : null}
          {!productsLoading && !productsError && products.length === 0 ? <p className="mt-5 text-sm text-[var(--text-secondary)]">No published eyewear with product images is available right now.</p> : null}
          {products.length ? <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {products.map(({ catalog, product }) => <button
              key={catalog.id}
              type="button"
              onClick={() => { setSelectedProductId(catalog.id); setControls(initialControls); setCaptureUrl(undefined); setFrameImageError(false); }}
              aria-pressed={selectedEntry?.catalog.id === catalog.id}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedEntry?.catalog.id === catalog.id ? 'border-[#7CBF00] bg-[#7CBF00]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:border-[var(--brand-green)]/50'}`}
            >
              <img src={product.image} alt="" loading="lazy" crossOrigin="anonymous" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</span><span className="mt-1 block text-sm text-[var(--text-secondary)]">{formatINR(product.price)}</span></span>
              {selectedEntry?.catalog.id === catalog.id ? <span aria-hidden="true" className="text-[#7CBF00]">✓</span> : null}
            </button>)}
          </div> : null}

          {selectedEntry ? <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Selected frame</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{selectedProduct?.name}</h2>
            <p className="mt-1 text-lg font-semibold text-cyan-300">{formatINR(selectedProduct?.price ?? 0)}</p>
            {!tryOnImageUrl ? <p className="mt-3 text-xs text-[var(--text-secondary)]">A dedicated frame overlay is not available for this product. A classic frame overlay is shown for try-on.</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link to={`/products/${encodeURIComponent(selectedEntry.catalog.id)}`} className="inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)] transition hover:border-cyan-400/50 hover:text-[var(--text-primary)]">View Product</Link>
              <Button onClick={() => void handleAddToCart()} disabled={!canAddToCart || cartLoading} fullWidth><ShoppingBag className="mr-2 h-4 w-4" />{cartLoading ? 'Adding...' : canAddToCart ? 'Add to Cart' : 'Out of Stock'}</Button>
            </div>
            {!canAddToCart ? <p className="mt-3 text-xs text-[var(--text-secondary)]">This product has no available variant to add to your cart.</p> : null}
            {cartActionError || cartError ? <p role="alert" className="mt-3 text-sm text-red-300">{cartActionError || cartError}</p> : null}
            {cartNotice ? <p role="status" className="mt-3 text-sm text-emerald-300">{cartNotice}</p> : null}
          </div> : null}
          {captureUrl ? <Button variant="ghost" className="mt-4 w-full" onClick={() => setCaptureUrl(undefined)}><RotateCcw className="mr-2 h-4 w-4" />Retake Photo</Button> : null}
        </aside>
      </div>
    </main>
    <Footer />
    {captureUrl ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Try-on photo preview">
      <div className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
        <div className="flex items-center justify-between"><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Try-On Preview</p><button type="button" onClick={() => setCaptureUrl(undefined)} aria-label="Close preview" className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"><X className="h-5 w-5" /></button></div>
        <img src={captureUrl} alt="Your try-on preview" className="mt-5 max-h-[65vh] w-full rounded-[20px] object-contain" />
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setCaptureUrl(undefined)}><RotateCcw className="mr-2 h-4 w-4" />Retake Photo</Button>
          <a href={captureUrl} download="dream-spex-try-on.png" className="inline-flex items-center justify-center rounded-full bg-[#7CBF00] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Save Photo</a>
        </div>
      </div>
    </div> : null}
  </div>;
}
