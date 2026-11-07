export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function isValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

export function normalizeCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object') return null;
  const coordinates = value as { latitude?: unknown; longitude?: unknown };
  const { latitude, longitude } = coordinates;
  if (typeof latitude !== 'number' || typeof longitude !== 'number'
      || !isValidCoordinates(latitude, longitude)) return null;
  return { latitude, longitude };
}

export function googleMapsLocationUrl(coordinates: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
}

export function googleMapsDirectionsUrl(coordinates: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}&travelmode=driving`;
}

export function geolocationErrorMessage(code: number): string {
  if (code === 1) return 'Location permission was denied. You can still select a point on the map.';
  if (code === 2) return 'Your location is unavailable. You can still select a point on the map.';
  if (code === 3) return 'Location lookup timed out. Try again or select a point on the map.';
  return 'Unable to get your location. You can still select a point on the map.';
}
