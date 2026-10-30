import React, { useEffect, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Scissors, User, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { TrenchLogo } from './TrenchLogo';

declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      class LatLngBounds {
        constructor();
        extend(point: LatLngLiteral): void;
      }
      class OverlayView {
        setMap(map: any): void;
      }
      class Polyline {
        constructor(opts?: any);
        setMap(map: any): void;
      }
    }
  }
}

/**
 * Custom High-Fidelity SVG: Trench Delivery Partner on Scooter with Trench Logo Box,
 * Royal Blue Uniform & Cap — used directly inside Google Maps <AdvancedMarker>.
 */
export const TrenchDeliveryScooterLogo: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 56, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Trench Delivery Logo and Partner on Blue Scooter"
  >
    {/* Headlight beam illuminating the road */}
    <polygon points="73,56 98,40 98,72 73,60" fill="#38BDF8" opacity="0.42" />

    {/* Ground Shadow */}
    <ellipse cx="50" cy="74" rx="34" ry="5" fill="rgba(15, 23, 42, 0.35)" />

    {/* REAR WHEEL */}
    <g>
      <circle cx="27" cy="70" r="11" fill="#1E293B" stroke="#64748B" strokeWidth="2.5" />
      <circle cx="27" cy="70" r="5" fill="#E2E8F0" />
      <circle cx="27" cy="70" r="2" fill="#000080" />
      <path
        d="M 18 68 A 12 12 0 0 1 36 63"
        stroke="#000080"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>

    {/* FRONT WHEEL */}
    <g>
      <circle cx="75" cy="70" r="11" fill="#1E293B" stroke="#64748B" strokeWidth="2.5" />
      <circle cx="75" cy="70" r="5" fill="#E2E8F0" />
      <circle cx="75" cy="70" r="2" fill="#000080" />
      <path
        d="M 66 65 A 12 12 0 0 1 84 66"
        stroke="#000080"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </g>

    {/* SCOOTER CHASSIS IN TRENCH ROYAL BLUE */}
    <g>
      <path
        d="M 33 70 L 52 70 L 64 61 L 70 51 L 63 49 L 53 57 L 34 57 Z"
        fill="#000080"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <path
        d="M 44 65 L 58 63 L 64 54"
        stroke="#10B981"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="64"
        y1="52"
        x2="61"
        y2="34"
        stroke="#334155"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 55 35 L 63 34 L 67 36"
        stroke="#1E293B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="72" cy="55" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="72" cy="55" r="2" fill="#FFFFFF" />

      {/* TRENCH BRANDED DELIVERY PARCEL BOX ON BACK RACK */}
      <rect
        x="18"
        y="36"
        width="20"
        height="24"
        rx="4"
        fill="#000080"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <rect x="18" y="46" width="20" height="3.5" fill="#10B981" />
      {/* Trench split-stem T monogram on box */}
      <text
        x="28"
        y="44"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        trench
      </text>
      <text
        x="28"
        y="56"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        T
      </text>
    </g>

    {/* DELIVERY PARTNER IN ROYAL BLUE UNIFORM & CAP */}
    <g>
      <path d="M 43 56 L 52 56 L 56 66 L 48 66 Z" fill="#1E293B" />
      <rect x="47" y="65" width="10" height="3" rx="1" fill="#10B981" />
      <path
        d="M 41 56 L 49 56 L 55 43 C 55 37 46 35 41 43 Z"
        fill="#000080"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      <line
        x1="43"
        y1="41"
        x2="49"
        y2="52"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="46"
        y1="42"
        x2="60"
        y2="35"
        stroke="#000080"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="35" r="2.5" fill="#1E293B" />
      <rect x="45" y="33" width="4.5" height="4" rx="1" fill="#FCD34D" />
      <circle cx="47" cy="29" r="6.5" fill="#FCD34D" />
      <path d="M 40.5 28 C 40.5 21 53.5 21 53.5 28 Z" fill="#000080" />
      <path
        d="M 46 27 L 58 27 C 59.5 27 59 29.5 56 30 L 46 30 Z"
        fill="#000066"
      />
      <circle cx="47" cy="24.5" r="1.6" fill="#10B981" />
    </g>
  </svg>
);

/**
 * Modern Google Maps Polyline overlay using `useMap()` and `useMapsLibrary('maps')`.
 */
export const RoutePolyline: React.FC<{
  path: google.maps.LatLngLiteral[];
  strokeColor?: string;
  strokeWeight?: number;
  dashed?: boolean;
}> = ({ path, strokeColor = '#000080', strokeWeight = 5 }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    // Outer casing line for high contrast on street & satellite maps
    const outerLine = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 0.9,
      strokeWeight: strokeWeight + 3,
      map,
    });

    // Primary route line
    const mainLine = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: 0.95,
      strokeWeight,
      map,
    });

    return () => {
      outerLine.setMap(null);
      mainLine.setMap(null);
    };
  }, [map, mapsLib, path, strokeColor, strokeWeight]);

  return null;
};

/**
 * Automatically adjusts the map camera bounds when route endpoints or live GPS change,
 * and exposes an on-map "Locate My Device" button to pan directly to the user's live GPS.
 */
const MapBoundsController: React.FC<{
  points: google.maps.LatLngLiteral[];
  triggerKey: string;
  partnerPos: google.maps.LatLngLiteral;
  onRequestLocationPermission?: () => void;
  isLiveDeviceLocation?: boolean;
}> = ({
  points,
  triggerKey,
  partnerPos,
  onRequestLocationPermission,
  isLiveDeviceLocation,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 65, right: 65, bottom: 85, left: 65 });
  }, [map, triggerKey]);

  const handleCenterOnMe = () => {
    if (onRequestLocationPermission) {
      onRequestLocationPermission();
    }
    if (map) {
      map.panTo(partnerPos);
      map.setZoom(16);
    }
  };

  return (
    <div className="absolute top-3 right-14 z-10 flex items-center gap-2">
      <button
        type="button"
        onClick={handleCenterOnMe}
        title="Center map on my real device GPS location"
        className="px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-[#000080] text-white border border-sky-400/60 shadow-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
      >
        <Navigation className="w-3.5 h-3.5 text-emerald-400" />
        <span>{isLiveDeviceLocation ? 'My Live GPS' : 'Use Device GPS'}</span>
      </button>
    </div>
  );
};

/**
 * Resolves the user's live device coordinates into a readable street/area label
 * without calling the quota-limited Google Maps Geocoding Service API.
 */
const LiveReverseGeocoder: React.FC<{
  lat: number;
  lng: number;
  enabled: boolean;
  onAddressResolved?: (address: string) => void;
}> = ({ lat, lng, enabled, onAddressResolved }) => {
  const [lastGeocodedKey, setLastGeocodedKey] = useState<string>('');

  useEffect(() => {
    if (!enabled || !onAddressResolved || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (coordKey === lastGeocodedKey) return;
    setLastGeocodedKey(coordKey);

    let cancelled = false;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`,
      { headers: { Accept: 'application/json' } }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.display_name === 'string' && data.display_name.trim()) {
          const shortParts = data.display_name
            .split(',')
            .map((p: string) => p.trim())
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
          onAddressResolved(shortParts || data.display_name);
        }
      })
      .catch(() => {
        // Silent fallback: keep live coordinate label
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, enabled, lastGeocodedKey, onAddressResolved]);

  return null;
};

export interface FleetTaskPin {
  id: string;
  orderNumber: string;
  customerName: string;
  title: string;
  stage: 'first_delivery' | 'second_delivery';
  status: string;
  payoutINR: number;
  pickupCoords: { lat: number; lng: number; address: string };
  dropCoords: { lat: number; lng: number; address: string };
  tailorShopName?: string;
}

interface TrenchLiveFleetGoogleMapProps {
  partnerName: string;
  partnerLat: number;
  partnerLng: number;
  accuracyMeters?: number;
  isLiveDeviceLocation?: boolean;
  liveAddressLabel?: string;
  onRequestLocationPermission?: () => void;
  onAddressResolved?: (address: string) => void;
  selectedTask?: FleetTaskPin;
  allTasks?: FleetTaskPin[];
  onSelectTask?: (taskId: string) => void;
  mapTypeId?: 'roadmap' | 'hybrid';
}

/**
 * Genuine Real-World Google Map for the Delivery Partner Dashboard Hero Section.
 * Uses our custom Trench Delivery Logo & Blue Scooter inside <AdvancedMarker>
 * bound to real-time browser/device GPS location (`navigator.geolocation`).
 */
export const TrenchLiveFleetGoogleMap: React.FC<TrenchLiveFleetGoogleMapProps> = ({
  partnerName,
  partnerLat,
  partnerLng,
  accuracyMeters = 8,
  isLiveDeviceLocation = false,
  liveAddressLabel,
  onRequestLocationPermission,
  onAddressResolved,
  selectedTask,
  allTasks = [],
  onSelectTask,
  mapTypeId = 'roadmap',
}) => {
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);

  const partnerPos = { lat: partnerLat, lng: partnerLng };
  const activeOrigin = selectedTask
    ? selectedTask.pickupCoords
    : {
        lat: Number((partnerLat + 0.0045).toFixed(5)),
        lng: Number((partnerLng - 0.0038).toFixed(5)),
        address: 'Customer Pickup Location',
      };
  const activeDest = selectedTask
    ? selectedTask.dropCoords
    : {
        lat: Number((partnerLat + 0.0068).toFixed(5)),
        lng: Number((partnerLng + 0.0055).toFixed(5)),
        address: 'Assigned Tailor Studio',
      };

  const routePath: google.maps.LatLngLiteral[] = selectedTask
    ? [
        partnerPos,
        { lat: activeOrigin.lat, lng: activeOrigin.lng },
        { lat: activeDest.lat, lng: activeDest.lng },
      ]
    : [partnerPos];

  const boundsPoints: google.maps.LatLngLiteral[] = selectedTask
    ? [
        partnerPos,
        { lat: activeOrigin.lat, lng: activeOrigin.lng },
        { lat: activeDest.lat, lng: activeDest.lng },
      ]
    : [partnerPos];

  return (
    <div className="w-full h-full relative">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={partnerPos}
        defaultZoom={15}
        mapTypeId={mapTypeId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        fullscreenControl={true}
        mapTypeControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        <LiveReverseGeocoder
          lat={partnerLat}
          lng={partnerLng}
          enabled={isLiveDeviceLocation}
          onAddressResolved={onAddressResolved}
        />

        <MapBoundsController
          points={boundsPoints}
          triggerKey={`${selectedTask?.id || 'default'}-${partnerLat.toFixed(3)}-${partnerLng.toFixed(3)}`}
          partnerPos={partnerPos}
          onRequestLocationPermission={onRequestLocationPermission}
          isLiveDeviceLocation={isLiveDeviceLocation}
        />

        {/* Active Route Polyline from Partner Live GPS Scooter -> Pickup -> Drop */}
        {routePath.length >= 2 && (
          <RoutePolyline
            path={routePath}
            strokeColor={
              selectedTask?.stage === 'second_delivery' ? '#059669' : '#000080'
            }
            strokeWeight={5}
          />
        )}

        {/* Other Assigned Tasks on Map */}
        {allTasks
          .filter((t) => t.id !== selectedTask?.id)
          .map((task) => (
            <AdvancedMarker
              key={task.id}
              position={{
                lat: task.pickupCoords.lat,
                lng: task.pickupCoords.lng,
              }}
              onClick={() => {
                if (onSelectTask) onSelectTask(task.id);
                setActiveInfoId(task.id);
              }}
              title={`Order #${task.orderNumber} · ${task.customerName}`}
            >
              <div className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                <div className="px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold border border-slate-600 shadow-md whitespace-nowrap">
                  #{task.orderNumber} · ₹{task.payoutINR}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white text-white flex items-center justify-center shadow-md -mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
            </AdvancedMarker>
          ))}

        {/* Selected Task Pickup Location Marker */}
        {selectedTask && (
          <AdvancedMarker
            position={{
              lat: selectedTask.pickupCoords.lat,
              lng: selectedTask.pickupCoords.lng,
            }}
            onClick={() => setActiveInfoId('pickup')}
            title={`Pickup: ${selectedTask.pickupCoords.address}`}
          >
            <div className="flex flex-col items-center cursor-pointer">
              <div className="px-2.5 py-1 rounded-lg bg-[#000080] text-white text-[10px] font-extrabold border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap">
                <User className="w-3 h-3 text-sky-300" />
                <span>
                  {selectedTask.stage === 'first_delivery'
                    ? `PICKUP: ${selectedTask.customerName}`
                    : `PICKUP: ${selectedTask.tailorShopName || 'Tailor Studio'}`}
                </span>
              </div>
              <div className="w-4 h-4 rounded-full bg-[#000080] border-2 border-white shadow-md -mt-1" />
            </div>
          </AdvancedMarker>
        )}

        {/* Selected Task Drop-off Location Marker */}
        {selectedTask && (
          <AdvancedMarker
            position={{
              lat: selectedTask.dropCoords.lat,
              lng: selectedTask.dropCoords.lng,
            }}
            onClick={() => setActiveInfoId('drop')}
            title={`Drop-off: ${selectedTask.dropCoords.address}`}
          >
            <div className="flex flex-col items-center cursor-pointer">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-extrabold border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap">
                <Scissors className="w-3 h-3 text-emerald-200" />
                <span>
                  {selectedTask.stage === 'first_delivery'
                    ? `DROP: ${selectedTask.tailorShopName || 'Tailor Studio'}`
                    : `DELIVER: ${selectedTask.customerName}`}
                </span>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md -mt-1" />
            </div>
          </AdvancedMarker>
        )}

        {/* ================================================================= */}
        {/* OUR TRENCH DELIVERY LOGO + BLUE PARTNER SCOOTER AT LIVE DEVICE GPS */}
        {/* ================================================================= */}
        <AdvancedMarker
          position={partnerPos}
          zIndex={50}
          onClick={() => setActiveInfoId('partner')}
          title={`Trench Delivery Partner: ${partnerName} (Live Device Location)`}
        >
          <div className="relative flex flex-col items-center cursor-pointer select-none group">
            {/* Top Floating Trench Branded Logo Pill */}
            <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#000080] text-white border-2 border-white shadow-lg flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-black lowercase tracking-tight text-[11px]">
                trench
              </span>
              <span className="text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full">
                {isLiveDeviceLocation ? 'LIVE GPS' : 'DEVICE LOC'}
              </span>
            </div>

            {/* Scooter + Radar Ring */}
            <div className="relative flex items-center justify-center">
              <span className="absolute w-16 h-16 rounded-full bg-sky-400/30 animate-ping pointer-events-none" />
              <div className="relative w-15 h-15 rounded-2xl bg-white/95 border-2 border-[#000080] shadow-xl flex items-center justify-center p-0.5">
                <TrenchDeliveryScooterLogo size={54} />
              </div>
            </div>

            {/* Partner Name Tag */}
            <div className="-mt-1 px-2.5 py-0.5 rounded-md bg-slate-950 text-white text-[10px] font-extrabold border border-sky-400 shadow-md whitespace-nowrap">
              {partnerName} · 🛵
            </div>
          </div>
        </AdvancedMarker>

        {/* InfoWindow when clicking the Trench Delivery Partner Logo Marker */}
        {activeInfoId === 'partner' && (
          <InfoWindow
            position={partnerPos}
            onCloseClick={() => setActiveInfoId(null)}
          >
            <div className="p-1 text-slate-900 text-xs space-y-1.5 max-w-[240px]">
              <div className="flex items-center gap-2">
                <TrenchLogo variant="header" size="sm" />
                <div>
                  <div className="font-black text-slate-900">{partnerName}</div>
                  <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>
                      {isLiveDeviceLocation
                        ? `Live Device GPS (±${accuracyMeters}m)`
                        : 'Verified Trench Fleet Partner'}
                    </span>
                  </div>
                </div>
              </div>
              {liveAddressLabel && (
                <div className="text-[11px] text-slate-700 font-semibold leading-snug">
                  {liveAddressLabel}
                </div>
              )}
              <div className="text-[11px] text-slate-600 font-mono">
                GPS: {partnerLat.toFixed(5)}° N, {partnerLng.toFixed(5)}° E
              </div>
              {selectedTask && (
                <div className="pt-1 border-t border-slate-200 text-[11px] font-semibold text-[#000080]">
                  Active: Order #{selectedTask.orderNumber} ({selectedTask.title})
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

interface TrenchStageRouteGoogleMapProps {
  orderNumber: string;
  isFirstLeg: boolean;
  customerName: string;
  tailorShopName: string;
  originGeo: { lat: number; lng: number; address: string };
  destGeo: { lat: number; lng: number; address: string };
  partnerName: string;
  legStatusLabel: string;
  partnerLat?: number;
  partnerLng?: number;
  isLiveDeviceLocation?: boolean;
  onRequestLocationPermission?: () => void;
  mapTypeId?: 'roadmap' | 'hybrid';
}

/**
 * Genuine Real-World Google Map for DualDeliveryRouteMap (1st Delivery: Customer -> Tailor,
 * 2nd Delivery: Tailor -> Customer) with our Trench Delivery Logo Marker bound to live device GPS.
 */
export const TrenchStageRouteGoogleMap: React.FC<TrenchStageRouteGoogleMapProps> = ({
  orderNumber,
  isFirstLeg,
  customerName,
  tailorShopName,
  originGeo,
  destGeo,
  partnerName,
  legStatusLabel,
  partnerLat,
  partnerLng,
  isLiveDeviceLocation = false,
  onRequestLocationPermission,
  mapTypeId = 'roadmap',
}) => {
  const hasLiveCoords =
    typeof partnerLat === 'number' &&
    typeof partnerLng === 'number' &&
    Number.isFinite(partnerLat) &&
    Number.isFinite(partnerLng);

  const scooterLat = hasLiveCoords ? partnerLat! : originGeo.lat;
  const scooterLng = hasLiveCoords ? partnerLng! : originGeo.lng;

  const originPos = { lat: originGeo.lat, lng: originGeo.lng };
  const destPos = { lat: destGeo.lat, lng: destGeo.lng };
  const scooterPos = { lat: scooterLat, lng: scooterLng };

  return (
    <div className="w-full h-full relative">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={scooterPos}
        defaultZoom={14}
        mapTypeId={mapTypeId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        <MapBoundsController
          points={[originPos, scooterPos, destPos]}
          triggerKey={`${orderNumber}-${isFirstLeg ? '1' : '2'}-${scooterLat.toFixed(3)}-${scooterLng.toFixed(3)}`}
          partnerPos={scooterPos}
          onRequestLocationPermission={onRequestLocationPermission}
          isLiveDeviceLocation={isLiveDeviceLocation}
        />

        {/* Real-World Google Map Route Polyline */}
        <RoutePolyline
          path={[scooterPos, originPos, destPos]}
          strokeColor={isFirstLeg ? '#000080' : '#059669'}
          strokeWeight={5}
        />

        {/* Origin Marker (Customer on 1st Delivery, Tailor on 2nd Delivery) */}
        <AdvancedMarker
          position={originPos}
          title={`Pickup: ${originGeo.address}`}
        >
          <div className="flex flex-col items-center cursor-pointer">
            <div className="px-2.5 py-1 rounded-lg bg-[#000080] text-white text-[10px] font-extrabold border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap">
              {isFirstLeg ? (
                <User className="w-3 h-3 text-sky-300" />
              ) : (
                <Scissors className="w-3 h-3 text-amber-300" />
              )}
              <span>
                PICKUP: {isFirstLeg ? customerName : tailorShopName}
              </span>
            </div>
            <div className="w-4 h-4 rounded-full bg-[#000080] border-2 border-white shadow-md -mt-1" />
          </div>
        </AdvancedMarker>

        {/* Destination Marker (Tailor on 1st Delivery, Customer on 2nd Delivery) */}
        <AdvancedMarker
          position={destPos}
          title={`Drop-off: ${destGeo.address}`}
        >
          <div className="flex flex-col items-center cursor-pointer">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-extrabold border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap">
              {isFirstLeg ? (
                <Scissors className="w-3 h-3 text-emerald-200" />
              ) : (
                <User className="w-3 h-3 text-emerald-200" />
              )}
              <span>
                DROP: {isFirstLeg ? tailorShopName : customerName}
              </span>
            </div>
            <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md -mt-1" />
          </div>
        </AdvancedMarker>

        {/* Trench Delivery Logo & Partner Scooter Marker at Live Device Location */}
        <AdvancedMarker
          position={scooterPos}
          zIndex={40}
          title={`Trench Delivery Partner: ${partnerName} (${legStatusLabel})`}
        >
          <div className="flex flex-col items-center cursor-pointer select-none">
            <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#000080] text-white border border-white shadow-md flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-black lowercase text-[10px]">trench</span>
              <span className="text-[9px] font-bold text-sky-200">
                {isLiveDeviceLocation ? 'LIVE GPS' : `#${orderNumber}`}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/95 border-2 border-[#000080] shadow-xl flex items-center justify-center p-0.5">
              <TrenchDeliveryScooterLogo size={44} />
            </div>
            <div className="-mt-1 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[9px] font-bold border border-sky-400 shadow-sm whitespace-nowrap">
              {partnerName}
            </div>
          </div>
        </AdvancedMarker>
      </Map>
    </div>
  );
};

