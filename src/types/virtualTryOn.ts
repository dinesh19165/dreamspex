export type LandmarkPoint = {
  x: number;
  y: number;
  z: number;
};

export type FaceLandmarks = {
  points: LandmarkPoint[];
  leftEye: LandmarkPoint;
  rightEye: LandmarkPoint;
  eyeCenter: LandmarkPoint;
  eyeDistance: number;
  faceCenter: LandmarkPoint;
  rotation: number;
};

export type TryOnFrame = {
  src: string;
  width: number;
  height: number;
};

export type TryOnState = 'idle' | 'loading-camera' | 'loading-detection' | 'ready' | 'denied' | 'unavailable' | 'failed';

export type TryOnControls = {
  scale: number;
  offsetY: number;
  rotation: number;
};
