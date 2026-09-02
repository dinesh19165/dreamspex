import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { createFaceLandmarker, detectImage, detectVideoFrame } from '../services/virtualTryOnService';
import type { FaceLandmarks } from '../types/virtualTryOn';

export function useFaceLandmarks(video: HTMLVideoElement | null, enabled: boolean) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const missedFramesRef = useRef(0);
  const [landmarks, setLandmarks] = useState<FaceLandmarks>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !video) return undefined;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setLandmarks(undefined);
    missedFramesRef.current = 0;

    const start = async () => {
      try {
        const landmarker = await createFaceLandmarker();
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setLoading(false);

        const detect = () => {
          if (cancelled) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            const nextLandmarks = detectVideoFrame(landmarker, video, performance.now());
            if (nextLandmarks) {
              missedFramesRef.current = 0;
              setFailed(false);
              setLandmarks(nextLandmarks);
            } else if (++missedFramesRef.current > 90) {
              setFailed(true);
            }
          }
          animationFrameRef.current = window.requestAnimationFrame(detect);
        };
        detect();
      } catch {
        if (!cancelled) {
          setLoading(false);
          setFailed(true);
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [video, enabled]);

  const detectUploadedImage = useCallback(async (image: HTMLImageElement) => {
    setLoading(true);
    setFailed(false);
    let landmarker: FaceLandmarker | undefined;
    try {
      landmarker = await createFaceLandmarker('IMAGE');
      const nextLandmarks = await detectImage(landmarker, image);
      setLandmarks(nextLandmarks);
      if (!nextLandmarks) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      landmarker?.close();
      setLoading(false);
    }
  }, []);

  return { landmarks, loading, failed, detectUploadedImage };
}
