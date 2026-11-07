import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { createFaceLandmarker, detectImage, detectVideoFrame } from '../services/virtualTryOnService';
import type { FaceLandmarks } from '../types/virtualTryOn';

function smoothLandmarks(next: FaceLandmarks, previous?: FaceLandmarks): FaceLandmarks {
  if (!previous) return next;
  const blend = (from: number, to: number) => from + (to - from) * 0.35;
  const blendPoint = (from: FaceLandmarks['eyeCenter'], to: FaceLandmarks['eyeCenter']) => ({
    x: blend(from.x, to.x),
    y: blend(from.y, to.y),
    z: blend(from.z, to.z),
  });
  const rotationDelta = ((next.rotation - previous.rotation + 540) % 360) - 180;
  return {
    points: next.points.map((point, index) => blendPoint(previous.points[index] ?? point, point)),
    leftEye: blendPoint(previous.leftEye, next.leftEye),
    rightEye: blendPoint(previous.rightEye, next.rightEye),
    eyeCenter: blendPoint(previous.eyeCenter, next.eyeCenter),
    eyeDistance: blend(previous.eyeDistance, next.eyeDistance),
    faceCenter: blendPoint(previous.faceCenter, next.faceCenter),
    rotation: previous.rotation + rotationDelta * 0.35,
  };
}

export function useFaceLandmarks(video: HTMLVideoElement | null, enabled: boolean) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const missedFramesRef = useRef(0);
  const lastDetectionAtRef = useRef(0);
  const smoothedLandmarksRef = useRef<FaceLandmarks | undefined>(undefined);
  const imageRequestIdRef = useRef(0);
  const [landmarks, setLandmarks] = useState<FaceLandmarks>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !video) return undefined;
    let cancelled = false;
    imageRequestIdRef.current += 1;
    setLoading(true);
    setFailed(false);
    setError('');
    setLandmarks(undefined);
    missedFramesRef.current = 0;
    lastDetectionAtRef.current = 0;
    smoothedLandmarksRef.current = undefined;

    const start = async () => {
      try {
        const landmarker = await createFaceLandmarker();
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        const detect = (timestamp: number) => {
          if (cancelled) return;
          animationFrameRef.current = window.requestAnimationFrame(detect);
          if (timestamp - lastDetectionAtRef.current < 33) return;
          lastDetectionAtRef.current = timestamp;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            try {
              const nextLandmarks = detectVideoFrame(landmarker, video, performance.now());
              if (nextLandmarks) {
                missedFramesRef.current = 0;
                setFailed(false);
                const stableLandmarks = smoothLandmarks(nextLandmarks, smoothedLandmarksRef.current);
                smoothedLandmarksRef.current = stableLandmarks;
                setLandmarks(stableLandmarks);
                setLoading(false);
              } else {
                missedFramesRef.current += 1;
                if (missedFramesRef.current > 4) {
                  smoothedLandmarksRef.current = undefined;
                  setLandmarks(undefined);
                }
                if (missedFramesRef.current > 45) {
                  setFailed(true);
                  setLoading(false);
                }
              }
            } catch {
              if (!cancelled) {
                setLoading(false);
                setError('Face detection stopped unexpectedly. Restart the camera or upload a different photo.');
              }
              if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
          }
        };
        animationFrameRef.current = window.requestAnimationFrame(detect);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError('On-device face detection could not be initialized. Check your connection and try again.');
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
    const requestId = ++imageRequestIdRef.current;
    setLoading(true);
    setFailed(false);
    setError('');
    setLandmarks(undefined);
    let landmarker: FaceLandmarker | undefined;
    try {
      landmarker = await createFaceLandmarker('IMAGE');
      const nextLandmarks = await detectImage(landmarker, image);
      if (requestId === imageRequestIdRef.current) {
        setLandmarks(nextLandmarks);
        if (!nextLandmarks) setFailed(true);
      }
    } catch {
      if (requestId === imageRequestIdRef.current) {
        setError('On-device face detection could not be initialized. Check your connection and try again.');
      }
    } finally {
      landmarker?.close();
      if (requestId === imageRequestIdRef.current) setLoading(false);
    }
  }, []);

  const resetLandmarks = useCallback(() => {
    imageRequestIdRef.current += 1;
    setLandmarks(undefined);
    setLoading(false);
    setFailed(false);
    setError('');
  }, []);

  return { landmarks, loading, failed, error, detectUploadedImage, resetLandmarks };
}
