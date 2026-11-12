import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type StorefrontFranchise = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
  ownerName?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  availableServices?: string[];
};

export type StorefrontAvailability = StorefrontFranchise & {
  distanceKm: number | null;
  deliveryServiceable: boolean;
  availableForOrder: boolean;
  items: Array<{
    variantId: string;
    requested: number;
    available: number;
    availableForItem: boolean;
  }>;
};

export const franchiseStoreService = {
  async list(signal?: AbortSignal): Promise<StorefrontFranchise[]> {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/franchises`, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Franchise locations could not be loaded (${response.status}).`);
    return response.json() as Promise<StorefrontFranchise[]>;
  },
  async availability(accessToken: string, items: Array<{ variantId: string; quantity: number }>,
    coordinates: { latitude: number; longitude: number } | null): Promise<StorefrontAvailability[]> {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/franchises/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        items,
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Franchise product availability could not be loaded (${response.status}).`);
    return response.json() as Promise<StorefrontAvailability[]>;
  },
};
