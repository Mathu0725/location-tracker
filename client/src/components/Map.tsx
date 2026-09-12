import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

// Custom pulsing participant SVG marker
const participantIcon = L.divIcon({
  className: 'custom-participant-marker',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; background-color: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
      <div style="width: 16px; height: 16px; background-color: #059669; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 2;"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const breadcrumbIcon = L.divIcon({
  className: 'custom-breadcrumb-marker',
  html: `<div style="width: 8px; height: 8px; background-color: #3b82f6; border: 2px solid white; border-radius: 50%;"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

// Helper component to smoothly pan map when position updates
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

interface MapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracy?: number | null;
  participantName?: string;
  lastSeenAt?: number | null;
  history?: Array<{ latitude: number; longitude: number; recordedAt: number }>;
}

export const Map: React.FC<MapProps> = ({
  latitude,
  longitude,
  accuracy,
  participantName = 'Participant',
  lastSeenAt,
  history = [],
}) => {
  const hasValidCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasValidCoords) {
    return (
      <div
        className="w-full h-80 md:h-96 rounded-xl border border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center p-6 text-center"
        role="region"
        aria-label="Location Map Placeholder"
      >
        <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mb-3">
          <MapPin className="w-7 h-7" aria-hidden="true" />
        </div>
        <h4 className="text-base font-semibold text-slate-700">No Location Received Yet</h4>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Once the participant grants browser permission and starts sharing, their live position and track will appear here.
        </p>
      </div>
    );
  }

  const center: [number, number] = [latitude!, longitude!];
  const polylineCoords: [number, number][] = history.map((h) => [h.latitude, h.longitude]);
  if (polylineCoords.length === 0 || polylineCoords[polylineCoords.length - 1][0] !== center[0]) {
    polylineCoords.push(center);
  }

  return (
    <div
      className="w-full h-80 md:h-96 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative"
      role="region"
      aria-label={`Live map tracking ${participantName}`}
    >
      <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="w-full h-full">
        <ChangeMapView coords={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Accuracy radius circle */}
        {accuracy && accuracy > 0 && (
          <Circle
            center={center}
            radius={Math.min(accuracy, 2000)}
            pathOptions={{
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Historical breadcrumbs trail */}
        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.7,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Historical waypoints */}
        {history.slice(0, -1).map((point, idx) => (
          <Marker key={idx} position={[point.latitude, point.longitude]} icon={breadcrumbIcon} />
        ))}

        {/* Current live marker */}
        <Marker position={center} icon={participantIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-semibold text-slate-800 text-sm">{participantName}</p>
              <p className="text-slate-500 mt-1">
                Accuracy: {accuracy ? `?${Math.round(accuracy)}m` : 'N/A'}
              </p>
              {lastSeenAt && (
                <p className="text-slate-400 mt-0.5">
                  Updated: {new Date(lastSeenAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating map info badge */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-medium text-slate-700">Live GPS tracking</span>
        {accuracy && <span className="text-slate-500 border-l border-slate-200 pl-2">?{Math.round(accuracy)}m</span>}
      </div>
    </div>
  );
};
