import { useEffect, useRef, useState } from 'react';

export default function DreamSpex3DGlasses({ variant = 'login' }: { variant?: 'login' | 'register' | 'forgot' }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches || document.visibilityState === 'hidden'); update(); media.addEventListener('change', update); document.addEventListener('visibilitychange', update); return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); }; }, []);
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    stageRef.current.style.setProperty('--parallax-x', `${x * 14}px`);
    stageRef.current.style.setProperty('--parallax-y', `${y * 10}px`);
  };
  const resetPointer = () => {
    stageRef.current?.style.setProperty('--parallax-x', '0px');
    stageRef.current?.style.setProperty('--parallax-y', '0px');
  };
  return <div ref={stageRef} className={`spectacle-stage spectacle-stage-${variant} ${reducedMotion ? 'motion-reduced' : ''}`} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} aria-hidden="true"><div className="spectacle-rays" /><div className="spectacle-aura" /><div className="spectacle-trail trail-one" /><div className="spectacle-trail trail-two" /><div className="spectacle-particles"><i /><i /><i /><i /></div><div className="spectacles"><div className="spectacle-lens lens-left"><span /></div><div className="spectacle-bridge" /><div className="spectacle-lens lens-right"><span /></div><div className="spectacle-arm arm-left" /><div className="spectacle-arm arm-right" /></div><div className="spectacle-platform"><span /></div><div className="spectacle-shadow" /></div>;
}