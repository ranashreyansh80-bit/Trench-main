import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import {
  getDeliveryProfile,
  upsertDeliveryProfile,
  getTailorProfile,
  upsertTailorProfile,
  getTailorOrders,
  upsertTailorOrder,
  getDeliveryTasks,
  upsertDeliveryTask,
  getNotifications,
  upsertNotification,
  getLedgerTransactions,
  addLedgerTransaction,
  seedAllDataIfEmpty,
  getOrCreateUser,
  upsertPartnerLocationDb,
  getAllPartnerLocationsDb,
  upsertDeliveryOfferDb,
  getDeliveryOffersDb,
} from './src/db/queries.ts';
import {
  DEFAULT_OFFER_TTL_SECONDS,
  calculateHaversineDistanceKm,
  discoverEligiblePartners,
  evaluateAtomicOfferAcceptance,
  evaluateOfferRejection,
  formatAuthorizedCustomerPhone,
} from './src/utils/deliveryDispatchEngine.ts';
import {
  DeliveryTask,
  IncomingDeliveryOffer,
  OfferLatLng,
  PartnerLiveLocation,
  TailorOrder,
} from './src/types/appTypes.ts';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { registerAgenticAiRoutes } from './src/agentic-ai/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client using user provided credentials or environment
const DEFAULT_SUPABASE_URL = 'https://nedcyrdglahskrifquxh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Q0Rjmwx_6sE6_x0Zs3mEqw_jJMXlfYQ';

function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  const match = rawUrl.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return match ? match[0] : DEFAULT_SUPABASE_URL;
}

const supabaseUrl = normalizeSupabaseUrl(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
);
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY;

let supabase: any = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch (err) {
  console.warn('Supabase client init warning:', err);
}

process.on('uncaughtException', (err) => {
  console.warn('[Server] Caught uncaughtException (non-fatal):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Caught unhandledRejection (non-fatal):', reason);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));

  // Seed initial data lazily in background
  seedAllDataIfEmpty().catch((err) => {
    console.error('Initial data seeding error (non-fatal):', err);
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: 'cloudsql-postgresql',
      supabase: supabase ? 'connected' : 'ready-for-config',
    });
  });

  // Supabase Status & Sync endpoints
  app.get('/api/supabase/status', (req, res) => {
    res.json({
      configured: Boolean(supabase),
      url: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*/, '$1') : null,
      message: supabase
        ? 'Connected to Supabase project'
        : 'Supabase credentials not yet configured in environment variables. Currently active on Cloud SQL PostgreSQL.',
      sqlScriptPath: '/supabase_schema.sql',
    });
  });

  app.post('/api/supabase/sync', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({
        success: false,
        error:
          'SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not set in environment.',
        sqlScriptAvailable: true,
      });
    }

    try {
      const [orders, tasks, notifs, ledger] = await Promise.all([
        getTailorOrders(),
        getDeliveryTasks(),
        getNotifications(),
        getLedgerTransactions(),
      ]);

      const syncErrors: string[] = [];

      if (orders.length > 0) {
        const { error } = await supabase.from('tailor_orders').upsert(
          orders.map((o) => ({
            order_id: o.id,
            order_number: o.orderNumber,
            customer_name: o.customerName,
            customer_phone: o.customerPhone,
            customer_address: o.customerAddress,
            cloth_to_be_altered: o.clothToBeAltered,
            cloth_description: o.clothDescription || '',
            size_chart_json: o.sizeChart,
            color_grade_json: o.colorGrade,
            note_to_tailor: o.noteToTailor || '',
            stage: o.stage,
            tailor_payout_inr: o.tailorPayoutINR,
            delivery_payout_inr: o.deliveryPayoutINR,
            tailor_shop_name: o.tailorShopName,
            tailor_shop_address: o.tailorShopAddress,
            placed_at: o.placedAt,
            completed_at: o.completedAt || null,
            pickup_dispatched: o.pickupDispatched || false,
          })),
          { onConflict: 'order_id' }
        );
        if (error) syncErrors.push(`orders: ${error.message}`);
      }

      if (tasks.length > 0) {
        const { error } = await supabase.from('delivery_tasks').upsert(
          tasks.map((t) => ({
            task_id: t.id,
            order_number: t.orderNumber,
            category: t.category,
            title: t.title,
            customer_name: t.customerName,
            customer_phone: t.customerPhone,
            pickup_address: t.pickupAddress,
            drop_address: t.dropAddress,
            garment_summary: t.garmentSummary,
            payout_inr: t.payoutINR,
            distance_km: String(t.distanceKm),
            eta_minutes: t.etaMinutes,
            status: t.status,
            linked_tailor_order_id: t.linkedTailorOrderId || null,
            is_urgent_tailor_pickup: t.isUrgentTailorPickup || false,
            map_coords_json: t.mapCoords,
            recorded_measurements_json: t.recordedMeasurements || null,
          })),
          { onConflict: 'task_id' }
        );
        if (error) syncErrors.push(`tasks: ${error.message}`);
      }

      if (notifs.length > 0) {
        const { error } = await supabase.from('notifications').upsert(
          notifs.map((n) => ({
            notif_id: n.id,
            order_number: n.orderNumber,
            linked_order_id: n.linkedOrderId,
            tailor_shop_name: n.tailorShopName,
            tailor_address: n.tailorAddress,
            customer_name: n.customerName,
            cloth_to_be_altered: n.clothToBeAltered,
            message: n.message,
            timestamp: n.timestamp,
            acknowledged: n.acknowledged,
            payout_inr: n.payoutINR,
          })),
          { onConflict: 'notif_id' }
        );
        if (error) syncErrors.push(`notifications: ${error.message}`);
      }

      if (ledger.length > 0) {
        const { error } = await supabase.from('ledger_transactions').upsert(
          ledger.map((l) => ({
            tx_id: l.id,
            role: l.role,
            order_number: l.orderNumber,
            description: l.description,
            category_label: l.categoryLabel,
            amount_inr: l.amountINR,
            timestamp: l.timestamp,
            status: l.status,
          })),
          { onConflict: 'tx_id' }
        );
        if (error) syncErrors.push(`ledger: ${error.message}`);
      }

      res.json({
        success: syncErrors.length === 0,
        syncErrors,
        recordsSynced: {
          orders: orders.length,
          tasks: tasks.length,
          notifications: notifs.length,
          ledger: ledger.length,
        },
      });
    } catch (error: any) {
      console.error('Supabase sync failure:', error);
      res.status(500).json({ error: error.message || 'Supabase sync failed' });
    }
  });

  // Bootstrap initial state for frontend
  app.get('/api/bootstrap', async (req, res) => {
    try {
      const [orders, tasks, notifs, ledger] = await Promise.all([
        getTailorOrders(),
        getDeliveryTasks(),
        getNotifications(),
        getLedgerTransactions(),
      ]);

      const syntheticNums = new Set(['TRN-8821', 'TRN-8824', 'TRN-8819', 'TRN-8830', 'TRN-8815', 'TRN-8818', 'TRN-8812', 'TRN-8805', 'TRN-8794']);
      const syntheticIds = new Set(['ord-101', 'ord-102', 'ord-103', 'ord-104', 'task-101', 'task-102', 'task-103', 'notif-101', 'notif-102', 'tx-init-1', 'tx-init-2']);

      const cleanOrders = orders.filter((o) => !syntheticNums.has(o.orderNumber) && !syntheticIds.has(o.id));
      const cleanTasks = tasks.filter((t) => !syntheticNums.has(t.orderNumber) && !syntheticIds.has(t.id));
      const cleanNotifs = notifs.filter((n) => !syntheticNums.has(n.orderNumber) && !syntheticIds.has(n.id));
      const cleanLedger = ledger.filter((l) => !syntheticNums.has(l.orderNumber) && !syntheticIds.has(l.id));

      res.json({ orders: cleanOrders, tasks: cleanTasks, notifications: cleanNotifs, ledger: cleanLedger });
    } catch (error: any) {
      console.error('Failed to load bootstrap data:', error);
      res.status(500).json({ error: error.message || 'Failed to load bootstrap data' });
    }
  });

  // User login and registration endpoint
  app.post('/api/users/login', async (req, res) => {
    try {
      const { uid, email, phone, countryCode, loginMethod, role, sessionId } = req.body;
      if (!uid) return res.status(400).json({ error: 'Missing uid' });

      let user = null;
      try {
        user = await getOrCreateUser(uid, email, phone, role || 'delivery');
      } catch (dbErr) {
        console.warn('Local DB user creation warning (non-fatal):', dbErr);
      }

      if (supabase) {
        try {
          const resolvedMethod =
            loginMethod ||
            (email
              ? email.toLowerCase().endsWith('@gmail.com')
                ? 'gmail'
                : 'email'
              : 'phone');
          const resolvedSessionId =
            sessionId || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          await Promise.all([
            supabase.from('users').upsert(
              {
                uid,
                email: email || null,
                phone: phone || null,
                country_code: countryCode || '+91',
                login_method: resolvedMethod,
                role: role || 'delivery',
                otp_verified: true,
                remember_login: true,
                last_login_at: new Date().toISOString(),
              },
              { onConflict: 'uid' }
            ),
            supabase.from('login_sessions').upsert(
              {
                session_id: resolvedSessionId,
                uid,
                phone: phone || null,
                email: email || null,
                country_code: countryCode || '+91',
                login_method: resolvedMethod,
                otp_code: '482910',
                otp_verified: true,
                remember_login: true,
                selected_role: role || 'delivery',
                logged_in_at: new Date().toISOString(),
              },
              { onConflict: 'session_id' }
            ),
          ]);
        } catch (supaErr) {
          console.warn('Supabase users/login_sessions upsert error:', supaErr);
        }
      }

      res.json({ success: true, user: user || { uid, email, phone, role } });
    } catch (error: any) {
      console.error('Failed to sync user login:', error);
      res.status(500).json({ error: error.message || 'Error syncing user' });
    }
  });

  // Delivery Profile
  app.get('/api/profile/delivery/:phone', async (req, res) => {
    try {
      const profile = await getDeliveryProfile(req.params.phone);
      res.json({ profile });
    } catch (error: any) {
      console.error('Failed to get delivery profile:', error);
      res.status(500).json({ error: error.message || 'Database query error' });
    }
  });

  app.post('/api/profile/delivery', async (req, res) => {
    try {
      const profile = await upsertDeliveryProfile(req.body);

      if (supabase && req.body) {
        try {
          const p = req.body;
          await supabase.from('delivery_profiles').upsert(
            {
              phone: p.phoneNumber,
              full_name: p.fullName || '',
              document_type: p.documentType || 'Aadhaar Card',
              document_number: p.documentNumber || '',
              document_uploaded: Boolean(p.documentUploaded),
              document_file_name: p.documentFileName || '',
              document_preview_url: p.documentPreviewUrl || '',
              aadhaar_status: p.aadhaarStatus || 'Pending',
              pan_number: p.panNumber || '',
              pan_uploaded: Boolean(p.panUploaded),
              pan_file_name: p.panFileName || '',
              pan_preview_url: p.panPreviewUrl || '',
              pan_status: p.panStatus || 'Pending',
              driving_license_uploaded: Boolean(p.drivingLicenseUploaded),
              driving_license_file_name: p.drivingLicenseFileName || '',
              driving_license_preview_url: p.drivingLicensePreviewUrl || '',
              vehicle_number: p.vehicleNumber || '',
              vehicle_type: p.vehicleType || 'EV',
              gmail_address: p.gmailAddress || '',
              residential_address: p.residentialAddress || '',
              pincode: p.pincode || '',
              partner_photo_url: p.partnerPhotoUrl || '',
              partner_photo_preview_url: p.partnerPhotoPreviewUrl || '',
              upi_id: p.upiId || '',
              bank_account_number: p.bankAccountNumber || '',
              verified: Boolean(p.verified),
              admin_approved: Boolean(p.adminApproved),
              tutorial_completed: Boolean(p.tutorialCompleted),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'phone' }
          );
        } catch (supaErr) {
          console.warn('Supabase delivery profile mirror error:', supaErr);
        }
      }

      res.json({ success: true, profile });
    } catch (error: any) {
      console.error('Failed to save delivery profile:', error);
      res.status(500).json({ error: error.message || 'Database error saving profile' });
    }
  });

  // Tailor Profile
  app.get('/api/profile/tailor/:phone', async (req, res) => {
    try {
      const profile = await getTailorProfile(req.params.phone);
      res.json({ profile });
    } catch (error: any) {
      console.error('Failed to get tailor profile:', error);
      res.status(500).json({ error: error.message || 'Database query error' });
    }
  });

  app.post('/api/profile/tailor', async (req, res) => {
    try {
      const { phone, profile } = req.body;
      const updated = await upsertTailorProfile(phone, profile);

      if (supabase && profile) {
        try {
          await supabase.from('tailor_profiles').upsert(
            {
              phone,
              shop_name: profile.shopName || '',
              specialty: profile.specialty || 'Stitching',
              document_type: profile.documentType || '',
              document_number: profile.documentNumber || '',
              document_uploaded: Boolean(profile.documentUploaded),
              document_file_name: profile.documentFileName || '',
              document_preview_url: profile.documentPreviewUrl || '',
              live_camera_captured: Boolean(profile.liveCameraCaptured),
              live_camera_timestamp: profile.liveCameraTimestamp || '',
              live_camera_data_url: profile.liveCameraDataUrl || '',
              verified: Boolean(profile.verified),
              admin_approved: Boolean(profile.adminApproved),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'phone' }
          );
        } catch (supaErr) {
          console.warn('Supabase tailor profile mirror error:', supaErr);
        }
      }

      res.json({ success: true, profile: updated });
    } catch (error: any) {
      console.error('Failed to save tailor profile:', error);
      res.status(500).json({ error: error.message || 'Database error saving tailor profile' });
    }
  });

  // Tailor Orders
  app.get('/api/tailor/orders', async (req, res) => {
    try {
      const orders = await getTailorOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch orders' });
    }
  });

  app.post('/api/tailor/orders', async (req, res) => {
    try {
      if (!req.body || !req.body.id || !req.body.orderNumber) {
        return res.status(400).json({ error: 'Invalid order payload: missing id or orderNumber' });
      }
      const saved = await upsertTailorOrder(req.body);

      if (supabase && req.body) {
        try {
          const o = req.body;
          const workflowMeta = {
            selectedService: o.selectedService,
            needsTailor: o.needsTailor,
            orderStatus: o.orderStatus,
            firstDeliveryStatus: o.firstDeliveryStatus,
            secondDeliveryStatus: o.secondDeliveryStatus,
            firstDeliveryPartner: o.firstDeliveryPartner,
            secondDeliveryPartner: o.secondDeliveryPartner,
            customerLocation: o.customerLocation,
            tailorLocation: o.tailorLocation,
            workbench: o.workbench,
            customerContacted: o.customerContacted,
            customerCalledAt: o.customerCalledAt,
            workStartedAt: o.workStartedAt,
            progressUpdates: o.progressUpdates,
            timeline: o.timeline,
          };
          await supabase.from('tailor_orders').upsert(
            {
              order_id: o.id,
              order_number: o.orderNumber,
              customer_name: o.customerName,
              customer_phone: o.customerPhone,
              customer_address: o.customerAddress,
              cloth_to_be_altered: o.clothToBeAltered,
              cloth_description: o.clothDescription || '',
              size_chart_json: o.sizeChart,
              color_grade_json: {
                ...o.colorGrade,
                _workflow: workflowMeta,
              },
              note_to_tailor: o.noteToTailor || '',
              stage: o.stage,
              tailor_payout_inr: o.tailorPayoutINR,
              delivery_payout_inr: o.deliveryPayoutINR,
              tailor_shop_name: o.tailorShopName,
              tailor_shop_address: o.tailorShopAddress,
              placed_at: o.placedAt,
              completed_at: o.completedAt || null,
              pickup_dispatched: Boolean(o.pickupDispatched),
            },
            { onConflict: 'order_id' }
          );
        } catch (supaErr) {
          console.warn('Supabase tailor order mirror error:', supaErr);
        }
      }

      // Auto-dispatch delivery offer when order is newly placed or pickup is dispatched
      const ord: TailorOrder = req.body;
      if (ord.stage === 'incoming' || ord.pickupDispatched) {
        const isSecondLeg = Boolean(ord.pickupDispatched && ord.stage === 'completed');
        const pickupCoords = isSecondLeg
          ? ord.tailorLocation && typeof ord.tailorLocation.lat === 'number'
            ? { lat: ord.tailorLocation.lat, lng: ord.tailorLocation.lng }
            : null
          : ord.customerLocation && typeof ord.customerLocation.lat === 'number'
          ? { lat: ord.customerLocation.lat, lng: ord.customerLocation.lng }
          : null;
        const deliveryCoords = isSecondLeg
          ? ord.customerLocation && typeof ord.customerLocation.lat === 'number'
            ? { lat: ord.customerLocation.lat, lng: ord.customerLocation.lng }
            : null
          : ord.tailorLocation && typeof ord.tailorLocation.lat === 'number'
          ? { lat: ord.tailorLocation.lat, lng: ord.tailorLocation.lng }
          : null;

        dispatchOrderToNearbyPartners({
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          restaurantName: ord.tailorShopName || 'Trench Partner Atelier',
          orderAmountINR: (Number(ord.tailorPayoutINR) || 350) + (Number(ord.deliveryPayoutINR) || 85),
          estimatedEarningsINR: Number(ord.deliveryPayoutINR) || 85,
          pickupAddress: isSecondLeg
            ? ord.tailorShopAddress || 'Tailor Atelier'
            : ord.customerAddress || 'Customer Address',
          deliveryAddress: isSecondLeg
            ? ord.customerAddress || 'Customer Address'
            : ord.tailorShopAddress || 'Tailor Atelier',
          pickupCoords,
          deliveryCoords,
          garmentSummary: ord.clothToBeAltered || 'Garment Pickup & Alteration',
          deliveryStage: isSecondLeg ? 'second_delivery' : 'first_delivery',
        }).catch((err) => {
          console.warn('Auto dispatch delivery offer warning:', err);
        });
      }

      res.json({ success: true, order: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save order' });
    }
  });

  // Delivery Tasks
  app.get('/api/delivery/tasks', async (req, res) => {
    try {
      const tasks = await getDeliveryTasks();
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch delivery tasks' });
    }
  });

  app.post('/api/delivery/tasks', async (req, res) => {
    try {
      if (!req.body || !req.body.id || !req.body.orderNumber) {
        return res.status(400).json({ error: 'Invalid task payload: missing id or orderNumber' });
      }
      const saved = await upsertDeliveryTask(req.body);

      if (supabase && req.body) {
        try {
          const t = req.body;
          const taskWorkflowMeta = {
            deliveryStage: t.deliveryStage,
            selectedService: t.selectedService,
            tailorShopName: t.tailorShopName,
            tailorShopAddress: t.tailorShopAddress,
            assignedPartnerId: t.assignedPartnerId,
            assignedPartnerName: t.assignedPartnerName,
            assignedPartnerPhone: t.assignedPartnerPhone,
            assignedAt: t.assignedAt,
            pickedUpAt: t.pickedUpAt,
            deliveredAt: t.deliveredAt,
            pickupLocationCoords: t.pickupLocationCoords,
            dropLocationCoords: t.dropLocationCoords,
            deliveryHistory: t.deliveryHistory,
          };
          await supabase.from('delivery_tasks').upsert(
            {
              task_id: t.id,
              order_number: t.orderNumber,
              category: t.category,
              title: t.title,
              customer_name: t.customerName,
              customer_phone: t.customerPhone,
              pickup_address: t.pickupAddress,
              drop_address: t.dropAddress,
              garment_summary: t.garmentSummary,
              payout_inr: t.payoutINR,
              distance_km: String(t.distanceKm),
              eta_minutes: t.etaMinutes,
              status: t.status,
              linked_tailor_order_id: t.linkedTailorOrderId || null,
              is_urgent_tailor_pickup: Boolean(t.isUrgentTailorPickup),
              map_coords_json: {
                ...t.mapCoords,
                _taskWorkflow: taskWorkflowMeta,
              },
              recorded_measurements_json: t.recordedMeasurements || null,
            },
            { onConflict: 'task_id' }
          );
        } catch (supaErr) {
          console.warn('Supabase delivery task mirror error:', supaErr);
        }
      }

      res.json({ success: true, task: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save delivery task' });
    }
  });

  // Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifs = await getNotifications();
      res.json(notifs);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const saved = await upsertNotification(req.body);

      if (supabase && req.body) {
        try {
          const n = req.body;
          await supabase.from('notifications').upsert(
            {
              notif_id: n.id,
              order_number: n.orderNumber,
              linked_order_id: n.linkedOrderId,
              tailor_shop_name: n.tailorShopName,
              tailor_address: n.tailorAddress,
              customer_name: n.customerName,
              cloth_to_be_altered: n.clothToBeAltered,
              message: n.message,
              timestamp: n.timestamp,
              acknowledged: Boolean(n.acknowledged),
              payout_inr: n.payoutINR,
            },
            { onConflict: 'notif_id' }
          );
        } catch (supaErr) {
          console.warn('Supabase notification mirror error:', supaErr);
        }
      }

      res.json({ success: true, notification: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save notification' });
    }
  });

  // Ledger Transactions
  app.get('/api/ledger', async (req, res) => {
    try {
      const ledger = await getLedgerTransactions();
      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch ledger' });
    }
  });

  app.post('/api/ledger', async (req, res) => {
    try {
      const saved = await addLedgerTransaction(req.body);

      if (supabase && req.body) {
        try {
          const l = req.body;
          await supabase.from('ledger_transactions').upsert(
            {
              tx_id: l.id,
              role: l.role,
              order_number: l.orderNumber,
              description: l.description,
              category_label: l.categoryLabel,
              amount_inr: l.amountINR,
              timestamp: l.timestamp,
              status: l.status,
            },
            { onConflict: 'tx_id' }
          );
        } catch (supaErr) {
          console.warn('Supabase ledger mirror error:', supaErr);
        }
      }

      res.json({ success: true, transaction: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add ledger transaction' });
    }
  });

  // ==========================================================================
  // REAL-TIME ZOMATO-STYLE DELIVERY ORDER POPUP & DISPATCH INFRASTRUCTURE
  // ==========================================================================

  const partnerLocationsMemory = new Map<string, PartnerLiveLocation>();
  const offersMemory = new Map<string, IncomingDeliveryOffer>();
  const activeOrderLocks = new Set<string>();

  // Mount Central AI Orchestrator & 6 Specialized Agents + Delivery/Partner AI Copilot
  registerAgenticAiRoutes(app, {
    supabase,
    getOnlinePartners: () => Array.from(partnerLocationsMemory.values()),
  });

  // SSE connected clients mapped by partner identifier (partnerId or partnerPhone)
  const sseClientsByPartner = new Map<string, Set<express.Response>>();

  // Supabase Realtime broadcast channel for instant order popup events (HTTP broadcast mode)
  const supabaseOffersChannel = supabase ? supabase.channel('trench-delivery-offers') : null;

  // Hydrate partner locations and offers from PostgreSQL on startup
  Promise.all([getAllPartnerLocationsDb(), getDeliveryOffersDb()])
    .then(([locs, offers]) => {
      for (const loc of locs) {
        partnerLocationsMemory.set(loc.partnerId, loc);
      }
      for (const offer of offers) {
        offersMemory.set(offer.offerId, offer);
      }
    })
    .catch((err) => {
      console.warn('Initial offer/location hydration warning:', err);
    });

  function sendSseEventToPartner(
    partnerId: string,
    partnerPhone: string,
    eventType: string,
    payload: any
  ) {
    const targets = new Set<express.Response>();
    if (partnerId && sseClientsByPartner.has(partnerId)) {
      for (const res of sseClientsByPartner.get(partnerId)!) targets.add(res);
    }
    if (partnerPhone && sseClientsByPartner.has(partnerPhone)) {
      for (const res of sseClientsByPartner.get(partnerPhone)!) targets.add(res);
    }
    const dataStr = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of targets) {
      try {
        client.write(dataStr);
      } catch {
        // Ignore disconnected client
      }
    }

    // Also broadcast via Supabase Realtime channel
    if (supabaseOffersChannel) {
      supabaseOffersChannel
        .send({
          type: 'broadcast',
          event: eventType,
          payload,
        })
        .catch(() => {});
    }
  }

  async function mirrorOfferToSupabase(offer: IncomingDeliveryOffer) {
    if (!supabase) return;
    try {
      await supabase.from('delivery_offers').upsert(
        {
          offer_id: offer.offerId,
          order_id: offer.orderId,
          order_number: offer.orderNumber,
          task_id: offer.taskId || null,
          partner_id: offer.partnerId,
          partner_phone: offer.partnerPhone,
          customer_name: offer.customerName,
          customer_phone: offer.customerPhone || '',
          restaurant_name: offer.restaurantName,
          order_amount_inr: offer.orderAmountINR,
          estimated_earnings_inr: offer.estimatedEarningsINR,
          pickup_address: offer.pickupAddress,
          delivery_address: offer.deliveryAddress,
          pickup_lat: offer.pickupCoords ? offer.pickupCoords.lat : null,
          pickup_lng: offer.pickupCoords ? offer.pickupCoords.lng : null,
          delivery_lat: offer.deliveryCoords ? offer.deliveryCoords.lat : null,
          delivery_lng: offer.deliveryCoords ? offer.deliveryCoords.lng : null,
          distance_km: offer.distanceKm,
          eta_minutes: offer.etaMinutes,
          garment_summary: offer.garmentSummary || '',
          delivery_stage: offer.deliveryStage || 'first_delivery',
          status: offer.status,
          expires_at: offer.expiresAt,
          responded_at: offer.respondedAt || null,
          created_at: offer.createdAt,
        },
        { onConflict: 'offer_id' }
      );
    } catch (err) {
      console.warn('Supabase delivery_offers mirror warning:', err);
    }
  }

  function sanitizeOfferForPartner(
    offer: IncomingDeliveryOffer,
    isAuthorizedForPhone: boolean = false
  ): IncomingDeliveryOffer {
    const authorized = Boolean(isAuthorizedForPhone || offer.status === 'accepted');
    return {
      ...offer,
      customerPhoneAuthorized: authorized,
      customerPhone: formatAuthorizedCustomerPhone(offer.customerPhone, authorized),
    };
  }

  interface DispatchOrderInput {
    orderId: string;
    orderNumber: string;
    taskId?: string;
    customerName: string;
    customerPhone: string;
    restaurantName: string;
    orderAmountINR: number;
    estimatedEarningsINR: number;
    pickupAddress: string;
    deliveryAddress: string;
    pickupCoords?: OfferLatLng | null;
    deliveryCoords?: OfferLatLng | null;
    garmentSummary?: string;
    deliveryStage?: 'first_delivery' | 'second_delivery' | 'measurement_visit';
    targetPartnerId?: string;
    targetPartnerPhone?: string;
    ttlSeconds?: number;
  }

  /**
   * Step 8: Idempotent Delivery Partner Discovery & Offer Dispatch
   */
  async function dispatchOrderToNearbyPartners(input: DispatchOrderInput): Promise<{
    dispatched: boolean;
    reason?: string;
    offer?: IncomingDeliveryOffer;
    candidatesChecked: number;
  }> {
    const nowMs = Date.now();

    // 1. Check if order is already accepted or has an active non-expired pending offer
    const existingOffersForOrder = Array.from(offersMemory.values()).filter(
      (o) => o.orderId === input.orderId
    );

    const alreadyAccepted = existingOffersForOrder.find((o) => o.status === 'accepted');
    if (alreadyAccepted) {
      return {
        dispatched: false,
        reason: 'Order is already assigned to a delivery partner.',
        offer: alreadyAccepted,
        candidatesChecked: 0,
      };
    }

    // Expire any stale pending offers first
    for (const existing of existingOffersForOrder) {
      if (existing.status === 'pending' && Date.parse(existing.expiresAt) <= nowMs) {
        existing.status = 'expired';
        existing.respondedAt = new Date(nowMs).toISOString();
        offersMemory.set(existing.offerId, existing);
        upsertDeliveryOfferDb(existing).catch(() => {});
        mirrorOfferToSupabase(existing).catch(() => {});
      }
    }

    // Idempotency: If there is already a live pending offer for this order, return it
    const activePending = existingOffersForOrder.find(
      (o) => o.status === 'pending' && Date.parse(o.expiresAt) > nowMs
    );
    if (activePending) {
      return {
        dispatched: true,
        reason: 'Active pending offer already exists for this order (idempotent).',
        offer: activePending,
        candidatesChecked: 1,
      };
    }

    // Collect partners who already rejected or expired on this order
    const excludedPartnerIds = new Set<string>();
    for (const prev of existingOffersForOrder) {
      if (prev.status === 'rejected' || prev.status === 'expired') {
        if (prev.partnerId) excludedPartnerIds.add(prev.partnerId);
        if (prev.partnerPhone) excludedPartnerIds.add(prev.partnerPhone);
      }
    }

    // Discover online delivery partners with non-stale GPS within service radius
    const allPartners = Array.from(partnerLocationsMemory.values());
    const eligibleCandidates = discoverEligiblePartners(input.pickupCoords, allPartners, {
      nowMs,
      excludedPartnerIds,
    });

    // If a specific target partner was requested and is online + non-stale, prioritize them
    let chosenCandidate = eligibleCandidates[0];
    if (input.targetPartnerId || input.targetPartnerPhone) {
      const matched = eligibleCandidates.find(
        (c) =>
          (input.targetPartnerId &&
            (c.partner.partnerId === input.targetPartnerId ||
              c.partner.partnerPhone === input.targetPartnerId)) ||
          (input.targetPartnerPhone &&
            (c.partner.partnerPhone === input.targetPartnerPhone ||
              c.partner.partnerId === input.targetPartnerPhone))
      );
      if (matched) {
        chosenCandidate = matched;
      }
    }

    if (!chosenCandidate) {
      return {
        dispatched: false,
        reason:
          'No online delivery partners with fresh GPS coordinates found within service radius.',
        candidatesChecked: allPartners.length,
      };
    }

    // Compute route distance between pickup and delivery if both coordinates exist
    const routeDistanceKm =
      calculateHaversineDistanceKm(input.pickupCoords, input.deliveryCoords) ??
      chosenCandidate.distanceKm;
    const etaMinutes = Math.max(8, Math.round(routeDistanceKm * 3.5 + 5));
    const ttlSeconds = input.ttlSeconds ?? DEFAULT_OFFER_TTL_SECONDS;
    const createdAtIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + ttlSeconds * 1000).toISOString();

    const newOffer: IncomingDeliveryOffer = {
      offerId: `offer-${input.orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      taskId: input.taskId,
      partnerId: chosenCandidate.partner.partnerId,
      partnerPhone: chosenCandidate.partner.partnerPhone,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerPhoneAuthorized: false,
      restaurantName: input.restaurantName,
      orderAmountINR: input.orderAmountINR,
      estimatedEarningsINR: input.estimatedEarningsINR,
      pickupAddress: input.pickupAddress,
      deliveryAddress: input.deliveryAddress,
      pickupCoords:
        input.pickupCoords &&
        typeof input.pickupCoords.lat === 'number' &&
        typeof input.pickupCoords.lng === 'number'
          ? input.pickupCoords
          : null,
      deliveryCoords:
        input.deliveryCoords &&
        typeof input.deliveryCoords.lat === 'number' &&
        typeof input.deliveryCoords.lng === 'number'
          ? input.deliveryCoords
          : null,
      distanceKm: routeDistanceKm,
      etaMinutes,
      garmentSummary: input.garmentSummary || 'Tailor Order Pickup & Delivery',
      deliveryStage: input.deliveryStage || 'first_delivery',
      status: 'pending',
      expiresAt: expiresAtIso,
      createdAt: createdAtIso,
      respondedAt: null,
    };

    offersMemory.set(newOffer.offerId, newOffer);
    await upsertDeliveryOfferDb(newOffer);
    mirrorOfferToSupabase(newOffer).catch(() => {});

    const sanitized = sanitizeOfferForPartner(newOffer, false);
    sendSseEventToPartner(
      newOffer.partnerId,
      newOffer.partnerPhone,
      'incoming_offer',
      sanitized
    );

    return {
      dispatched: true,
      offer: newOffer,
      candidatesChecked: eligibleCandidates.length,
    };
  }

  // Partner Online Status & Live GPS Coordinates Endpoint
  app.post('/api/delivery/partner-status', async (req, res) => {
    try {
      const {
        partnerId,
        partnerPhone,
        partnerName,
        vehicleType,
        vehicleNumber,
        isOnline,
        lat,
        lng,
        serviceRadiusKm,
        staleOverrideUpdatedAt,
      } = req.body || {};

      const resolvedId = String(partnerId || partnerPhone || '').trim();
      const resolvedPhone = String(partnerPhone || partnerId || '').trim();
      if (!resolvedId) {
        return res.status(400).json({ error: 'Missing partnerId or partnerPhone' });
      }

      const parsedLat =
        lat !== null && lat !== undefined && !Number.isNaN(Number(lat))
          ? Number(lat)
          : null;
      const parsedLng =
        lng !== null && lng !== undefined && !Number.isNaN(Number(lng))
          ? Number(lng)
          : null;

      const record: PartnerLiveLocation = {
        partnerId: resolvedId,
        partnerPhone: resolvedPhone,
        partnerName: partnerName || 'Delivery Partner',
        vehicleType: vehicleType || 'EV',
        vehicleNumber: vehicleNumber || '',
        isOnline: Boolean(isOnline),
        lat: parsedLat,
        lng: parsedLng,
        serviceRadiusKm: Number(serviceRadiusKm) > 0 ? Number(serviceRadiusKm) : 15,
        updatedAt: staleOverrideUpdatedAt || new Date().toISOString(),
      };

      partnerLocationsMemory.set(resolvedId, record);
      await upsertPartnerLocationDb(record);

      if (supabase) {
        Promise.resolve(
          supabase
            .from('partner_locations')
            .upsert(
              {
                partner_id: record.partnerId,
                partner_phone: record.partnerPhone,
                partner_name: record.partnerName,
                vehicle_type: record.vehicleType,
                vehicle_number: record.vehicleNumber,
                is_online: record.isOnline,
                lat: record.lat,
                lng: record.lng,
                service_radius_km: record.serviceRadiusKm,
                updated_at: record.updatedAt,
              },
              { onConflict: 'partner_id' }
            )
        ).catch(() => {});
      }

      res.json({ success: true, partnerLocation: record });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update partner status' });
    }
  });

  app.get('/api/delivery/partner-status', (req, res) => {
    res.json({
      partners: Array.from(partnerLocationsMemory.values()),
    });
  });

  // Realtime Server-Sent Events (SSE) Stream for Authenticated Delivery Partner
  app.get('/api/delivery/offers/stream', (req, res) => {
    const partnerId = String(req.query.partnerId || req.headers['x-partner-id'] || '').trim();
    const partnerPhone = String(
      req.query.partnerPhone || req.headers['x-partner-phone'] || partnerId
    ).trim();

    if (!partnerId && !partnerPhone) {
      return res.status(401).json({ error: 'Missing authenticated partner identity' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const key = partnerId || partnerPhone;
    if (!sseClientsByPartner.has(key)) {
      sseClientsByPartner.set(key, new Set());
    }
    sseClientsByPartner.get(key)!.add(res);

    // Immediately send any active non-expired pending offer for this partner
    const nowMs = Date.now();
    const activeOffers = Array.from(offersMemory.values())
      .filter(
        (o) =>
          o.status === 'pending' &&
          Date.parse(o.expiresAt) > nowMs &&
          (o.partnerId === partnerId ||
            o.partnerPhone === partnerPhone ||
            o.partnerId === partnerPhone ||
            o.partnerPhone === partnerId)
      )
      .map((o) => sanitizeOfferForPartner(o, false));

    res.write(`event: connected\ndata: ${JSON.stringify({ activeOffers })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClientsByPartner.get(key)?.delete(res);
    });
  });

  // Get Active Delivery Offers for Authenticated Partner
  app.get('/api/delivery/offers/active', async (req, res) => {
    try {
      const partnerId = String(req.query.partnerId || req.headers['x-partner-id'] || '').trim();
      const partnerPhone = String(
        req.query.partnerPhone || req.headers['x-partner-phone'] || partnerId
      ).trim();

      if (!partnerId && !partnerPhone) {
        return res.status(401).json({ error: 'Authentication required: Missing partnerId' });
      }

      const nowMs = Date.now();
      const activeOffers: IncomingDeliveryOffer[] = [];

      for (const offer of offersMemory.values()) {
        const belongsToPartner =
          offer.partnerId === partnerId ||
          offer.partnerPhone === partnerPhone ||
          offer.partnerId === partnerPhone ||
          offer.partnerPhone === partnerId;

        if (!belongsToPartner) continue;

        if (offer.status === 'pending' && Date.parse(offer.expiresAt) <= nowMs) {
          offer.status = 'expired';
          offer.respondedAt = new Date(nowMs).toISOString();
          offersMemory.set(offer.offerId, offer);
          upsertDeliveryOfferDb(offer).catch(() => {});
          mirrorOfferToSupabase(offer).catch(() => {});
          continue;
        }

        if (offer.status === 'pending') {
          activeOffers.push(sanitizeOfferForPartner(offer, false));
        }
      }

      res.json({ offers: activeOffers });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load active offers' });
    }
  });

  // Dispatch / Trigger Delivery Offer for an Order (Customer Checkout / Tailor Dispatch)
  app.post('/api/delivery/offers/dispatch', async (req, res) => {
    try {
      const body = req.body || {};
      const orderId = String(body.orderId || `ord-${Date.now()}`).trim();
      const orderNumber = String(
        body.orderNumber || `TRN-${Math.floor(1000 + Math.random() * 9000)}`
      ).trim();

      const pickupCoords: OfferLatLng | null =
        body.pickupCoords &&
        typeof body.pickupCoords.lat === 'number' &&
        typeof body.pickupCoords.lng === 'number'
          ? { lat: body.pickupCoords.lat, lng: body.pickupCoords.lng }
          : null;

      const deliveryCoords: OfferLatLng | null =
        body.deliveryCoords &&
        typeof body.deliveryCoords.lat === 'number' &&
        typeof body.deliveryCoords.lng === 'number'
          ? { lat: body.deliveryCoords.lat, lng: body.deliveryCoords.lng }
          : null;

      const result = await dispatchOrderToNearbyPartners({
        orderId,
        orderNumber,
        taskId: body.taskId || `task-${orderId}`,
        customerName: body.customerName || 'Verified Customer',
        customerPhone: body.customerPhone || '+91 98450 11223',
        restaurantName: body.restaurantName || 'Royal Master Tailors & Atelier',
        orderAmountINR: Number(body.orderAmountINR) || 680,
        estimatedEarningsINR: Number(body.estimatedEarningsINR) || 95,
        pickupAddress: body.pickupAddress || '100 Feet Road, Indiranagar, Bengaluru',
        deliveryAddress: body.deliveryAddress || '4th Block, Koramangala, Bengaluru',
        pickupCoords,
        deliveryCoords,
        garmentSummary:
          body.garmentSummary || 'Bespoke Suit Alteration & Express Doorstep Pickup',
        deliveryStage: body.deliveryStage || 'first_delivery',
        targetPartnerId: body.targetPartnerId,
        targetPartnerPhone: body.targetPartnerPhone,
        ttlSeconds: Number(body.ttlSeconds) > 0 ? Number(body.ttlSeconds) : DEFAULT_OFFER_TTL_SECONDS,
      });

      if (!result.dispatched || !result.offer) {
        return res.status(200).json({
          success: false,
          dispatched: false,
          reason: result.reason || 'No eligible online partner available.',
          candidatesChecked: result.candidatesChecked,
        });
      }

      res.json({
        success: true,
        dispatched: true,
        offer: sanitizeOfferForPartner(result.offer, false),
        candidatesChecked: result.candidatesChecked,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to dispatch delivery offer' });
    }
  });

  // Step 4: Secure Atomic Order Acceptance Endpoint
  app.post('/api/delivery/offers/:offerId/accept', async (req, res) => {
    const { offerId } = req.params;
    const partnerId = String(
      req.headers['x-partner-id'] || req.body?.partnerId || ''
    ).trim();
    const partnerPhone = String(
      req.headers['x-partner-phone'] || req.body?.partnerPhone || partnerId
    ).trim();
    const partnerName = String(req.body?.partnerName || 'Delivery Partner').trim();

    const targetOffer = offersMemory.get(offerId);
    if (!targetOffer) {
      return res.status(404).json({
        success: false,
        error: 'Delivery offer not found.',
      });
    }

    const orderId = targetOffer.orderId;

    // Atomic concurrency lock per order so two simultaneous requests cannot both win
    if (activeOrderLocks.has(orderId)) {
      return res.status(409).json({
        success: false,
        error: 'Order assignment is currently locked by another transaction.',
      });
    }

    activeOrderLocks.add(orderId);
    try {
      const offersForOrder = Array.from(offersMemory.values()).filter(
        (o) => o.orderId === orderId
      );

      const evaluation = evaluateAtomicOfferAcceptance(
        offersForOrder,
        offerId,
        partnerId,
        partnerPhone,
        false,
        Date.now()
      );

      if (!evaluation.success || !evaluation.acceptedOffer) {
        // If offer expired, persist expired status
        if (evaluation.statusCode === 410) {
          targetOffer.status = 'expired';
          targetOffer.respondedAt = new Date().toISOString();
          offersMemory.set(targetOffer.offerId, targetOffer);
          await upsertDeliveryOfferDb(targetOffer);
          mirrorOfferToSupabase(targetOffer).catch(() => {});
        }
        return res.status(evaluation.statusCode || 400).json({
          success: false,
          error: evaluation.error || 'Could not accept delivery offer.',
        });
      }

      // Execute Supabase PostgreSQL RPC transaction if Supabase is connected
      if (supabase) {
        try {
          await supabase.rpc('accept_delivery_offer', {
            p_offer_id: offerId,
            p_partner_id: partnerId || partnerPhone,
          });
        } catch (rpcErr) {
          console.warn('Supabase RPC accept_delivery_offer warning:', rpcErr);
        }
      }

      // 1. Update accepted offer
      const accepted = evaluation.acceptedOffer;
      offersMemory.set(accepted.offerId, accepted);
      await upsertDeliveryOfferDb(accepted);
      mirrorOfferToSupabase(accepted).catch(() => {});

      // 2. Cancel competing offers for the same order
      for (const cancelledId of evaluation.cancelledOfferIds || []) {
        const comp = offersMemory.get(cancelledId);
        if (comp) {
          comp.status = 'cancelled';
          comp.respondedAt = accepted.respondedAt;
          offersMemory.set(comp.offerId, comp);
          await upsertDeliveryOfferDb(comp);
          mirrorOfferToSupabase(comp).catch(() => {});
          sendSseEventToPartner(comp.partnerId, comp.partnerPhone, 'offer_cancelled', {
            offerId: comp.offerId,
            orderId: comp.orderId,
            reason: 'Order assigned to another partner',
          });
        }
      }

      // 3. Create or update the assigned DeliveryTask in PostgreSQL & Supabase
      const assignedTaskId = accepted.taskId || `task-${accepted.orderId}`;
      const assignedTask: DeliveryTask = {
        id: assignedTaskId,
        orderNumber: accepted.orderNumber,
        category: 'cloth_logistics',
        deliveryStage: accepted.deliveryStage || 'first_delivery',
        title: `Order #${accepted.orderNumber} — ${accepted.restaurantName}`,
        customerName: accepted.customerName,
        customerPhone: accepted.customerPhone || '',
        pickupAddress: accepted.pickupAddress,
        dropAddress: accepted.deliveryAddress,
        tailorShopName: accepted.restaurantName,
        tailorShopAddress: accepted.pickupAddress,
        garmentSummary: accepted.garmentSummary || 'Tailor Pickup & Customer Delivery',
        payoutINR: accepted.estimatedEarningsINR,
        distanceKm: accepted.distanceKm,
        etaMinutes: accepted.etaMinutes,
        status: 'assigned',
        linkedTailorOrderId: accepted.orderId,
        assignedPartnerId: partnerId || accepted.partnerId,
        assignedPartnerName: partnerName,
        assignedPartnerPhone: partnerPhone || accepted.partnerPhone,
        assignedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        pickupLocationCoords: accepted.pickupCoords
          ? {
              lat: accepted.pickupCoords.lat,
              lng: accepted.pickupCoords.lng,
              address: accepted.pickupAddress,
              mapX: 35,
              mapY: 45,
            }
          : undefined,
        dropLocationCoords: accepted.deliveryCoords
          ? {
              lat: accepted.deliveryCoords.lat,
              lng: accepted.deliveryCoords.lng,
              address: accepted.deliveryAddress,
              mapX: 68,
              mapY: 60,
            }
          : undefined,
        mapCoords: { x: 50, y: 50 },
      };

      await upsertDeliveryTask(assignedTask);

      sendSseEventToPartner(accepted.partnerId, accepted.partnerPhone, 'offer_accepted', {
        offer: sanitizeOfferForPartner(accepted, true),
        task: assignedTask,
      });

      return res.json({
        success: true,
        offer: sanitizeOfferForPartner(accepted, true),
        task: assignedTask,
        authorizedCustomerPhone: accepted.customerPhone,
      });
    } finally {
      activeOrderLocks.delete(orderId);
    }
  });

  // Step 5: Secure Order Rejection Endpoint (Continues Dispatch to Next Partner)
  app.post('/api/delivery/offers/:offerId/reject', async (req, res) => {
    try {
      const { offerId } = req.params;
      const partnerId = String(
        req.headers['x-partner-id'] || req.body?.partnerId || ''
      ).trim();
      const partnerPhone = String(
        req.headers['x-partner-phone'] || req.body?.partnerPhone || partnerId
      ).trim();

      const targetOffer = offersMemory.get(offerId);
      if (!targetOffer) {
        return res.status(404).json({
          success: false,
          error: 'Delivery offer not found.',
        });
      }

      const offersForOrder = Array.from(offersMemory.values()).filter(
        (o) => o.orderId === targetOffer.orderId
      );

      const evaluation = evaluateOfferRejection(
        offersForOrder,
        offerId,
        partnerId,
        partnerPhone,
        Date.now()
      );

      if (!evaluation.success || !evaluation.rejectedOffer) {
        return res.status(evaluation.statusCode || 400).json({
          success: false,
          error: evaluation.error || 'Failed to reject offer.',
        });
      }

      if (supabase) {
        try {
          await supabase.rpc('reject_delivery_offer', {
            p_offer_id: offerId,
            p_partner_id: partnerId || partnerPhone,
          });
        } catch (rpcErr) {
          console.warn('Supabase RPC reject_delivery_offer warning:', rpcErr);
        }
      }

      const rejected = evaluation.rejectedOffer;
      offersMemory.set(rejected.offerId, rejected);
      await upsertDeliveryOfferDb(rejected);
      mirrorOfferToSupabase(rejected).catch(() => {});

      sendSseEventToPartner(rejected.partnerId, rejected.partnerPhone, 'offer_rejected', {
        offerId: rejected.offerId,
        orderId: rejected.orderId,
      });

      // Automatically continue dispatch to the next eligible online partner (without cancelling customer order)
      const nextDispatch = await dispatchOrderToNearbyPartners({
        orderId: rejected.orderId,
        orderNumber: rejected.orderNumber,
        taskId: rejected.taskId,
        customerName: rejected.customerName,
        customerPhone: rejected.customerPhone || '',
        restaurantName: rejected.restaurantName,
        orderAmountINR: rejected.orderAmountINR,
        estimatedEarningsINR: rejected.estimatedEarningsINR,
        pickupAddress: rejected.pickupAddress,
        deliveryAddress: rejected.deliveryAddress,
        pickupCoords: rejected.pickupCoords,
        deliveryCoords: rejected.deliveryCoords,
        garmentSummary: rejected.garmentSummary,
        deliveryStage: rejected.deliveryStage,
      });

      return res.json({
        success: true,
        offer: sanitizeOfferForPartner(rejected, false),
        nextPartnerDispatched: nextDispatch.dispatched,
        nextOfferId: nextDispatch.offer?.offerId || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to reject delivery offer' });
    }
  });

  // Cancel Order Offers Endpoint (When Customer or Tailor Cancels an Order)
  app.post('/api/delivery/offers/cancel-order', async (req, res) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
      }

      const nowIso = new Date().toISOString();
      const cancelledIds: string[] = [];

      for (const offer of offersMemory.values()) {
        if (offer.orderId === orderId && offer.status === 'pending') {
          offer.status = 'cancelled';
          offer.respondedAt = nowIso;
          offersMemory.set(offer.offerId, offer);
          cancelledIds.push(offer.offerId);
          await upsertDeliveryOfferDb(offer);
          mirrorOfferToSupabase(offer).catch(() => {});
          sendSseEventToPartner(offer.partnerId, offer.partnerPhone, 'offer_cancelled', {
            offerId: offer.offerId,
            orderId: offer.orderId,
            reason: 'Customer cancelled the order',
          });
        }
      }

      res.json({
        success: true,
        orderId,
        cancelledOfferIds: cancelledIds,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to cancel order offers' });
    }
  });

  // Frontend integration via Vite
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (dev: ${!isProduction})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is already in use by Vite. Backend running in embedded mode.`);
    } else {
      console.error('[Server] Unexpected server error:', err);
    }
  });
}

startServer().catch((err) => {
  console.warn('Server initialization warning:', err);
});

