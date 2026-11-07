import { useEffect, useRef } from 'react';
import type { FaceLandmarks, TryOnControls, TryOnFrame } from '../../types/virtualTryOn';
import FrameOverlay from './FrameOverlay';

type TryOnPreviewProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  imageUrl?: string;
  landmarks?: FaceLandmarks;
  frame?: TryOnFrame;
  controls: TryOnControls;
  debug: boolean;
  onFrameImageError: () => void;
  onImageLoad: (image: HTMLImageElement) => void;
  onImageError: () => void;
  onVideoMetadata: (width: number, height: number) => void;
  aspectRatio: string;
};

export default function TryOnPreview({
  videoRef,
  imageUrl,
  landmarks,
  frame,
  controls,
  debug,
  onFrameImageError,
  onImageLoad,
  onImageError,
  onVideoMetadata,
  aspectRatio,
}: TryOnPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imageRef.current?.complete) {
      if (imageRef.current.naturalWidth > 0) onImageLoad(imageRef.current);
      else onImageError();
    }
  }, [imageUrl, onImageError, onImageLoad]);

  const [width, height] = aspectRatio.split('/').map(Number);
  const maxWidth = width > 0 && height > 0 ? `${Math.round(70 * width / height)}vh` : '100%';

  return <div className="flex justify-center">
    <div
      className="relative w-full overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
      style={{ aspectRatio, width: `min(100%, ${maxWidth})` }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(event) => onVideoMetadata(event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
        className={`${imageUrl ? 'hidden' : 'block'} h-full w-full object-fill`}
      />
      {imageUrl ? <img
        ref={imageRef}
        src={imageUrl}
        alt="Uploaded try-on"
        onLoad={(event) => onImageLoad(event.currentTarget)}
        onError={onImageError}
        className="h-full w-full object-fill"
      /> : null}
      {frame ? <FrameOverlay landmarks={landmarks} frame={frame} controls={controls} debug={debug} onImageError={onFrameImageError} /> : null}
    </div>
  </div>;
}
