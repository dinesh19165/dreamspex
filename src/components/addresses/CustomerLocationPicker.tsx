import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Button from '../ui/Button';
import { geolocationErrorMessage, isValidCoordinates, normalizeCoordinates, type Coordinates } from '../../utils/deliveryNavigation';

type Props = {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  onCurrentLocation?: (coordinates: Coordinates) => void;
  title?: string;
  description?: string;
};

const markerIcon = L.divIcon({
  className: '',
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path fill="#d92d20" stroke="#fff" stroke-width="2" d="M16 1C8 1 2 7 2 15c0 11 14 24 14 24s14-13 14-24C30 7 24 1 16 1Z"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

export default function CustomerLocationPicker({
  value,
  onChange,
  onCurrentLocation,
  title = 'Delivery location',
  description = 'Use GPS or click/drag the pin to mark the exact address.',
}: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const coordinates = normalizeCoordinates(value);
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!mapElement.current) return;
    const map = L.map(mapElement.current).setView([20.5937, 78.9629], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      setError('');
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude === undefined || longitude === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position: L.LatLngExpression = [latitude, longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const point = markerRef.current?.getLatLng();
        if (point) onChangeRef.current({ latitude: point.lat, longitude: point.lng });
      });
    } else {
      markerRef.current.setLatLng(position);
    }
    map.setView(position, Math.max(map.getZoom(), 15));
  }, [latitude, longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('This browser does not support location access. You can still select a point on the map.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
          setError('The browser returned invalid coordinates. Select a point on the map instead.');
        } else {
          onChange(coordinates);
          onCurrentLocation?.(coordinates);
        }
        setLocating(false);
      },
      (reason) => {
        setError(geolocationErrorMessage(reason.code));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <Button type="button" variant="ghost" disabled={locating} onClick={useCurrentLocation}>
        <MapPin className="mr-2 h-4 w-4" />{locating ? 'Finding location…' : 'Use Current Location'}
      </Button>
    </div>
    <div ref={mapElement} className="h-64 overflow-hidden rounded-2xl border border-[var(--border-subtle)]" aria-label="Select delivery location on map" />
    {coordinates ? <p className="text-xs text-[var(--text-secondary)]" role="status">
      Selected location: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
    </p> : <p className="text-xs text-[var(--text-secondary)]">No location selected. Click the map to place a pin.</p>}
    {error ? <p className="text-sm text-amber-300" role="alert">{error}</p> : null}
  </div>;
}
