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
  onImageLoad: (image: HTMLImageElement) => void;
};

export default function TryOnPreview({ videoRef, imageUrl, landmarks, frame, controls, debug, onImageLoad }: TryOnPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) onImageLoad(imageRef.current);
  }, [imageUrl, onImageLoad]);

  return <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1022]"><video ref={videoRef} autoPlay playsInline muted className={`${imageUrl ? 'hidden' : 'block'} h-full w-full object-cover`} />{imageUrl ? <img ref={imageRef} src={imageUrl} alt="Uploaded try-on" onLoad={(event) => onImageLoad(event.currentTarget)} className="h-full w-full object-cover" /> : null}{frame ? <FrameOverlay landmarks={landmarks} frame={frame} controls={controls} debug={debug} /> : null}</div>;
}
