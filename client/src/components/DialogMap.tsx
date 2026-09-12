import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { DialogStore } from '../data/dialogStores';

// Pulsing user marker
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: grab;">
      <div style="position: absolute; width: 34px; height: 34px; background-color: rgba(220, 38, 38, 0.35); border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
      <div style="width: 18px; height: 18px; background-color: #dc2626; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 2;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const dialogStoreIcon = L.divIcon({
  className: 'custom-dialog-store-marker',
  html: `
    <div style="background-color: #b91c1c; color: white; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
      D
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function MapRecenter({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

function MapClickHandler({ onLocationChange }: { onLocationChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface DialogMapProps {
  userCoords: { latitude: number; longitude: number; accuracy: number };
  stores: (DialogStore & { distanceKm: number })[];
  onLocationChange?: (lat: number, lng: number) => void;
}

export const DialogMap: React.FC<DialogMapProps> = ({ userCoords, stores, onLocationChange }) => {
  const center: [number, number] = [userCoords.latitude, userCoords.longitude];
  const isApproximate = userCoords.accuracy >= 1000;

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker && onLocationChange) {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="w-full h-full">
        <MapRecenter coords={center} />
        <MapClickHandler onLocationChange={onLocationChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* User GPS accuracy circle */}
        {!isApproximate && userCoords.accuracy > 0 && (
          <Circle
            center={center}
            radius={Math.min(userCoords.accuracy, 1000)}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: '3, 3',
            }}
          />
        )}

        {/* User Marker (Draggable for exact street placement) */}
        <Marker
          position={center}
          icon={userIcon}
          draggable={true}
          eventHandlers={eventHandlers}
        >
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-slate-900 text-sm">Your Location Pin</p>
              <p className="text-slate-600 mt-1 font-mono">
                {userCoords.latitude.toFixed(5)}?, {userCoords.longitude.toFixed(5)}?
              </p>
              <p className="text-slate-500 mt-0.5">
                {isApproximate ? '?? Approximate (Drag pin to adjust)' : `?${Math.round(userCoords.accuracy)}m GPS accuracy`}
              </p>
              <p className="text-red-600 font-semibold text-[11px] mt-1.5">
                ?? Tip: Click anywhere on map or drag this pin to set your exact location!
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Dialog Experience Centre Markers */}
        {stores.map((store) => (
          <Marker
            key={store.id}
            position={[store.latitude, store.longitude]}
            icon={dialogStoreIcon}
          >
            <Popup>
              <div className="p-1 text-xs max-w-xs">
                <span className="bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase">
                  Dialog Store ? {store.distanceKm} km away
                </span>
                <p className="font-bold text-slate-900 text-sm mt-1">{store.name}</p>
                <p className="text-slate-600 mt-0.5">{store.address}</p>
                <p className="text-slate-500 mt-1 text-[11px]">?? {store.hours}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                  {store.services.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating map banner */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
        <span className="font-semibold text-slate-800">
          {isApproximate ? 'Click map or drag pin to set exact spot' : 'Live Exact GPS'}
        </span>
      </div>
    </div>
  );
};
