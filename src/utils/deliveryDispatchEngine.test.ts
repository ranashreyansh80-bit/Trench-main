import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKm,
  discoverEligiblePartners,
  evaluateAtomicOfferAcceptance,
  evaluateOfferRejection,
  formatAuthorizedCustomerPhone,
} from './deliveryDispatchEngine.ts';
import { IncomingDeliveryOffer, PartnerLiveLocation } from '../types/appTypes.ts';

test('Step 8: Partner Discovery filters out offline, stale GPS, and out-of-radius partners and sorts by distance', () => {
  const now = Date.now();
  const pickup = { lat: 12.9716, lng: 77.5946 }; // Bengaluru MG Road

  const partners: PartnerLiveLocation[] = [
    {
      partnerId: 'p-offline',
      partnerPhone: '+91 90000 00001',
      partnerName: 'Offline Rider',
      isOnline: false,
      lat: 12.972,
      lng: 77.595,
      serviceRadiusKm: 15,
      updatedAt: new Date(now - 10_000).toISOString(),
    },
    {
      partnerId: 'p-stale',
      partnerPhone: '+91 90000 00002',
      partnerName: 'Stale GPS Rider',
      isOnline: true,
      lat: 12.972,
      lng: 77.595,
      serviceRadiusKm: 15,
      updatedAt: new Date(now - 45 * 60 * 1000).toISOString(), // 45 mins old -> stale
    },
    {
      partnerId: 'p-far',
      partnerPhone: '+91 90000 00003',
      partnerName: 'Out of Radius Rider',
      isOnline: true,
      lat: 13.1986, // Kempegowda Airport (~26km away)
      lng: 77.7066,
      serviceRadiusKm: 10,
      updatedAt: new Date(now - 5_000).toISOString(),
    },
    {
      partnerId: 'p-second-closest',
      partnerPhone: '+91 90000 00004',
      partnerName: 'Indiranagar Rider',
      isOnline: true,
      lat: 12.9784,
      lng: 77.6408, // ~5km away
      serviceRadiusKm: 15,
      updatedAt: new Date(now - 5_000).toISOString(),
    },
    {
      partnerId: 'p-closest',
      partnerPhone: '+91 90000 00005',
      partnerName: 'Brigade Road Rider',
      isOnline: true,
      lat: 12.9719,
      lng: 77.607, // ~1.3km away
      serviceRadiusKm: 15,
      updatedAt: new Date(now - 5_000).toISOString(),
    },
  ];

  const discovered = discoverEligiblePartners(pickup, partners, { nowMs: now });
  assert.equal(discovered.length, 2);
  assert.equal(discovered[0].partner.partnerId, 'p-closest');
  assert.equal(discovered[1].partner.partnerId, 'p-second-closest');
  assert.ok(discovered[0].distanceKm < discovered[1].distanceKm);
});

test('Step 4: Atomic Offer Acceptance verifies ownership, expiration, and cancels competing offers', () => {
  const now = Date.now();
  const offers: IncomingDeliveryOffer[] = [
    {
      offerId: 'off-1',
      orderId: 'ord-500',
      orderNumber: 'TRN-500',
      partnerId: 'partner-A',
      partnerPhone: '+91 98765 43210',
      customerName: 'Riya Kapoor',
      customerPhone: '+91 98111 22334',
      restaurantName: 'Royal Master Tailors',
      orderAmountINR: 750,
      estimatedEarningsINR: 95,
      pickupAddress: 'Indiranagar',
      deliveryAddress: 'Koramangala',
      distanceKm: 3.2,
      etaMinutes: 14,
      status: 'pending',
      createdAt: new Date(now - 5_000).toISOString(),
      expiresAt: new Date(now + 40_000).toISOString(),
    },
    {
      offerId: 'off-2',
      orderId: 'ord-500',
      orderNumber: 'TRN-500',
      partnerId: 'partner-B',
      partnerPhone: '+91 98765 00000',
      customerName: 'Riya Kapoor',
      customerPhone: '+91 98111 22334',
      restaurantName: 'Royal Master Tailors',
      orderAmountINR: 750,
      estimatedEarningsINR: 95,
      pickupAddress: 'Indiranagar',
      deliveryAddress: 'Koramangala',
      distanceKm: 4.1,
      etaMinutes: 18,
      status: 'pending',
      createdAt: new Date(now - 5_000).toISOString(),
      expiresAt: new Date(now + 40_000).toISOString(),
    },
  ];

  // 1. Unauthorized partner cannot accept offer belonging to partner-A
  const unauthorizedRes = evaluateAtomicOfferAcceptance(
    offers,
    'off-1',
    'partner-HACKER',
    '+91 00000 00000',
    false,
    now
  );
  assert.equal(unauthorizedRes.success, false);
  assert.equal(unauthorizedRes.statusCode, 403);

  // 2. Expired offer cannot be accepted
  const expiredRes = evaluateAtomicOfferAcceptance(
    offers,
    'off-1',
    'partner-A',
    '+91 98765 43210',
    false,
    now + 60_000 // 60s in future -> past expiresAt
  );
  assert.equal(expiredRes.success, false);
  assert.equal(expiredRes.statusCode, 410);

  // 3. Valid acceptance by partner-A succeeds and cancels competing offer 'off-2'
  const validRes = evaluateAtomicOfferAcceptance(
    offers,
    'off-1',
    'partner-A',
    '+91 98765 43210',
    false,
    now
  );
  assert.equal(validRes.success, true);
  assert.equal(validRes.acceptedOffer?.status, 'accepted');
  assert.deepEqual(validRes.cancelledOfferIds, ['off-2']);

  // 4. Simultaneous/subsequent acceptance by partner-B fails with 409 Conflict
  const updatedOffers: IncomingDeliveryOffer[] = [
    validRes.acceptedOffer!,
    { ...offers[1], status: 'cancelled' },
  ];
  const simultaneousRes = evaluateAtomicOfferAcceptance(
    updatedOffers,
    'off-2',
    'partner-B',
    '+91 98765 00000',
    false,
    now
  );
  assert.equal(simultaneousRes.success, false);
  assert.equal(simultaneousRes.statusCode, 409);
});

test('Step 5 & 9: Offer Rejection marks only partner offer rejected and Customer Phone is protected', () => {
  const now = Date.now();
  const offer: IncomingDeliveryOffer = {
    offerId: 'off-99',
    orderId: 'ord-99',
    orderNumber: 'TRN-999',
    partnerId: 'partner-A',
    partnerPhone: '+91 98765 43210',
    customerName: 'Vikramaditya',
    customerPhone: '+91 98450 12345',
    restaurantName: 'Atelier Trench',
    orderAmountINR: 620,
    estimatedEarningsINR: 85,
    pickupAddress: 'MG Road',
    deliveryAddress: 'HSR Layout',
    distanceKm: 5.5,
    etaMinutes: 22,
    status: 'pending',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 45_000).toISOString(),
  };

  assert.equal(
    formatAuthorizedCustomerPhone(offer.customerPhone, false),
    '+91  •••• ••45'
  );
  assert.equal(
    formatAuthorizedCustomerPhone(offer.customerPhone, true),
    '+91 98450 12345'
  );

  const rejectRes = evaluateOfferRejection(
    [offer],
    'off-99',
    'partner-A',
    '+91 98765 43210',
    now
  );
  assert.equal(rejectRes.success, true);
  assert.equal(rejectRes.rejectedOffer?.status, 'rejected');

  const dist = calculateHaversineDistanceKm(
    { lat: 12.9716, lng: 77.5946 },
    { lat: 12.9352, lng: 77.6245 }
  );
  assert.ok(dist !== null && dist > 4 && dist < 6);
});
