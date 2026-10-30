import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  User,
  Volume2,
  VolumeX,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { IncomingDeliveryOffer } from '../types/appTypes.ts';

export interface IncomingDeliveryOrderProps {
  offer: IncomingDeliveryOffer | null;
  remainingSeconds: number;
  totalSeconds?: number;
  queuedCount?: number;
  isAccepting: boolean;
  isRejecting: boolean;
  error: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onAccept: () => void;
  onReject: () => void;
  onDismissError?: () => void;
}

/**
 * Draws the Google Maps route polyline and fits bounds between Pickup and Delivery coordinates
 */
const OfferRoutePolylineOverlay: React.FC<{
  pickupCoords: { lat: number; lng: number };
  deliveryCoords: { lat: number; lng: number };
}> = ({ pickupCoords, deliveryCoords }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;

    const path = [pickupCoords, deliveryCoords];
    const polyline = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: '#10b981',
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map,
    });

    // Fit map bounds to show both pickup and delivery markers clearly
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupCoords);
      bounds.extend(deliveryCoords);
      map.fitBounds(bounds, { top: 28, right: 28, bottom: 28, left: 28 });
    } catch {
      // Ignore bounds error if map not ready
    }

    return () => {
      polyline.setMap(null);
    };
  }, [
    map,
    mapsLib,
    pickupCoords.lat,
    pickupCoords.lng,
    deliveryCoords.lat,
    deliveryCoords.lng,
  ]);

  return null;
};

export const IncomingDeliveryOrder: React.FC<IncomingDeliveryOrderProps> = ({
  offer,
  remainingSeconds,
  totalSeconds = 45,
  queuedCount = 1,
  isAccepting,
  isRejecting,
  error,
  isMuted,
  onToggleMute,
  onAccept,
  onReject,
  onDismissError,
}) => {
  const hasValidCoordinates = useMemo(() => {
    if (!offer?.pickupCoords || !offer?.deliveryCoords) return false;
    return (
      typeof offer.pickupCoords.lat === 'number' &&
      typeof offer.pickupCoords.lng === 'number' &&
      !Number.isNaN(offer.pickupCoords.lat) &&
      !Number.isNaN(offer.pickupCoords.lng) &&
      typeof offer.deliveryCoords.lat === 'number' &&
      typeof offer.deliveryCoords.lng === 'number' &&
      !Number.isNaN(offer.deliveryCoords.lat) &&
      !Number.isNaN(offer.deliveryCoords.lng)
    );
  }, [offer?.pickupCoords, offer?.deliveryCoords]);

  const googleMapsNavUrl = useMemo(() => {
    if (!offer) return 'https://www.google.com/maps';
    if (hasValidCoordinates && offer.pickupCoords && offer.deliveryCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${offer.pickupCoords.lat},${offer.pickupCoords.lng}&destination=${offer.deliveryCoords.lat},${offer.deliveryCoords.lng}&travelmode=two-wheeler`;
    }
    const originQuery = encodeURIComponent(offer.pickupAddress || offer.restaurantName);
    const destQuery = encodeURIComponent(offer.deliveryAddress || 'Customer Address');
    return `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=two-wheeler`;
  }, [offer, hasValidCoordinates]);

  if (!offer) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((remainingSeconds / Math.max(1, totalSeconds)) * 100))
  );
  const isUrgentCountdown = remainingSeconds <= 12;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-delivery-order-title"
      data-testid="incoming-delivery-order-modal"
    >
      <div className="w-full max-w-md bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[96dvh]">
        {/* Top Countdown Progress Bar */}
        <div className="w-full h-2 bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isUrgentCountdown ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Zomato-Style Ringing Header Bar */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="incoming-delivery-order-title"
                  className="text-sm font-black uppercase tracking-wider text-white truncate"
                >
                  New Delivery Order
                </h2>
                {queuedCount > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[10px] font-extrabold text-blue-300">
                    +{queuedCount - 1} more
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-300 truncate">
                Order ID:{' '}
                <strong
                  className="text-emerald-400"
                  data-testid="popup-order-number"
                >
                  #{offer.orderNumber}
                </strong>
              </p>
            </div>
          </div>

          {/* Right: Audio Ring Mute Toggle + Countdown Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute ringing sound' : 'Mute ringing sound'}
              data-testid="popup-mute-btn"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 animate-pulse" />
              )}
            </button>

            <div
              data-testid="popup-countdown-timer"
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black flex items-center gap-1.5 border ${
                isUrgentCountdown
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{remainingSeconds}s</span>
            </div>
          </div>
        </div>

        {/* Scrollable Popup Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Error Banner if Acceptance/Rejection Failed */}
          {error && (
            <div
              role="alert"
              data-testid="popup-error-banner"
              className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
              {onDismissError && (
                <button
                  type="button"
                  onClick={onDismissError}
                  className="text-[11px] font-bold text-rose-300 hover:text-white underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Hero Earnings & Order Amount Banner (Zomato-style) */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-800/90 to-slate-800 border border-emerald-500/30">
            <div className="col-span-1 border-r border-slate-700/80 pr-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Your Earnings
              </div>
              <div
                data-testid="popup-partner-earnings"
                className="text-xl sm:text-2xl font-black font-mono text-emerald-400 flex items-center mt-0.5"
              >
                <IndianRupee className="w-4 h-4 -mr-0.5" />
                <span>{offer.estimatedEarningsINR}</span>
              </div>
              <div className="text-[10px] text-slate-400">Guaranteed Payout</div>
            </div>

            <div className="col-span-1 border-r border-slate-700/80 px-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Order Amount
              </div>
              <div
                data-testid="popup-order-amount"
                className="text-base sm:text-lg font-black font-mono text-white flex items-center mt-1"
              >
                <IndianRupee className="w-3.5 h-3.5 -mr-0.5 text-slate-300" />
                <span>{offer.orderAmountINR}</span>
              </div>
              <div className="text-[10px] text-slate-400">Pre-verified</div>
            </div>

            <div className="col-span-1 pl-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Trip Distance
              </div>
              <div
                data-testid="popup-trip-distance"
                className="text-base sm:text-lg font-black font-mono text-amber-300 mt-1"
              >
                {offer.distanceKm.toFixed(1)} km
              </div>
              <div className="text-[10px] text-slate-400">
                ~{offer.etaMinutes} mins ETA
              </div>
            </div>
          </div>

          {/* Restaurant / Tailor Shop & Customer Details + Pickup & Drop Addresses */}
          <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-3.5 space-y-3">
            {/* Pickup Location (Restaurant / Tailor Atelier) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    Pickup • Restaurant / Atelier
                  </span>
                </div>
                <div
                  data-testid="popup-restaurant-name"
                  className="text-xs sm:text-sm font-black text-white truncate"
                >
                  {offer.restaurantName}
                </div>
                <div
                  data-testid="popup-pickup-address"
                  className="text-xs text-slate-300 leading-snug mt-0.5"
                >
                  {offer.pickupAddress}
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-700" />

            {/* Delivery Location & Customer Name + Authorized Phone */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Deliver To • Customer
                  </span>
                </div>
                <div
                  data-testid="popup-customer-name"
                  className="text-xs sm:text-sm font-black text-white"
                >
                  {offer.customerName}
                </div>
                <div
                  data-testid="popup-delivery-address"
                  className="text-xs text-slate-300 leading-snug"
                >
                  {offer.deliveryAddress}
                </div>

                {/* Authorized Customer Phone Row */}
                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span data-testid="popup-customer-phone">
                      {offer.customerPhone || 'Protected'}
                    </span>
                  </div>
                  {offer.customerPhoneAuthorized ? (
                    <a
                      href={`tel:${offer.customerPhone}`}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Authorized Call</span>
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-700/80 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Unlocks on Accept</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 6: Google Maps Route Preview & Navigation Link */}
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Route Preview ({offer.distanceKm.toFixed(1)} km)</span>
              </div>
              <a
                href={googleMapsNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="popup-google-maps-link"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {hasValidCoordinates && offer.pickupCoords && offer.deliveryCoords ? (
              <div
                className="w-full h-40 relative bg-slate-900"
                data-testid="popup-route-map"
              >
                <Map
                  defaultCenter={offer.pickupCoords}
                  defaultZoom={13}
                  mapId="DEMO_MAP_ID"
                  gestureHandling="cooperative"
                  disableDefaultUI={true}
                  internalUsageAttributionIds={[
                    'gmp_mcp_codeassist_v1_aistudio',
                  ]}
                  className="w-full h-full"
                >
                  {/* Restaurant / Tailor Pickup Marker */}
                  <AdvancedMarker
                    position={offer.pickupCoords}
                    title={`Pickup: ${offer.restaurantName}`}
                  >
                    <div className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] shadow-lg border border-white flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      <span>PICKUP</span>
                    </div>
                  </AdvancedMarker>

                  {/* Customer Delivery Marker */}
                  <AdvancedMarker
                    position={offer.deliveryCoords}
                    title={`Delivery: ${offer.customerName}`}
                  >
                    <div className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] shadow-lg border border-white flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>DROP</span>
                    </div>
                  </AdvancedMarker>

                  <OfferRoutePolylineOverlay
                    pickupCoords={offer.pickupCoords}
                    deliveryCoords={offer.deliveryCoords}
                  />
                </Map>
              </div>
            ) : (
              /* Graceful Fallback When Exact Coordinates Are Missing (No Fake Coordinates) */
              <div
                data-testid="popup-missing-coords-fallback"
                className="p-3.5 bg-slate-900/70 text-xs text-slate-300 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Exact GPS coordinates not provided for this address. Use turn-by-turn address navigation.
                  </span>
                </div>
                <a
                  href={googleMapsNavUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] shrink-0"
                >
                  Navigate
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Buttons: REJECT ORDER (Red) & ACCEPT ORDER (Green) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-5 gap-3">
          <button
            type="button"
            disabled={isAccepting || isRejecting}
            onClick={onReject}
            data-testid="reject-order-btn"
            className="col-span-2 py-3.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            {isRejecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>REJECT ORDER</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isAccepting || isRejecting}
            onClick={onAccept}
            data-testid="accept-order-btn"
            className="col-span-3 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Accepting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ACCEPT ORDER</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

