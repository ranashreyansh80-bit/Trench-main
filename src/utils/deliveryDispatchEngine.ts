import {
  IncomingDeliveryOffer,
  OfferLatLng,
  PartnerLiveLocation,
} from '../types/appTypes.ts';

export const DEFAULT_OFFER_TTL_SECONDS = 45;
export const DEFAULT_MAX_GPS_STALE_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_SERVICE_RADIUS_KM = 15;

/**
 * Calculates the great-circle distance between two GPS coordinates in kilometers
 * using the Haversine formula. Returns null if either coordinate is missing/invalid.
 */
export function calculateHaversineDistanceKm(
  origin?: OfferLatLng | null,
  destination?: OfferLatLng | null
): number | null {
  if (
    !origin ||
    !destination ||
    typeof origin.lat !== 'number' ||
    typeof origin.lng !== 'number' ||
    typeof destination.lat !== 'number' ||
    typeof destination.lng !== 'number' ||
    Number.isNaN(origin.lat) ||
    Number.isNaN(origin.lng) ||
    Number.isNaN(destination.lat) ||
    Number.isNaN(destination.lng)
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

export interface DiscoveredPartnerCandidate {
  partner: PartnerLiveLocation;
  distanceKm: number;
  etaMinutes: number;
}

export interface PartnerDiscoveryOptions {
  nowMs?: number;
  maxStaleMs?: number;
  defaultRadiusKm?: number;
  excludedPartnerIds?: Set<string>;
}

/**
 * Step 8: Delivery Partner Discovery
 * 1. Identify restaurant/tailor pickup location.
 * 2. Find online delivery partners.
 * 3. Check their latest GPS coordinates & exclude stale locations.
 * 4. Filter by service radius.
 * 5. Sort by distance ascending.
 */
export function discoverEligiblePartners(
  pickupCoords: OfferLatLng | null | undefined,
  partners: PartnerLiveLocation[],
  options: PartnerDiscoveryOptions = {}
): DiscoveredPartnerCandidate[] {
  const nowMs = options.nowMs ?? Date.now();
  const maxStaleMs = options.maxStaleMs ?? DEFAULT_MAX_GPS_STALE_MS;
  const defaultRadiusKm = options.defaultRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM;
  const excluded = options.excludedPartnerIds ?? new Set<string>();

  const candidates: DiscoveredPartnerCandidate[] = [];

  for (const partner of partners) {
    // Exclude offline partners
    if (!partner.isOnline) continue;

    // Exclude already-tried / rejected partners for this order
    if (
      excluded.has(partner.partnerId) ||
      (partner.partnerPhone && excluded.has(partner.partnerPhone))
    ) {
      continue;
    }

    // Check latest GPS timestamp for staleness
    const updatedMs = Date.parse(partner.updatedAt);
    if (Number.isNaN(updatedMs) || nowMs - updatedMs > maxStaleMs) {
      continue;
    }

    // Require valid GPS coordinates when pickupCoords are provided
    if (pickupCoords && typeof pickupCoords.lat === 'number' && typeof pickupCoords.lng === 'number') {
      if (typeof partner.lat !== 'number' || typeof partner.lng !== 'number') {
        continue;
      }
      const dist = calculateHaversineDistanceKm(pickupCoords, {
        lat: partner.lat,
        lng: partner.lng,
      });
      if (dist === null) continue;

      const radiusLimit =
        partner.serviceRadiusKm > 0 ? partner.serviceRadiusKm : defaultRadiusKm;
      if (dist > radiusLimit) {
        continue;
      }

      const etaMinutes = Math.max(5, Math.round(dist * 3.5 + 4));
      candidates.push({
        partner,
        distanceKm: dist,
        etaMinutes,
      });
    } else {
      // Graceful fallback when order does not specify exact coordinates
      // Still requires partner to have non-stale status and online state
      if (typeof partner.lat !== 'number' || typeof partner.lng !== 'number') {
        continue;
      }
      candidates.push({
        partner,
        distanceKm: 2.4,
        etaMinutes: 12,
      });
    }
  }

  // Sort by shortest distance first
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  return candidates;
}

/**
 * Masks customer phone number unless the partner is authorized (e.g. assigned or verified owner).
 */
export function formatAuthorizedCustomerPhone(
  phone: string | undefined,
  isAuthorized: boolean
): string {
  if (!phone) return 'Not available';
  if (isAuthorized) return phone;
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '••••';
  return `${cleaned.slice(0, 4)} •••• ••${cleaned.slice(-2)}`;
}

export interface OfferActionValidationResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  acceptedOffer?: IncomingDeliveryOffer;
  cancelledOfferIds?: string[];
  rejectedOffer?: IncomingDeliveryOffer;
}

/**
 * Pure atomic validation and state transition for accepting a delivery offer.
 * Used inside backend mutex/transaction to guarantee single-partner assignment.
 */
export function evaluateAtomicOfferAcceptance(
  offersForOrder: IncomingDeliveryOffer[],
  targetOfferId: string,
  authenticatedPartnerId: string,
  authenticatedPartnerPhone: string,
  isOrderAlreadyAssigned: boolean,
  nowMs: number = Date.now()
): OfferActionValidationResult {
  if (!authenticatedPartnerId && !authenticatedPartnerPhone) {
    return {
      success: false,
      statusCode: 401,
      error: 'Authentication required: Delivery partner identity missing.',
    };
  }

  const target = offersForOrder.find((o) => o.offerId === targetOfferId);
  if (!target) {
    return {
      success: false,
      statusCode: 404,
      error: 'Delivery offer not found.',
    };
  }

  const ownsOffer =
    (authenticatedPartnerId &&
      (target.partnerId === authenticatedPartnerId ||
        target.partnerPhone === authenticatedPartnerId)) ||
    (authenticatedPartnerPhone &&
      (target.partnerPhone === authenticatedPartnerPhone ||
        target.partnerId === authenticatedPartnerPhone));

  if (!ownsOffer) {
    return {
      success: false,
      statusCode: 403,
      error: 'Forbidden: This delivery offer belongs to another delivery partner.',
    };
  }

  if (target.status === 'cancelled') {
    return {
      success: false,
      statusCode: 409,
      error: 'This order was cancelled or already assigned to another partner.',
    };
  }

  if (target.status !== 'pending') {
    return {
      success: false,
      statusCode: 409,
      error: `Offer cannot be accepted because its status is '${target.status}'.`,
    };
  }

  const expiresMs = Date.parse(target.expiresAt);
  if (!Number.isNaN(expiresMs) && expiresMs <= nowMs) {
    return {
      success: false,
      statusCode: 410,
      error: 'Offer has expired.',
    };
  }

  const existingAccepted = offersForOrder.find(
    (o) => o.status === 'accepted' && o.offerId !== targetOfferId
  );
  if (isOrderAlreadyAssigned || existingAccepted) {
    return {
      success: false,
      statusCode: 409,
      error: 'Order has already been assigned to another delivery partner.',
    };
  }

  const nowIso = new Date(nowMs).toISOString();
  const acceptedOffer: IncomingDeliveryOffer = {
    ...target,
    status: 'accepted',
    respondedAt: nowIso,
    customerPhoneAuthorized: true,
  };

  const cancelledOfferIds = offersForOrder
    .filter((o) => o.offerId !== targetOfferId && o.status === 'pending')
    .map((o) => o.offerId);

  return {
    success: true,
    statusCode: 200,
    acceptedOffer,
    cancelledOfferIds,
  };
}

/**
 * Pure validation and state transition for rejecting a delivery offer.
 * Does NOT cancel the customer's actual order; marks only this partner's offer as 'rejected'.
 */
export function evaluateOfferRejection(
  offersForOrder: IncomingDeliveryOffer[],
  targetOfferId: string,
  authenticatedPartnerId: string,
  authenticatedPartnerPhone: string,
  nowMs: number = Date.now()
): OfferActionValidationResult {
  if (!authenticatedPartnerId && !authenticatedPartnerPhone) {
    return {
      success: false,
      statusCode: 401,
      error: 'Authentication required: Delivery partner identity missing.',
    };
  }

  const target = offersForOrder.find((o) => o.offerId === targetOfferId);
  if (!target) {
    return {
      success: false,
      statusCode: 404,
      error: 'Delivery offer not found.',
    };
  }

  const ownsOffer =
    (authenticatedPartnerId &&
      (target.partnerId === authenticatedPartnerId ||
        target.partnerPhone === authenticatedPartnerId)) ||
    (authenticatedPartnerPhone &&
      (target.partnerPhone === authenticatedPartnerPhone ||
        target.partnerId === authenticatedPartnerPhone));

  if (!ownsOffer) {
    return {
      success: false,
      statusCode: 403,
      error: 'Forbidden: You cannot reject an offer belonging to another partner.',
    };
  }

  if (target.status !== 'pending') {
    return {
      success: false,
      statusCode: 409,
      error: `Offer is already '${target.status}'.`,
    };
  }

  const rejectedOffer: IncomingDeliveryOffer = {
    ...target,
    status: 'rejected',
    respondedAt: new Date(nowMs).toISOString(),
  };

  return {
    success: true,
    statusCode: 200,
    rejectedOffer,
  };
}
