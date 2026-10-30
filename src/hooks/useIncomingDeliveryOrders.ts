import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';
import {
  DeliveryTask,
  IncomingDeliveryOffer,
  OfferLatLng,
} from '../types/appTypes.ts';
import { deliveryOrderRingtone } from '../utils/ringtone.ts';
import {
  initSupabaseOrderNotifications,
  showSupabaseOfferNotification,
} from '../utils/supabaseNotificationClient.ts';
import { formatAuthorizedCustomerPhone } from '../utils/deliveryDispatchEngine.ts';

export interface UseIncomingDeliveryOrdersParams {
  partnerId: string;
  partnerPhone: string;
  partnerName: string;
  vehicleType?: string;
  vehicleNumber?: string;
  isOnline: boolean;
  liveCoords?: OfferLatLng | null;
  onOrderAccepted?: (task: DeliveryTask, offer: IncomingDeliveryOffer) => void;
  onOrderRejected?: (offerId: string) => void;
}

export interface UseIncomingDeliveryOrdersReturn {
  activeOffer: IncomingDeliveryOffer | null;
  queuedCount: number;
  remainingSeconds: number;
  totalSeconds: number;
  isAccepting: boolean;
  isRejecting: boolean;
  actionError: string | null;
  isMuted: boolean;
  toggleMute: () => void;
  acceptOffer: (offerId?: string) => Promise<boolean>;
  rejectOffer: (offerId?: string) => Promise<boolean>;
  clearActionError: () => void;
  dispatchLiveTestOffer: () => Promise<void>;
}

/**
 * Normalize a raw row from Supabase `delivery_offers` into `IncomingDeliveryOffer`
 */
function mapSupabaseRowToOffer(row: Record<string, any>): IncomingDeliveryOffer {
  const authorized = row.status === 'accepted';
  const rawPhone = String(row.customer_phone || row.customerPhone || '');
  return {
    offerId: String(row.offer_id || row.offerId),
    orderId: String(row.order_id || row.orderId),
    orderNumber: String(row.order_number || row.orderNumber || 'TRN-0000'),
    taskId: row.task_id || row.taskId || undefined,
    partnerId: String(row.partner_id || row.partnerId || ''),
    partnerPhone: String(row.partner_phone || row.partnerPhone || ''),
    customerName: String(row.customer_name || row.customerName || 'Customer'),
    customerPhone: formatAuthorizedCustomerPhone(rawPhone, authorized),
    customerPhoneAuthorized: authorized,
    restaurantName: String(
      row.restaurant_name || row.restaurantName || 'Tailor Atelier'
    ),
    orderAmountINR: Number(row.order_amount_inr ?? row.orderAmountINR ?? 0),
    estimatedEarningsINR: Number(
      row.estimated_earnings_inr ?? row.estimatedEarningsINR ?? 85
    ),
    pickupAddress: String(row.pickup_address || row.pickupAddress || ''),
    deliveryAddress: String(row.delivery_address || row.deliveryAddress || ''),
    pickupCoords:
      row.pickup_lat !== null &&
      row.pickup_lat !== undefined &&
      row.pickup_lng !== null &&
      row.pickup_lng !== undefined
        ? { lat: Number(row.pickup_lat), lng: Number(row.pickup_lng) }
        : row.pickupCoords || null,
    deliveryCoords:
      row.delivery_lat !== null &&
      row.delivery_lat !== undefined &&
      row.delivery_lng !== null &&
      row.delivery_lng !== undefined
        ? { lat: Number(row.delivery_lat), lng: Number(row.delivery_lng) }
        : row.deliveryCoords || null,
    distanceKm: Number(row.distance_km ?? row.distanceKm ?? 0),
    etaMinutes: Number(row.eta_minutes ?? row.etaMinutes ?? 15),
    garmentSummary: String(row.garment_summary || row.garmentSummary || ''),
    deliveryStage: (row.delivery_stage ||
      row.deliveryStage ||
      'first_delivery') as any,
    status: (row.status || 'pending') as any,
    expiresAt: String(row.expires_at || row.expiresAt),
    createdAt: String(
      row.created_at || row.createdAt || new Date().toISOString()
    ),
    respondedAt: row.responded_at || row.respondedAt || null,
  };
}

export function useIncomingDeliveryOrders({
  partnerId,
  partnerPhone,
  partnerName,
  vehicleType,
  vehicleNumber,
  isOnline,
  liveCoords,
  onOrderAccepted,
  onOrderRejected,
}: UseIncomingDeliveryOrdersParams): UseIncomingDeliveryOrdersReturn {
  const [offersQueue, setOffersQueue] = useState<IncomingDeliveryOffer[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(45);
  const [totalSeconds, setTotalSeconds] = useState<number>(45);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    deliveryOrderRingtone.isMuted()
  );

  // Track processed/terminated offer IDs to prevent duplicate popups
  const handledOfferIdsRef = useRef<Set<string>>(new Set());
  const notifiedOfferIdsRef = useRef<Set<string>>(new Set());

  const resolvedPartnerId = (partnerId || partnerPhone || 'partner-default').trim();
  const resolvedPartnerPhone = (partnerPhone || partnerId || '+91 98765 43210').trim();

  // Upsert or remove offer in local queue with deduplication
  const upsertOfferInQueue = useCallback(
    (incoming: IncomingDeliveryOffer) => {
      if (!incoming || !incoming.offerId) return;

      // Verify this offer belongs to the authenticated partner
      const belongsToMe =
        incoming.partnerId === resolvedPartnerId ||
        incoming.partnerPhone === resolvedPartnerPhone ||
        incoming.partnerId === resolvedPartnerPhone ||
        incoming.partnerPhone === resolvedPartnerId;

      if (!belongsToMe) return;

      const nowMs = Date.now();
      const expiresMs = Date.parse(incoming.expiresAt);
      const isExpired = !Number.isNaN(expiresMs) && expiresMs <= nowMs;

      // If offer is no longer pending or is expired, remove it from queue
      if (incoming.status !== 'pending' || isExpired) {
        handledOfferIdsRef.current.add(incoming.offerId);
        setOffersQueue((prev) =>
          prev.filter((o) => o.offerId !== incoming.offerId)
        );
        return;
      }

      // Prevent re-adding an offer that the user already accepted/rejected/expired locally
      if (handledOfferIdsRef.current.has(incoming.offerId)) {
        return;
      }

      setOffersQueue((prev) => {
        const existingIndex = prev.findIndex(
          (o) => o.offerId === incoming.offerId
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = incoming;
          return updated;
        }
        return [...prev, incoming];
      });

      // Trigger background browser notification via Supabase notification client if tab is hidden
      if (!notifiedOfferIdsRef.current.has(incoming.offerId)) {
        notifiedOfferIdsRef.current.add(incoming.offerId);
        if (typeof document !== 'undefined' && document.hidden) {
          showSupabaseOfferNotification(incoming).catch(() => {});
        }
      }
    },
    [resolvedPartnerId, resolvedPartnerPhone]
  );

  const removeOfferFromQueue = useCallback((offerId: string) => {
    handledOfferIdsRef.current.add(offerId);
    setOffersQueue((prev) => prev.filter((o) => o.offerId !== offerId));
  }, []);

  // 1. Sync Partner Online Status & Live GPS Coordinates to Backend for Discovery
  useEffect(() => {
    if (!resolvedPartnerId) return;

    const syncStatus = () => {
      fetch('/api/delivery/partner-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: resolvedPartnerId,
          partnerPhone: resolvedPartnerPhone,
          partnerName: partnerName || 'Delivery Partner',
          vehicleType: vehicleType || 'EV',
          vehicleNumber: vehicleNumber || '',
          isOnline,
          lat:
            liveCoords && typeof liveCoords.lat === 'number'
              ? liveCoords.lat
              : null,
          lng:
            liveCoords && typeof liveCoords.lng === 'number'
              ? liveCoords.lng
              : null,
          serviceRadiusKm: 15,
        }),
      }).catch(() => {});
    };

    syncStatus();
    const heartbeat = window.setInterval(syncStatus, 30000);
    return () => {
      window.clearInterval(heartbeat);
    };
  }, [
    resolvedPartnerId,
    resolvedPartnerPhone,
    partnerName,
    vehicleType,
    vehicleNumber,
    isOnline,
    liveCoords?.lat,
    liveCoords?.lng,
  ]);

  // 2. Initialize Supabase Realtime & Web Notification permissions when Online
  useEffect(() => {
    if (!isOnline || !resolvedPartnerId) return;
    initSupabaseOrderNotifications(
      resolvedPartnerId,
      resolvedPartnerPhone
    ).catch(() => {});
  }, [isOnline, resolvedPartnerId, resolvedPartnerPhone]);

  // 3. Subscribe to Supabase Realtime (postgres_changes + broadcast) & Backend SSE Stream when Partner is Online
  useEffect(() => {
    if (!isOnline || !resolvedPartnerId) {
      setOffersQueue([]);
      deliveryOrderRingtone.stopRinging();
      return;
    }

    let isMounted = true;

    // A. Initial fetch of active non-expired offers
    fetch(
      `/api/delivery/offers/active?partnerId=${encodeURIComponent(
        resolvedPartnerId
      )}&partnerPhone=${encodeURIComponent(resolvedPartnerPhone)}`,
      {
        headers: {
          'x-partner-id': resolvedPartnerId,
          'x-partner-phone': resolvedPartnerPhone,
        },
      }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.offers)) return;
        for (const offer of data.offers) {
          upsertOfferInQueue(offer);
        }
      })
      .catch(() => {});

    // B. Subscribe to existing Supabase client Realtime channel (`postgres_changes` + `broadcast`)
    const realtimeChannel = supabase
      .channel('trench-delivery-offers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_offers',
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Record<string, any>;
            const id = oldRow?.offer_id || oldRow?.offerId;
            if (id) removeOfferFromQueue(String(id));
            return;
          }
          const newRow = payload.new as Record<string, any>;
          if (newRow && (newRow.offer_id || newRow.offerId)) {
            const mapped = mapSupabaseRowToOffer(newRow);
            upsertOfferInQueue(mapped);
          }
        }
      )
      .on('broadcast', { event: 'incoming_offer' }, ({ payload }) => {
        if (!isMounted || !payload) return;
        setActionError(null);
        upsertOfferInQueue(payload as IncomingDeliveryOffer);
      })
      .on('broadcast', { event: 'offer_cancelled' }, ({ payload }) => {
        if (!isMounted || !payload?.offerId) return;
        removeOfferFromQueue(String(payload.offerId));
      })
      .on('broadcast', { event: 'offer_accepted' }, ({ payload }) => {
        if (!isMounted || !payload?.offer?.offerId) return;
        removeOfferFromQueue(String(payload.offer.offerId));
      })
      .on('broadcast', { event: 'offer_rejected' }, ({ payload }) => {
        if (!isMounted || !payload?.offerId) return;
        removeOfferFromQueue(String(payload.offerId));
      })
      .subscribe();

    // C. Subscribe to Backend SSE stream for instant sub-millisecond delivery
    const sseUrl = `/api/delivery/offers/stream?partnerId=${encodeURIComponent(
      resolvedPartnerId
    )}&partnerPhone=${encodeURIComponent(resolvedPartnerPhone)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('connected', (event: MessageEvent) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data?.activeOffers)) {
          for (const offer of data.activeOffers) {
            upsertOfferInQueue(offer);
          }
        }
      } catch {
        // Ignore parse error
      }
    });

    eventSource.addEventListener('incoming_offer', (event: MessageEvent) => {
      if (!isMounted) return;
      try {
        const offer: IncomingDeliveryOffer = JSON.parse(event.data);
        setActionError(null);
        upsertOfferInQueue(offer);
      } catch {
        // Ignore
      }
    });

    eventSource.addEventListener('offer_cancelled', (event: MessageEvent) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.offerId) {
          removeOfferFromQueue(String(data.offerId));
        }
      } catch {
        // Ignore
      }
    });

    eventSource.addEventListener('offer_accepted', (event: MessageEvent) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.offer?.offerId) {
          removeOfferFromQueue(String(data.offer.offerId));
        }
      } catch {
        // Ignore
      }
    });

    eventSource.addEventListener('offer_rejected', (event: MessageEvent) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.offerId) {
          removeOfferFromQueue(String(data.offerId));
        }
      } catch {
        // Ignore
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(realtimeChannel).catch(() => {});
      eventSource.close();
      deliveryOrderRingtone.stopRinging();
    };
  }, [
    isOnline,
    resolvedPartnerId,
    resolvedPartnerPhone,
    upsertOfferInQueue,
    removeOfferFromQueue,
  ]);

  const activeOffer: IncomingDeliveryOffer | null =
    isOnline && offersQueue.length > 0 ? offersQueue[0] : null;

  // 4. Countdown Timer & Automatic Expiration Pruning
  useEffect(() => {
    if (!activeOffer) {
      setRemainingSeconds(0);
      deliveryOrderRingtone.stopRinging();
      return;
    }

    // Start ringing alert when popup becomes active
    deliveryOrderRingtone.startRinging();

    const createdMs = Date.parse(activeOffer.createdAt);
    const expiresMs = Date.parse(activeOffer.expiresAt);
    const computedTotal =
      !Number.isNaN(createdMs) && !Number.isNaN(expiresMs) && expiresMs > createdMs
        ? Math.max(10, Math.round((expiresMs - createdMs) / 1000))
        : 45;
    setTotalSeconds(computedTotal);

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.ceil((expiresMs - now) / 1000);
      if (diffSec <= 0) {
        setRemainingSeconds(0);
        deliveryOrderRingtone.stopRinging();
        removeOfferFromQueue(activeOffer.offerId);
      } else {
        setRemainingSeconds(diffSec);
      }
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeOffer?.offerId, activeOffer?.expiresAt, activeOffer?.createdAt, removeOfferFromQueue]);

  // Stop ringing if activeOffer becomes null
  useEffect(() => {
    if (!activeOffer) {
      deliveryOrderRingtone.stopRinging();
    }
  }, [activeOffer]);

  // 5. Accept Order Handler (Step 4)
  const acceptOffer = useCallback(
    async (explicitOfferId?: string): Promise<boolean> => {
      const targetId = explicitOfferId || activeOffer?.offerId;
      if (!targetId || isAccepting || isRejecting) return false;

      setIsAccepting(true);
      setActionError(null);
      deliveryOrderRingtone.stopRinging();

      try {
        const res = await fetch(
          `/api/delivery/offers/${encodeURIComponent(targetId)}/accept`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-partner-id': resolvedPartnerId,
              'x-partner-phone': resolvedPartnerPhone,
            },
            body: JSON.stringify({
              partnerId: resolvedPartnerId,
              partnerPhone: resolvedPartnerPhone,
              partnerName: partnerName || 'Delivery Partner',
            }),
          }
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMessage =
            data?.error || 'Could not accept order. It may have expired or been assigned.';
          setActionError(errMessage);
          // If expired or already taken (409 / 410), remove after short notice
          if (res.status === 409 || res.status === 410 || res.status === 404) {
            setTimeout(() => {
              removeOfferFromQueue(targetId);
              setActionError(null);
            }, 2200);
          }
          return false;
        }

        removeOfferFromQueue(targetId);
        if (data.task && onOrderAccepted) {
          onOrderAccepted(data.task, data.offer);
        }
        return true;
      } catch (err: any) {
        setActionError(
          err?.message || 'Network error while accepting delivery order.'
        );
        return false;
      } finally {
        setIsAccepting(false);
      }
    },
    [
      activeOffer?.offerId,
      isAccepting,
      isRejecting,
      resolvedPartnerId,
      resolvedPartnerPhone,
      partnerName,
      removeOfferFromQueue,
      onOrderAccepted,
    ]
  );

  // 6. Reject Order Handler (Step 5)
  const rejectOffer = useCallback(
    async (explicitOfferId?: string): Promise<boolean> => {
      const targetId = explicitOfferId || activeOffer?.offerId;
      if (!targetId || isAccepting || isRejecting) return false;

      setIsRejecting(true);
      setActionError(null);
      deliveryOrderRingtone.stopRinging();

      try {
        const res = await fetch(
          `/api/delivery/offers/${encodeURIComponent(targetId)}/reject`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-partner-id': resolvedPartnerId,
              'x-partner-phone': resolvedPartnerPhone,
            },
            body: JSON.stringify({
              partnerId: resolvedPartnerId,
              partnerPhone: resolvedPartnerPhone,
            }),
          }
        );

        const data = await res.json();
        removeOfferFromQueue(targetId);
        if (onOrderRejected) {
          onOrderRejected(targetId);
        }
        return Boolean(res.ok && data?.success);
      } catch (err: any) {
        setActionError(err?.message || 'Network error while rejecting offer.');
        return false;
      } finally {
        setIsRejecting(false);
      }
    },
    [
      activeOffer?.offerId,
      isAccepting,
      isRejecting,
      resolvedPartnerId,
      resolvedPartnerPhone,
      removeOfferFromQueue,
      onOrderRejected,
    ]
  );

  const toggleMute = useCallback(() => {
    const next = !deliveryOrderRingtone.isMuted();
    deliveryOrderRingtone.setMuted(next);
    setIsMuted(next);
  }, []);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  // Helper to dispatch a live order offer to the online partner via the backend discovery engine
  const dispatchLiveTestOffer = useCallback(async () => {
    if (!isOnline) return;
    const baseLat =
      liveCoords && typeof liveCoords.lat === 'number' ? liveCoords.lat : 12.9716;
    const baseLng =
      liveCoords && typeof liveCoords.lng === 'number' ? liveCoords.lng : 77.5946;

    // Ensure partner location is fresh before dispatching
    await fetch('/api/delivery/partner-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: resolvedPartnerId,
        partnerPhone: resolvedPartnerPhone,
        partnerName: partnerName || 'Delivery Partner',
        vehicleType: vehicleType || 'EV',
        vehicleNumber: vehicleNumber || '',
        isOnline: true,
        lat: baseLat,
        lng: baseLng,
        serviceRadiusKm: 15,
      }),
    }).catch(() => {});

    const orderNum = `TRN-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await fetch('/api/delivery/offers/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: `ord-${Date.now()}`,
        orderNumber: orderNum,
        customerName: 'Aarav Singhania',
        customerPhone: '+91 98450 77812',
        restaurantName: 'Bespoke Guild Atelier & Tailors',
        orderAmountINR: 840,
        estimatedEarningsINR: 115,
        pickupAddress: '100 Feet Road, Indiranagar, Bengaluru',
        deliveryAddress: 'Lavelle Road, Shanthala Nagar, Bengaluru',
        pickupCoords: {
          lat: Number((baseLat + 0.008).toFixed(5)),
          lng: Number((baseLng + 0.006).toFixed(5)),
        },
        deliveryCoords: {
          lat: Number((baseLat - 0.011).toFixed(5)),
          lng: Number((baseLng + 0.014).toFixed(5)),
        },
        garmentSummary: 'Italian Linen Blazer & Trouser Express Pickup',
        deliveryStage: 'first_delivery',
        targetPartnerId: resolvedPartnerId,
        targetPartnerPhone: resolvedPartnerPhone,
        ttlSeconds: 45,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.offer) {
        upsertOfferInQueue(data.offer);
      }
    }
  }, [
    isOnline,
    liveCoords,
    resolvedPartnerId,
    resolvedPartnerPhone,
    partnerName,
    vehicleType,
    vehicleNumber,
    upsertOfferInQueue,
  ]);

  return {
    activeOffer,
    queuedCount: offersQueue.length,
    remainingSeconds,
    totalSeconds,
    isAccepting,
    isRejecting,
    actionError,
    isMuted,
    toggleMute,
    acceptOffer,
    rejectOffer,
    clearActionError,
    dispatchLiveTestOffer,
  };
}
