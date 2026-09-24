import { MapPin, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type SelectedLocation = {
  city: string;
  state: string;
  pincode: string;
  label: string;
};

const STORAGE_KEY = 'dream-spex-selected-location';

const defaultLocation: SelectedLocation = {
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500001',
  label: 'Hyderabad',
};

const locationOptions = [
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520001' },
  { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { city: 'Delhi', state: 'Delhi', pincode: '110001' },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
];

const readStoredLocation = (): SelectedLocation => {
  if (typeof window === 'undefined') return defaultLocation;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLocation;
    const parsed = JSON.parse(raw) as Partial<SelectedLocation>;
    if (!parsed.city || !parsed.state || !parsed.pincode) return defaultLocation;
    return {
      city: parsed.city,
      state: parsed.state,
      pincode: parsed.pincode,
      label: parsed.city,
    };
  } catch {
    return defaultLocation;
  }
};

function useSelectedLocation() {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(() => readStoredLocation());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedLocation));
  }, [selectedLocation]);

  return { selectedLocation, setSelectedLocation } as const;
}

export default function LocationSelector() {
  const { selectedLocation, setSelectedLocation } = useSelectedLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [manualState, setManualState] = useState(selectedLocation.state);
  const [manualPincode, setManualPincode] = useState(selectedLocation.pincode);

  useEffect(() => {
    setManualState(selectedLocation.state);
    setManualPincode(selectedLocation.pincode);
  }, [selectedLocation]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locationOptions;
    return locationOptions.filter((option) => `${option.city} ${option.state}`.toLowerCase().includes(q));
  }, [query]);

  const saveManualSelection = () => {
    if (!manualState.trim() || !manualPincode.trim()) return;
    const city = selectedLocation.city || 'Hyderabad';
    setSelectedLocation({
      city,
      state: manualState,
      pincode: manualPincode,
      label: city,
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:border-[var(--brand-green)]/60"
        aria-label="Choose store location"
      >
        <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
        <span>{selectedLocation.label}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[100] mt-3 w-[320px] rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--brand-green)]">Select Location</p>
              <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">Choose your city</h3>
            </div>
            <Sparkles className="h-4 w-4 text-[var(--brand-green)]" />
          </div>

          <button
            type="button"
            onClick={() => {
              const suggested = locationOptions[0];
              setSelectedLocation({
                city: suggested.city,
                state: suggested.state,
                pincode: suggested.pincode,
                label: suggested.city,
              });
              setOpen(false);
            }}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-sm text-[var(--text-primary)]"
          >
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--brand-green)]" /> Use Current Location</span>
            <span className="text-[var(--text-secondary)]">Demo</span>
          </button>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Search City
            </label>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search city"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {filteredCities.map((option) => (
                <button
                  key={option.city}
                  type="button"
                  onClick={() => {
                    setSelectedLocation({
                      city: option.city,
                      state: option.state,
                      pincode: option.pincode,
                      label: option.city,
                    });
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:border-[var(--brand-green)]/50"
                >
                  <span>{option.city}</span>
                  <span className="text-[var(--text-secondary)]">{option.state}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 pt-2">
              <label className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Select State
                <input
                  value={manualState}
                  onChange={(event) => setManualState(event.target.value)}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
              <label className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Enter Pincode
                <input
                  value={manualPincode}
                  onChange={(event) => setManualPincode(event.target.value)}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={saveManualSelection}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-green)] px-4 py-2.5 text-sm font-semibold text-[#172015]"
            >
              Save Location
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
