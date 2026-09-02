import type { CSSProperties } from 'react';
import type { FaceLandmarks, TryOnControls, TryOnFrame } from '../../types/virtualTryOn';

type FrameOverlayProps = {
  landmarks?: FaceLandmarks;
  frame: TryOnFrame;
  controls: TryOnControls;
  debug?: boolean;
};

export default function FrameOverlay({ landmarks, frame, controls, debug = false }: FrameOverlayProps) {
  if (!landmarks) return null;
  const width = Math.max(18, landmarks.eyeDistance * 170 * controls.scale);
  const style: CSSProperties = {
    left: `${landmarks.eyeCenter.x * 100}%`,
    top: `${(landmarks.eyeCenter.y + controls.offsetY) * 100}%`,
    width: `${width}%`,
    transform: `translate(-50%, -50%) rotate(${landmarks.rotation + controls.rotation}deg)`,
  };

  return <>
    <img src={frame.src} alt="" aria-hidden="true" className="pointer-events-none absolute z-10 max-w-none" style={style} />
    {debug ? <div className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7CBF00]" style={{ left: `${landmarks.eyeCenter.x * 100}%`, top: `${landmarks.eyeCenter.y * 100}%` }} /> : null}
  </>;
}
