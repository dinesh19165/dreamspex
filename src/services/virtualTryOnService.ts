import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { FaceLandmarks, LandmarkPoint } from '../types/virtualTryOn';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const leftEyeIndices = [33, 133, 159, 145];
const rightEyeIndices = [362, 263, 386, 374];
const faceCenterIndices = [1, 168, 6];

export async function createFaceLandmarker(runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO'): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options = {
    baseOptions: { modelAssetPath: MODEL_PATH },
    runningMode,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  } as const;
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    });
  } catch {
    return FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' },
    });
  }
}

function average(points: LandmarkPoint[]): LandmarkPoint {
  return points.reduce((result, point) => ({ x: result.x + point.x / points.length, y: result.y + point.y / points.length, z: result.z + point.z / points.length }), { x: 0, y: 0, z: 0 });
}

export function landmarksFromResult(result: FaceLandmarkerResult): FaceLandmarks | undefined {
  const points = result.faceLandmarks[0]?.map((point) => ({ x: point.x, y: point.y, z: point.z }));
  if (!points) return undefined;

  const leftEye = average(leftEyeIndices.map((index) => points[index]));
  const rightEye = average(rightEyeIndices.map((index) => points[index]));
  const eyeCenter = average([leftEye, rightEye]);
  const faceCenter = average(faceCenterIndices.map((index) => points[index]));
  const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const rotation = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

  return { points, leftEye, rightEye, eyeCenter, eyeDistance, faceCenter, rotation };
}

export function detectVideoFrame(landmarker: FaceLandmarker, video: HTMLVideoElement, timestamp: number): FaceLandmarks | undefined {
  return landmarksFromResult(landmarker.detectForVideo(video, timestamp));
}

export async function detectImage(landmarker: FaceLandmarker, image: HTMLImageElement): Promise<FaceLandmarks | undefined> {
  return landmarksFromResult(landmarker.detect(image));
}
