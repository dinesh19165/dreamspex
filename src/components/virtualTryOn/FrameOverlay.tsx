import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { FaceLandmarks, TryOnControls, TryOnFrame } from '../../types/virtualTryOn';

type FrameOverlayProps = {
  landmarks?: FaceLandmarks;
  frame: TryOnFrame;
  controls: TryOnControls;
  debug?: boolean;
  onImageError?: () => void;
};

export default function FrameOverlay({ landmarks, frame, controls, debug = false, onImageError }: FrameOverlayProps) {
  const [imageSource, setImageSource] = useState(frame.src);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSource(frame.src);
    setImageFailed(false);
  }, [frame.src, frame.fallbackSrc]);

  if (!landmarks) return null;
  if (imageFailed) return null;
  const width = Math.min(100, Math.max(18, landmarks.eyeDistance * 235 * controls.scale));
  const style: CSSProperties = {
    left: `${landmarks.eyeCenter.x * 100}%`,
    top: `${(landmarks.eyeCenter.y + controls.offsetY) * 100}%`,
    width: `${width}%`,
    transform: `translate(-50%, -50%) rotate(${landmarks.rotation + controls.rotation}deg)`,
  };

  return <>
    <img
      src={imageSource}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute z-10 h-auto max-w-none mix-blend-multiply"
      style={style}
      onError={() => {
        if (frame.fallbackSrc && imageSource !== frame.fallbackSrc) {
          setImageSource(frame.fallbackSrc);
          return;
        }
        setImageFailed(true);
        onImageError?.();
      }}
    />
    {debug ? <div className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7CBF00]" style={{ left: `${landmarks.eyeCenter.x * 100}%`, top: `${landmarks.eyeCenter.y * 100}%` }} /> : null}
  </>;
}
