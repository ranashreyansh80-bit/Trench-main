import { IncomingDeliveryOffer } from '../types/appTypes.ts';
import { supabase } from '../lib/supabase.ts';

/**
 * Registers browser notification permission and service worker for Supabase Realtime
 * order notifications (no Firebase required).
 */
export async function initSupabaseOrderNotifications(
  partnerId: string,
  partnerPhone: string
): Promise<{ supported: boolean; permission: NotificationPermission | 'unsupported' }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }

  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {});
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        // Ignore if blocked without user gesture
      }
    }

    // Update partner online presence in Supabase partner_locations
    if (partnerId) {
      Promise.resolve(
        supabase.from('partner_locations').upsert(
          {
            partner_id: partnerId,
            partner_phone: partnerPhone || partnerId,
            is_online: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'partner_id' }
        )
      ).catch(() => {});
    }

    return { supported: true, permission };
  } catch {
    return {
      supported: false,
      permission: 'Notification' in window ? Notification.permission : 'unsupported',
    };
  }
}

/**
 * Displays a native OS/browser notification when a Supabase Realtime offer arrives
 * while the application tab is in the background.
 */
export async function showSupabaseOfferNotification(
  offer: IncomingDeliveryOffer
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `New Delivery Order #${offer.orderNumber} • ₹${offer.estimatedEarningsINR}`;
  const body = `Pickup: ${offer.restaurantName} (${offer.distanceKm} km) → Drop: ${offer.deliveryAddress}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          tag: `supabase-offer-${offer.offerId}`,
          requireInteraction: true,
          data: {
            offerId: offer.offerId,
            orderId: offer.orderId,
            url: `/?portal=delivery&offerId=${encodeURIComponent(offer.offerId)}`,
          },
        });
        return;
      }
    }

    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `supabase-offer-${offer.offerId}`,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch {
    // Ignore notification errors
  }
}
