import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, LocateFixed, MapPin, Navigation, Phone, Search, Store, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { useFranchiseLocation } from '../context/FranchiseLocationContext';
import type { StorefrontFranchise } from '../services/franchiseStoreService';
import {
  geolocationErrorMessage,
  googleMapsDirectionsUrl,
  isValidCoordinates,
  type Coordinates,
} from '../utils/deliveryNavigation';
import {
  calculateDistanceKm,
  formatStoreOpeningHours,
  getStoreCoordinates,
  getStoreOpenStatus,
} from '../utils/storeLocator';

type StoreWithDistance = {
  store: StorefrontFranchise;
  distanceKm: number | null;
};

function directionsUrl(store: StorefrontFranchise) {
  const coordinates = getStoreCoordinates(store.latitude, store.longitude);
  if (coordinates) return googleMapsDirectionsUrl(coordinates);
  const destination = [store.address, store.city, store.state, store.postalCode].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return null;
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
}

function getStatusLabel(status: ReturnType<typeof getStoreOpenStatus>, hasOpeningHours: boolean) {
  if (status === 'open') return { text: 'Open now', className: 'bg-emerald-50 text-emerald-800' };
  if (status === 'closed') return { text: 'Closed now', className: 'bg-rose-50 text-rose-800' };
  return {
    text: hasOpeningHours ? 'Hours format unclear' : 'Hours not listed',
    className: 'bg-amber-50 text-amber-900',
  };
}

function StoreDetailsDialog({
  store,
  onClose,
  onSelect,
  isSelected,
}: {
  store: StorefrontFranchise;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const openingHours = formatStoreOpeningHours(store.openingHours);
  const openStatus = getStoreOpenStatus(store.openingHours);
  const status = getStatusLabel(openStatus, openingHours !== null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-[#07182b]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="store-details-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-6 text-[#142b45] shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#927645]">Dream Spex store</p>
            <h2 id="store-details-title" className="mt-2 text-2xl font-semibold">{store.name}</h2>
          </div>
          <button type="button" aria-label="Close store details" onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f7] text-[#142b45] hover:bg-[#e6ebf0]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#927645]" /><p>{store.address}, {store.city}, {store.state} {store.postalCode}</p></div>
          {store.ownerName ? <p><span className="font-semibold">Store contact:</span> {store.ownerName}</p> : null}
          {store.phone ? <a href={`tel:${store.phone}`} className="flex items-center gap-3 font-medium text-[#142b45] hover:underline"><Phone className="h-4 w-4 text-[#927645]" />{store.phone}</a> : <p className="text-[#68788a]">Phone number not listed</p>}
          <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#927645]" /><div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.text}</span><p className="mt-2">{openingHours ?? 'Hours not listed'}</p></div></div>
          <div><h3 className="font-semibold">Available services</h3>{store.availableServices?.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-[#53677d]">{store.availableServices.map((service) => <li key={service}>{service}</li>)}</ul> : <p className="mt-1 text-[#68788a]">Services have not been listed for this store yet.</p>}</div>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onSelect} disabled={isSelected}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#102d4d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1b426a] disabled:cursor-default disabled:bg-emerald-800">
            {isSelected ? 'Selected shopping store' : 'Select this store'}
          </button>
          <a href={directionsUrl(store)} target="_blank" rel="noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#d6dee6] px-5 py-3 text-sm font-semibold text-[#142b45] hover:bg-[#f4f6f8]">
            <Navigation className="h-4 w-4" /> Get directions
          </a>
        </div>
      </section>
    </div>
  );
}

export default function StoreLocatorPage() {
  const { locations, selectedLocationId, selectLocation, loading, error } = useFranchiseLocation();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [query, setQuery] = useState('');
  const [customerLocation, setCustomerLocation] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedId, setSelectedId] = useState(selectedLocationId);
  const [detailStore, setDetailStore] = useState<StorefrontFranchise | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState('');

  useEffect(() => setSelectedId(selectedLocationId), [selectedLocationId]);

  const stores = useMemo<StoreWithDistance[]>(() => {
    const search = query.trim().toLocaleLowerCase();
    return locations
      .filter((store) => !search || [
        store.name, store.address, store.city, store.state, store.postalCode,
      ].filter(Boolean).join(' ').toLocaleLowerCase().includes(search))
      .map((store) => {
        const coordinates = getStoreCoordinates(store.latitude, store.longitude);
        return {
          store,
          distanceKm: customerLocation && coordinates
            ? calculateDistanceKm(customerLocation, coordinates)
            : null,
        };
      })
      .sort((left, right) => {
        if (left.distanceKm === null) return right.distanceKm === null ? 0 : 1;
        if (right.distanceKm === null) return -1;
        return left.distanceKm - right.distanceKm;
      });
  }, [customerLocation, locations, query]);

  useEffect(() => {
    if (!mapElement.current) return undefined;
    const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView([20.5937, 78.9629], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = markerLayer;
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    stores.forEach(({ store }) => {
      const coordinates = getStoreCoordinates(store.latitude, store.longitude);
      if (!coordinates) return;
      const selected = store.id === selectedId;
      const icon = L.divIcon({
        className: 'dreamspex-store-marker',
        html: `<span style="display:block;width:34px;height:34px;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${selected ? '#b8995e' : '#102d4d'};box-shadow:0 3px 12px #102d4d66"><span style="display:block;width:8px;height:8px;margin:10px auto;background:#fff;border-radius:50%"></span></span>`,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });
      L.marker([coordinates.latitude, coordinates.longitude], { icon })
        .addTo(markerLayer)
        .on('click', () => setSelectedId(store.id));
      bounds.push([coordinates.latitude, coordinates.longitude]);
    });

    if (customerLocation) {
      L.circleMarker([customerLocation.latitude, customerLocation.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1,
      }).addTo(markerLayer);
    }

    if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
    else if (customerLocation) map.setView([customerLocation.latitude, customerLocation.longitude], 12);
  }, [customerLocation, selectedId, stores]);

  useEffect(() => {
    if (!showMap) return undefined;
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [showMap]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access.');
      return;
    }
    setLocationError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
          setLocationError('The browser returned invalid coordinates. Please try again.');
        } else {
          setCustomerLocation(coordinates);
          setShowMap(true);
        }
        setLocating(false);
      },
      (reason) => {
        setLocationError(geolocationErrorMessage(reason.code));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const selectStore = (store: StorefrontFranchise) => {
    selectLocation(store.id);
    setSelectedId(store.id);
    setSelectionMessage(`${store.name} is now your preferred shopping location.`);
  };

  return (
    <>
      <Helmet><title>Store Locator | Dream Spex</title><meta name="description" content="Find an approved Dream Spex store, view opening hours and services, and get directions." /></Helmet>
      <Navbar />
      <main className="min-h-screen bg-[#f5f7f9] text-[#142b45]">
        <section className="bg-[#0d2340] text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d0b779]">Your neighborhood eyewear experts</p>
            <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><h1 className="font-serif text-4xl font-medium sm:text-5xl">Find your Dream Spex store</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1dce7]">Explore approved stores, compare nearby locations, and choose where you would like to shop.</p></div>
              <p className="text-sm text-[#d1dce7]">{locations.length} {locations.length === 1 ? 'store' : 'stores'} available</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#60748a]" />
              <input aria-label="Search stores by name, city, area or PIN code" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by store, city, area or PIN code"
                className="h-12 w-full rounded-full border border-[#d7dfe7] bg-white pl-12 pr-4 text-sm text-[#142b45] outline-none transition focus:border-[#927645] focus:ring-2 focus:ring-[#927645]/15" />
            </label>
            <button type="button" onClick={useMyLocation} disabled={locating}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#102d4d] bg-white px-5 text-sm font-semibold text-[#102d4d] transition hover:bg-[#edf2f6] disabled:cursor-wait disabled:opacity-60">
              <LocateFixed className="h-4 w-4" />{locating ? 'Finding you…' : 'Use my current location'}
            </button>
            <button type="button" onClick={() => setShowMap((visible) => !visible)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#102d4d] px-5 text-sm font-semibold text-white transition hover:bg-[#1b426a] lg:hidden">
              <MapPin className="h-4 w-4" />{showMap ? 'Show store list' : 'Show map'}
            </button>
          </div>
          {locationError ? <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{locationError}</p> : null}
          {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">Store locations could not be loaded: {error}</p> : null}
          {selectionMessage ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{selectionMessage}</p> : null}
          {customerLocation ? <p className="mb-4 text-xs text-[#60748a]" role="status">Stores are sorted nearest to your current location.</p> : null}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(380px,0.9fr)_minmax(0,1.1fr)]">
            <div className={showMap ? 'hidden lg:block' : 'block'}>
              {loading ? (
                <div role="status" className="rounded-3xl border border-[#e0e6ec] bg-white p-8 text-center text-sm text-[#60748a]">Loading approved stores…</div>
              ) : stores.length ? (
                <div className="space-y-4">
                  {stores.map(({ store, distanceKm }) => {
                    const openingHours = formatStoreOpeningHours(store.openingHours);
                    const status = getStatusLabel(getStoreOpenStatus(store.openingHours), openingHours !== null);
                    const isSelected = selectedLocationId === store.id;
                    return (
                      <article key={store.id} className={`rounded-3xl border bg-white p-5 shadow-[0_8px_24px_rgba(16,45,77,0.06)] transition ${selectedId === store.id ? 'border-[#b8995e] ring-1 ring-[#b8995e]/40' : 'border-[#e0e6ec]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#927645]">{store.city}</p><h2 className="mt-1 text-xl font-semibold text-[#142b45]">{store.name}</h2></div>
                          {distanceKm !== null ? <span className="shrink-0 rounded-full bg-[#f0f3f6] px-3 py-1 text-xs font-medium text-[#53677d]">{formatDistance(distanceKm)}</span> : null}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.text}</span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#53677d]"><Clock3 className="h-3.5 w-3.5" />{openingHours ?? 'Hours not listed'}</span>
                        </div>
                        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#53677d]"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[#927645]" /><span>{store.address}, {store.city}, {store.state} {store.postalCode}</span></p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                          {store.ownerName ? <span className="text-[#53677d]">Contact: {store.ownerName}</span> : null}
                          {store.phone ? <a href={`tel:${store.phone}`} className="inline-flex items-center gap-1.5 font-medium text-[#142b45] hover:underline"><Phone className="h-4 w-4 text-[#927645]" />{store.phone}</a> : <span className="text-[#68788a]">Phone not listed</span>}
                        </div>
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#53677d]">Services</p>
                          {store.availableServices?.length ? <p className="mt-1 text-sm text-[#53677d]">{store.availableServices.join(' · ')}</p> : <p className="mt-1 text-sm text-[#68788a]">Services not listed</p>}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { setSelectedId(store.id); setDetailStore(store); }}
                            className="rounded-full border border-[#d6dee6] px-3 py-2.5 text-xs font-semibold text-[#142b45] transition hover:bg-[#f4f6f8]">View store details</button>
                          <a href={directionsUrl(store)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d6dee6] px-3 py-2.5 text-xs font-semibold text-[#142b45] transition hover:bg-[#f4f6f8]"><Navigation className="h-3.5 w-3.5" />Get directions</a>
                        </div>
                        <button type="button" disabled={isSelected} onClick={() => selectStore(store)}
                          className="mt-2.5 w-full rounded-full bg-[#102d4d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b426a] disabled:cursor-default disabled:bg-emerald-800">
                          {isSelected ? 'Your selected shopping store' : 'Select this store'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#e0e6ec] bg-white px-6 py-12 text-center">
                  <Store className="mx-auto h-9 w-9 text-[#927645]" />
                  <h2 className="mt-4 text-lg font-semibold text-[#142b45]">{locations.length ? 'No matching stores' : 'No approved stores yet'}</h2>
                  <p className="mt-2 text-sm text-[#68788a]">{locations.length ? 'Try another store name, city, area or PIN code.' : 'Please check back soon for a Dream Spex location near you.'}</p>
                  {query ? <button type="button" onClick={() => setQuery('')} className="mt-4 text-sm font-semibold text-[#102d4d] underline">Clear search</button> : null}
                </div>
              )}
            </div>

            <div aria-label="Store map" className={`${showMap ? 'block' : 'hidden'} overflow-hidden rounded-3xl border border-[#dce3e9] bg-[#e7edf2] shadow-[0_8px_24px_rgba(16,45,77,0.08)] lg:sticky lg:top-5 lg:block`}>
              <div className="flex items-center justify-between bg-white px-5 py-3">
                <div><p className="text-sm font-semibold text-[#142b45]">Stores near you</p><p className="text-xs text-[#68788a]">Select a pin to highlight a store</p></div>
                <MapPin className="h-5 w-5 text-[#927645]" />
              </div>
              <div ref={mapElement} className="h-[65vh] min-h-[420px] w-full lg:h-[calc(100vh-250px)] lg:min-h-[560px]" />
              {!loading && !stores.some(({ store }) => getStoreCoordinates(store.latitude, store.longitude)) ? <p className="bg-white px-5 py-3 text-sm text-[#68788a]">No mapped stores match your search.</p> : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {detailStore ? <StoreDetailsDialog store={detailStore} onClose={() => setDetailStore(null)}
        onSelect={() => { selectStore(detailStore); setDetailStore(null); }}
        isSelected={selectedLocationId === detailStore.id} /> : null}
    </>
  );
}
