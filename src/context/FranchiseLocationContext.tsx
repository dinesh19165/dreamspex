import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { franchiseStoreService, type StorefrontFranchise } from '../services/franchiseStoreService';

type FranchiseLocationContextValue = {
  locations: StorefrontFranchise[];
  selectedLocation: StorefrontFranchise | null;
  selectedLocationId: string;
  loading: boolean;
  error: string;
  selectLocation: (id: string) => void;
};

const STORAGE_KEY = 'dream-spex-selected-franchise';
const FranchiseLocationContext = createContext<FranchiseLocationContextValue | null>(null);

export function FranchiseLocationProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<StorefrontFranchise[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    franchiseStoreService.list(controller.signal)
      .then((items) => {
        setLocations(items);
        const savedId = localStorage.getItem(STORAGE_KEY);
        const nextId = items.some((item) => item.id === savedId) ? savedId! : items[0]?.id ?? '';
        setSelectedLocationId(nextId);
        if (nextId) localStorage.setItem(STORAGE_KEY, nextId);
        else localStorage.removeItem(STORAGE_KEY);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Franchise locations could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const selectLocation = useCallback((id: string) => {
    const selected = locations.find((location) => location.id === id);
    if (!selected) return;
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedLocationId(id);
  }, [locations]);

  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;
  const value = useMemo(() => ({
    locations, selectedLocation, selectedLocationId, loading, error, selectLocation,
  }), [locations, selectedLocation, selectedLocationId, loading, error, selectLocation]);

  return <FranchiseLocationContext.Provider value={value}>{children}</FranchiseLocationContext.Provider>;
}

export function useFranchiseLocation() {
  const context = useContext(FranchiseLocationContext);
  if (!context) throw new Error('useFranchiseLocation must be used within FranchiseLocationProvider.');
  return context;
}
