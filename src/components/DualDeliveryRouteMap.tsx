import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Truck,
  Scissors,
  User,
  CheckCircle2,
  Compass,
  Clock,
  Route,
  Map as MapIcon,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  FirstDeliveryLegStatus,
  GeoLocationPoint,
  SecondDeliveryLegStatus,
} from '../types/appTypes';
import { resolveRealGeoLocation } from '../utils/appLogic';
import { TrenchStageRouteGoogleMap } from './TrenchGoogleMap';

interface DualDeliveryRouteMapProps {
  orderNumber: string;
  customerName: string;
  customerAddress?: string;
  tailorShopName: string;
  tailorShopAddress?: string;
  customerLocation?: GeoLocationPoint;
  tailorLocation?: GeoLocationPoint;
  firstDeliveryStatus?: FirstDeliveryLegStatus;
  secondDeliveryStatus?: SecondDeliveryLegStatus;
  firstDeliveryPartnerName?: string;
  secondDeliveryPartnerName?: string;
  assignedPartnerName?: string;
  activeStageDefault?: 'first_delivery' | 'second_delivery';
  activeStage?: string;
  partnerLat?: number;
  partnerLng?: number;
  isLiveDeviceLocation?: boolean;
  onRequestDeviceLocation?: () => void;
  compact?: boolean;
}

export const DualDeliveryRouteMap: React.FC<DualDeliveryRouteMapProps> = ({
  orderNumber,
  customerName,
  customerAddress = '',
  tailorShopName,
  tailorShopAddress = '',
  customerLocation,
  tailorLocation,
  firstDeliveryStatus = 'assigned',
  secondDeliveryStatus = 'not_ready',
  firstDeliveryPartnerName = 'Delivery Partner',
  secondDeliveryPartnerName,
  assignedPartnerName,
  activeStageDefault,
  activeStage,
  partnerLat,
  partnerLng,
  isLiveDeviceLocation = false,
  onRequestDeviceLocation,
  compact = false,
}) => {
  const resolvedStage: 'first_delivery' | 'second_delivery' =
    activeStage === 'second_delivery' || activeStageDefault === 'second_delivery'
      ? 'second_delivery'
      : activeStage === 'first_delivery' || activeStageDefault === 'first_delivery'
      ? 'first_delivery'
      : secondDeliveryStatus !== 'not_ready'
      ? 'second_delivery'
      : 'first_delivery';

  const [selectedLeg, setSelectedLeg] = useState<'first_delivery' | 'second_delivery'>(
    resolvedStage
  );
  // Genuine Real-World Google Map is the DEFAULT map engine
  const [mapEngine, setMapEngine] = useState<'google_map' | 'satellite' | 'vector'>('google_map');
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);

  const baseLiveCoords =
    typeof partnerLat === 'number' && typeof partnerLng === 'number'
      ? { lat: partnerLat, lng: partnerLng }
      : undefined;

  const custGeo =
    customerLocation ||
    resolveRealGeoLocation(customerAddress, 'customer', baseLiveCoords);
  const tailorGeo =
    tailorLocation ||
    resolveRealGeoLocation(
      `${tailorShopName}, ${tailorShopAddress}`,
      'tailor',
      baseLiveCoords
    );

  const isFirstLeg = selectedLeg === 'first_delivery';
  const originGeo = isFirstLeg ? custGeo : tailorGeo;
  const destGeo = isFirstLeg ? tailorGeo : custGeo;

  const originTitle = isFirstLeg
    ? `Customer Pickup: ${customerName}`
    : `Tailor Pickup: ${tailorShopName}`;
  const destTitle = isFirstLeg
    ? `Tailor Drop-off: ${tailorShopName}`
    : `Customer Delivery: ${customerName}`;

  const legStatusLabel = isFirstLeg
    ? firstDeliveryStatus === 'delivered_to_tailor'
      ? 'Completed · Delivered to Tailor'
      : firstDeliveryStatus === 'picked_up_from_customer'
      ? 'In Transit · Picked Up from Customer'
      : 'Assigned · Awaiting Customer Pickup'
    : secondDeliveryStatus === 'delivered_to_customer'
    ? 'Completed · Delivered to Customer'
    : secondDeliveryStatus === 'picked_up_from_tailor'
    ? 'In Transit · Picked Up from Tailor'
    : secondDeliveryStatus === 'assigned'
    ? 'Assigned · Ready for Tailor Pickup'
    : secondDeliveryStatus === 'awaiting_assignment'
    ? 'Work Completed · Awaiting Partner Assignment'
    : 'Locked Until Tailor Work Completed';

  // Calculate real Haversine distance in km between saved coordinates
  const dLat = ((destGeo.lat - originGeo.lat) * Math.PI) / 180;
  const dLng = ((destGeo.lng - originGeo.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originGeo.lat * Math.PI) / 180) *
      Math.cos((destGeo.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.max(0.8, Number((6371 * c * 1.35).toFixed(1)));
  const etaMinutes = Math.max(6, Math.round(distanceKm * 4.5));

  const origX = (originGeo.mapX / 100) * 760 + 20;
  const origY = (originGeo.mapY / 100) * 280 + 20;
  const destX = (destGeo.mapX / 100) * 760 + 20;
  const destY = (destGeo.mapY / 100) * 280 + 20;
  const midX = (origX + destX) / 2;
  const midY = Math.min(origY, destY) - 35;

  const activePartnerLabel =
    assignedPartnerName ||
    (isFirstLeg
      ? firstDeliveryPartnerName
      : secondDeliveryPartnerName || 'Delivery Partner');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-white shadow-md">
      {/* Top Stage Switcher Bar: First Delivery vs Second Delivery */}
      <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedLeg('first_delivery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isFirstLeg
                ? 'bg-[#000080] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>1st Delivery: Customer → Tailor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedLeg('second_delivery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isFirstLeg
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>2nd Delivery: Tailor → Customer</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRequestDeviceLocation && (
            <button
              type="button"
              onClick={onRequestDeviceLocation}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isLiveDeviceLocation ? 'Live Device GPS Active' : 'Enable Device GPS'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setMapEngine((m) =>
                m === 'google_map'
                  ? 'satellite'
                  : m === 'satellite'
                  ? 'vector'
                  : 'google_map'
              )
            }
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {mapEngine === 'google_map'
                ? 'Google Map (Default) · Switch Satellite'
                : mapEngine === 'satellite'
                ? 'Google Satellite · Switch Radar'
                : 'Radar View · Switch Google Map'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowTurnByTurn((s) => !s)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{showTurnByTurn ? 'Hide Directions' : 'Navigate Route'}</span>
          </button>
        </div>
      </div>

      {/* Route Summary Strip with Live Coordinates */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {originTitle}
            </div>
            <div className="font-semibold text-white truncate">{originGeo.address}</div>
            <div className="font-mono text-[10px] text-blue-300">
              GPS: {originGeo.lat.toFixed(5)}° N, {originGeo.lng.toFixed(5)}° E
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {destTitle}
            </div>
            <div className="font-semibold text-white truncate">{destGeo.address}</div>
            <div className="font-mono text-[10px] text-emerald-300">
              GPS: {destGeo.lat.toFixed(5)}° N, {destGeo.lng.toFixed(5)}° E
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center md:items-end">
          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {distanceKm} km · ~{etaMinutes} mins
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-medium mt-0.5">
            Status: <strong className="text-white">{legStatusLabel}</strong>
          </div>
          <div className="text-[10px] text-slate-400">
            Partner: {activePartnerLabel}
            {typeof partnerLat === 'number' && typeof partnerLng === 'number' && (
              <span className="font-mono text-emerald-400 ml-1">
                ({partnerLat.toFixed(4)}°, {partnerLng.toFixed(4)}°)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map Viewport — Default is Genuine Real-World Google Map */}
      <div className={`relative w-full ${compact ? 'h-60' : 'h-76'} bg-[#0F172A] overflow-hidden`}>
        {mapEngine !== 'vector' ? (
          <TrenchStageRouteGoogleMap
            orderNumber={orderNumber}
            isFirstLeg={isFirstLeg}
            customerName={customerName}
            tailorShopName={tailorShopName}
            originGeo={originGeo}
            destGeo={destGeo}
            partnerName={activePartnerLabel}
            legStatusLabel={legStatusLabel}
            partnerLat={partnerLat}
            partnerLng={partnerLng}
            isLiveDeviceLocation={isLiveDeviceLocation}
            onRequestLocationPermission={onRequestDeviceLocation}
            mapTypeId={mapEngine === 'satellite' ? 'hybrid' : 'roadmap'}
          />
        ) : (
          <svg
            viewBox="0 0 800 320"
            className="w-full h-full block object-cover"
            role="img"
            aria-label={`${isFirstLeg ? 'First Delivery' : 'Second Delivery'} Route Map`}
          >
            <rect width="800" height="320" fill="#0F172A" />

            {/* Urban Road Grid */}
            <g fill="#1E293B" stroke="#0F172A" strokeWidth="2">
              <rect x="20" y="15" width="170" height="85" rx="8" />
              <rect x="220" y="15" width="170" height="85" rx="8" />
              <rect x="420" y="15" width="170" height="85" rx="8" />
              <rect x="620" y="15" width="160" height="85" rx="8" />

              <rect x="20" y="125" width="170" height="80" rx="8" />
              <rect x="220" y="125" width="170" height="80" rx="8" />
              <rect x="420" y="125" width="170" height="80" rx="8" fill="#133226" />
              <rect x="620" y="125" width="160" height="80" rx="8" />

              <rect x="20" y="230" width="170" height="75" rx="8" />
              <rect x="220" y="230" width="170" height="75" rx="8" />
              <rect x="420" y="230" width="170" height="75" rx="8" />
              <rect x="620" y="230" width="160" height="75" rx="8" />
            </g>

            {/* Arterial Roads */}
            <g stroke="#334155" strokeWidth="22" fill="none">
              <path d="M 0 112 L 800 112" />
              <path d="M 0 218 L 800 218" />
              <path d="M 205 0 L 205 320" />
              <path d="M 405 0 L 405 320" />
              <path d="M 605 0 L 605 320" />
            </g>

            {/* Active Delivery Route Path */}
            <path
              d={`M ${origX} ${origY} Q ${midX} ${midY} ${destX} ${destY}`}
              fill="none"
              stroke={isFirstLeg ? '#38BDF8' : '#10B981'}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={`M ${origX} ${origY} Q ${midX} ${midY} ${destX} ${destY}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="8 6"
            />

            {/* Origin Pin */}
            <g transform={`translate(${origX}, ${origY})`}>
              <circle r="18" fill="rgba(56, 189, 248, 0.2)" />
              <circle r="10" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
              <rect
                x="-75"
                y="-42"
                width="150"
                height="26"
                rx="6"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
              <text x="0" y="-29" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
                {isFirstLeg ? `PICKUP: ${customerName}` : `PICKUP: ${tailorShopName}`}
              </text>
              <text x="0" y="-19" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="monospace">
                {originGeo.lat.toFixed(4)}, {originGeo.lng.toFixed(4)}
              </text>
            </g>

            {/* Destination Pin */}
            <g transform={`translate(${destX}, ${destY})`}>
              <circle r="20" fill="rgba(16, 185, 129, 0.25)" />
              <circle r="11" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
              <rect
                x="-80"
                y="16"
                width="160"
                height="26"
                rx="6"
                fill="#0F172A"
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <text x="0" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
                {isFirstLeg ? `DROP: ${tailorShopName}` : `DROP: ${customerName}`}
              </text>
              <text x="0" y="38" textAnchor="middle" fill="#6EE7B7" fontSize="8" fontFamily="monospace">
                {destGeo.lat.toFixed(4)}, {destGeo.lng.toFixed(4)}
              </text>
            </g>
          </svg>
        )}
      </div>

      {/* Expandable Turn-by-Turn Navigation Drawer */}
      {showTurnByTurn && (
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>
                Live GPS Turn-by-Turn Route ({isFirstLeg ? 'Customer → Tailor' : 'Tailor → Customer'})
              </span>
            </span>
            <span className="font-mono text-[11px] text-emerald-400">
              {distanceKm} km · {etaMinutes} mins via Live GPS Route
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400">STEP 1 · PICKUP ORIGIN</div>
              <div className="font-semibold text-white mt-0.5">
                Depart from {originGeo.address}
              </div>
              <div className="text-[10px] font-mono text-blue-300 mt-0.5">
                {originGeo.lat.toFixed(5)}°, {originGeo.lng.toFixed(5)}°
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400">STEP 2 · LIVE DEVICE ROUTE</div>
              <div className="font-semibold text-white mt-0.5">
                Follow live Google Maps road route ({distanceKm} km)
              </div>
              {typeof partnerLat === 'number' && typeof partnerLng === 'number' && (
                <div className="text-[10px] font-mono text-emerald-300 mt-0.5">
                  Device GPS: {partnerLat.toFixed(5)}°, {partnerLng.toFixed(5)}°
                </div>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400">STEP 3 · DESTINATION</div>
              <div className="font-semibold text-emerald-300 mt-0.5">
                Arrive at {destGeo.address}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                {destGeo.lat.toFixed(5)}°, {destGeo.lng.toFixed(5)}°
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

