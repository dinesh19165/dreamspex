import type { Coordinates } from '../utils/deliveryNavigation';

export type ReverseGeocodedAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
};

export function mergeReverseGeocodedAddress<T extends object>(
  current: T,
  found: ReverseGeocodedAddress,
): T & ReverseGeocodedAddress {
  return { ...current, ...found };
}

type NominatimResponse = {
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
};

export async function reverseGeocodeCoordinates(coordinates: Coordinates): Promise<ReverseGeocodedAddress> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!response.ok) throw new Error(`Address lookup failed (${response.status}).`);

  const result = await response.json() as NominatimResponse;
  const address = result.address;
  if (!address) throw new Error('No address details were found for this location.');

  const street = address.road ?? address.pedestrian ?? address.footway;
  const line1 = [address.house_number, street].filter(Boolean).join(' ');
  const area = address.neighbourhood ?? address.suburb ?? address.city_district;
  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  return {
    ...(line1 ? { line1 } : {}),
    ...(area ? { line2: area } : {}),
    ...(city ? { city } : {}),
    ...(address.state ? { state: address.state } : {}),
    ...(address.postcode ? { postalCode: address.postcode } : {}),
    ...(address.country_code ? { countryCode: address.country_code.toUpperCase() } : {}),
  };
}
