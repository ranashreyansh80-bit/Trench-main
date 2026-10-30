import {
  DeliveryPartnerProfile,
  TailorProfile,
  TailorOrder,
  DeliveryTask,
  PartnerNotification,
  LedgerTransaction,
} from '../types/appTypes';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

import { normalizeTailorOrder, normalizeDeliveryTask } from './appLogic';

// Helper to map DB row to TailorOrder
function mapRowToTailorOrder(r: any): TailorOrder {
  let sizeChart = {
    chestInches: '38',
    waistInches: '32',
    shoulderInches: '18',
    sleeveLengthInches: '25',
    garmentLengthInches: '30',
    neckCollarInches: '15.5',
    fitPreference: 'Slim Tailored' as const,
  };
  let colorGrade: any = {
    shadeName: 'Classic Navy Blue',
    hexCode: '#000080',
    pantoneRef: 'PANTONE 19-3832 TCX',
    fabricFinish: 'Matte Cotton Twill',
  };
  let workflowMeta: any = {};
  try {
    if (typeof r.size_chart_json === 'string') sizeChart = JSON.parse(r.size_chart_json);
    else if (r.size_chart_json) sizeChart = r.size_chart_json;
  } catch {}
  try {
    const rawColor =
      typeof r.color_grade_json === 'string'
        ? JSON.parse(r.color_grade_json)
        : r.color_grade_json;
    if (rawColor && rawColor._workflow) {
      workflowMeta = rawColor._workflow;
      const { _workflow, ...restColor } = rawColor;
      colorGrade = restColor;
    } else if (rawColor) {
      colorGrade = rawColor;
    }
  } catch {}

  return normalizeTailorOrder({
    id: r.order_id || r.id,
    orderNumber: r.order_number,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerAddress: r.customer_address,
    clothToBeAltered: r.cloth_to_be_altered,
    clothDescription: r.cloth_description || '',
    sizeChart,
    colorGrade,
    noteToTailor: r.note_to_tailor || '',
    stage: r.stage || 'incoming',
    tailorPayoutINR: Number(r.tailor_payout_inr) || 220,
    deliveryPayoutINR: Number(r.delivery_payout_inr) || 85,
    tailorShopName: r.tailor_shop_name || 'Tailor Studio',
    tailorShopAddress: r.tailor_shop_address || 'Tailor Workshop Location',
    placedAt: r.placed_at || 'Today',
    completedAt: r.completed_at || undefined,
    pickupDispatched: r.pickup_dispatched || false,
    ...workflowMeta,
  });
}

// Helper to map DB row to DeliveryTask
function mapRowToDeliveryTask(r: any): DeliveryTask {
  let mapCoords = { x: 50, y: 50 };
  let taskWorkflowMeta: any = {};
  let recordedMeasurements = undefined;
  try {
    const rawCoords =
      typeof r.map_coords_json === 'string'
        ? JSON.parse(r.map_coords_json)
        : r.map_coords_json;
    if (rawCoords && rawCoords._taskWorkflow) {
      taskWorkflowMeta = rawCoords._taskWorkflow;
      mapCoords = { x: rawCoords.x ?? 50, y: rawCoords.y ?? 50 };
    } else if (rawCoords) {
      mapCoords = rawCoords;
    }
  } catch {}
  try {
    if (typeof r.recorded_measurements_json === 'string') recordedMeasurements = JSON.parse(r.recorded_measurements_json);
    else if (r.recorded_measurements_json) recordedMeasurements = r.recorded_measurements_json;
  } catch {}

  return normalizeDeliveryTask({
    id: r.task_id || r.id,
    orderNumber: r.order_number,
    category: r.category || 'measurement_only',
    title: r.title,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    pickupAddress: r.pickup_address,
    dropAddress: r.drop_address,
    garmentSummary: r.garment_summary,
    payoutINR: Number(r.payout_inr) || 85,
    distanceKm: parseFloat(r.distance_km || '2.5') || 2.5,
    etaMinutes: Number(r.eta_minutes) || 15,
    status: r.status || 'assigned',
    linkedTailorOrderId: r.linked_tailor_order_id || undefined,
    isUrgentTailorPickup: Boolean(r.is_urgent_tailor_pickup),
    mapCoords,
    recordedMeasurements,
    ...taskWorkflowMeta,
  });
}

export async function fetchBootstrapData(): Promise<{
  orders: TailorOrder[];
  tasks: DeliveryTask[];
  notifications: PartnerNotification[];
  ledger: LedgerTransaction[];
} | null> {
  // If Supabase is configured directly on client, fetch from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const [ordersRes, tasksRes, notifsRes, ledgerRes] = await Promise.all([
        supabase.from('tailor_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('delivery_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('ledger_transactions').select('*').order('created_at', { ascending: false }),
      ]);

      if (!ordersRes.error && ordersRes.data && ordersRes.data.length > 0) {
        return {
          orders: ordersRes.data.map(mapRowToTailorOrder),
          tasks: (tasksRes.data || []).map(mapRowToDeliveryTask),
          notifications: (notifsRes.data || []).map((n: any) => ({
            id: n.notif_id || n.id,
            orderNumber: n.order_number,
            linkedOrderId: n.linked_order_id,
            tailorShopName: n.tailor_shop_name,
            tailorAddress: n.tailor_address,
            customerName: n.customer_name,
            clothToBeAltered: n.cloth_to_be_altered,
            message: n.message,
            timestamp: n.timestamp,
            acknowledged: Boolean(n.acknowledged),
            payoutINR: Number(n.payout_inr) || 85,
          })),
          ledger: (ledgerRes.data || []).map((l: any) => ({
            id: l.tx_id || l.id,
            role: l.role,
            orderNumber: l.order_number,
            description: l.description,
            categoryLabel: l.category_label,
            amountINR: Number(l.amount_inr) || 0,
            timestamp: l.timestamp,
            status: l.status,
          })),
        };
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to server API:', e);
    }
  }

  // Fallback to Express / Cloud SQL API
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch bootstrap data from server:', error);
    return null;
  }
}

export async function fetchDeliveryProfile(phone: string): Promise<DeliveryPartnerProfile | null> {
  const key = (phone || '').trim();
  if (!key) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('delivery_profiles')
        .select('*')
        .eq('phone', key)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          documentType: data.document_type || 'Aadhaar Card',
          documentNumber: data.document_number || '',
          documentUploaded: Boolean(data.document_uploaded),
          documentFileName: data.document_file_name || '',
          documentPreviewUrl: data.document_preview_url || '',
          aadhaarStatus: data.aadhaar_status || 'Pending',
          aadhaarNumber: data.document_number || '',
          aadhaarVerified: Boolean(data.document_uploaded),
          aadhaarFrontUploaded: Boolean(data.document_uploaded),
          aadhaarPdfFileName: data.document_file_name || '',
          panNumber: data.pan_number || '',
          panUploaded: Boolean(data.pan_uploaded),
          panFileName: data.pan_file_name || '',
          panPreviewUrl: data.pan_preview_url || '',
          panStatus: data.pan_status || 'Pending',
          panCardUploaded: Boolean(data.pan_uploaded),
          panPdfFileName: data.pan_file_name || '',
          drivingLicenseUploaded: Boolean(data.driving_license_uploaded),
          drivingLicenseFileName: data.driving_license_file_name || '',
          drivingLicensePreviewUrl: data.driving_license_preview_url || '',
          vehicleVerified: Boolean(data.driving_license_uploaded && data.vehicle_number),
          personalDetailsVerified: Boolean(data.full_name && data.partner_photo_url),
          partnerPhotoCaptured: Boolean(data.partner_photo_url || data.partner_photo_preview_url),
          partnerPhotoDataUrl: data.partner_photo_url || data.partner_photo_preview_url || '',
          bankVerified: Boolean(data.bank_account_number && data.upi_id),
          vehicleNumber: data.vehicle_number || '',
          vehicleType: data.vehicle_type || '',
          fullName: data.full_name || '',
          phoneNumber: data.phone,
          gmailAddress: data.gmail_address || '',
          residentialAddress: data.residential_address || '',
          pincode: data.pincode || '',
          partnerPhotoUrl: data.partner_photo_url || '',
          partnerPhotoPreviewUrl: data.partner_photo_preview_url || '',
          upiId: data.upi_id || '',
          bankAccountNumber: data.bank_account_number || '',
          verified: Boolean(data.verified),
          adminApproved: Boolean(data.admin_approved),
          tutorialCompleted: Boolean(data.tutorial_completed),
        };
      }
    } catch (e) {
      console.warn('Supabase fetchDeliveryProfile error:', e);
    }
  }

  try {
    const res = await fetch(`/api/profile/delivery/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch (error) {
    console.warn('Could not fetch delivery profile:', error);
    return null;
  }
}

export async function saveDeliveryProfile(
  profile: DeliveryPartnerProfile,
  accountKey?: string
): Promise<boolean> {
  const key = (accountKey || profile.phoneNumber || profile.gmailAddress || '').trim();
  if (!key) return false;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('delivery_profiles').upsert(
        {
          phone: key,
          full_name: profile.fullName || '',
          document_type: profile.documentType || 'Aadhaar Card',
          document_number: profile.aadhaarNumber || profile.documentNumber || '',
          document_uploaded: Boolean(profile.aadhaarFrontUploaded || profile.documentUploaded),
          document_file_name: profile.aadhaarPdfFileName || profile.documentFileName || '',
          document_preview_url: profile.documentPreviewUrl || '',
          aadhaar_status: profile.aadhaarStatus || 'Pending',
          pan_number: profile.panNumber || '',
          pan_uploaded: Boolean(profile.panCardUploaded || profile.panUploaded),
          pan_file_name: profile.panPdfFileName || profile.panFileName || '',
          pan_preview_url: profile.panPreviewUrl || '',
          pan_status: profile.panStatus || 'Pending',
          driving_license_uploaded: Boolean(profile.drivingLicenseUploaded),
          driving_license_file_name: profile.drivingLicenseFileName || '',
          driving_license_preview_url: profile.drivingLicensePreviewUrl || '',
          vehicle_number: profile.vehicleNumber || '',
          vehicle_type: profile.vehicleType || 'EV',
          gmail_address: profile.gmailAddress || '',
          residential_address: profile.streetAddress || profile.residentialAddress || '',
          pincode: profile.pincode || '',
          partner_photo_url: profile.partnerPhotoDataUrl || profile.partnerPhotoUrl || '',
          partner_photo_preview_url: profile.partnerPhotoPreviewUrl || '',
          upi_id: profile.upiId || '',
          bank_account_number: profile.bankAccountNumber || '',
          verified: Boolean(profile.verified),
          admin_approved: Boolean(profile.adminApproved),
          tutorial_completed: Boolean(profile.tutorialCompleted),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );
    } catch (e) {
      console.warn('Supabase saveDeliveryProfile error:', e);
    }
  }

  try {
    const res = await fetch('/api/profile/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, phoneNumber: profile.phoneNumber || key }),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not save delivery profile:', error);
    return false;
  }
}

export async function fetchTailorProfile(phone: string): Promise<TailorProfile | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tailor_profiles')
        .select('*')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          documentType: data.document_type || '',
          documentNumber: data.document_number || '',
          documentUploaded: Boolean(data.document_uploaded),
          documentFileName: data.document_file_name || '',
          documentPreviewUrl: data.document_preview_url || '',
          shopName: data.shop_name || '',
          specialty: data.specialty || 'Stitching',
          liveCameraCaptured: Boolean(data.live_camera_captured),
          liveCameraTimestamp: data.live_camera_timestamp || '',
          liveCameraDataUrl: data.live_camera_data_url || '',
          verified: Boolean(data.verified),
          adminApproved: Boolean(data.admin_approved),
        };
      }
    } catch (e) {
      console.warn('Supabase fetchTailorProfile error:', e);
    }
  }

  try {
    const res = await fetch(`/api/profile/tailor/${encodeURIComponent(phone)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch (error) {
    console.warn('Could not fetch tailor profile:', error);
    return null;
  }
}

export async function saveTailorProfile(phone: string, profile: TailorProfile): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('tailor_profiles').upsert(
        {
          phone,
          shop_name: profile.shopName || '',
          specialty: profile.specialty || 'Stitching',
          document_type: profile.documentType || '',
          document_number: profile.documentNumber || '',
          document_uploaded: profile.documentUploaded,
          document_file_name: profile.documentFileName || '',
          document_preview_url: profile.documentPreviewUrl || '',
          live_camera_captured: profile.liveCameraCaptured,
          live_camera_timestamp: profile.liveCameraTimestamp || '',
          live_camera_data_url: profile.liveCameraDataUrl || '',
          verified: profile.verified,
          admin_approved: profile.adminApproved,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      );
    } catch (e) {
      console.warn('Supabase saveTailorProfile error:', e);
    }
  }

  try {
    const res = await fetch('/api/profile/tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, profile }),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not save tailor profile:', error);
    return false;
  }
}

export async function syncTailorOrder(order: TailorOrder): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const workflowMeta = {
        selectedService: order.selectedService,
        needsTailor: order.needsTailor,
        orderStatus: order.orderStatus,
        firstDeliveryStatus: order.firstDeliveryStatus,
        secondDeliveryStatus: order.secondDeliveryStatus,
        firstDeliveryPartner: order.firstDeliveryPartner,
        secondDeliveryPartner: order.secondDeliveryPartner,
        customerLocation: order.customerLocation,
        tailorLocation: order.tailorLocation,
        workbench: order.workbench,
        customerContacted: order.customerContacted,
        customerCalledAt: order.customerCalledAt,
        workStartedAt: order.workStartedAt,
        progressUpdates: order.progressUpdates,
        timeline: order.timeline,
      };
      await supabase.from('tailor_orders').upsert(
        {
          order_id: order.id,
          order_number: order.orderNumber,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          customer_address: order.customerAddress,
          cloth_to_be_altered: order.clothToBeAltered,
          cloth_description: order.clothDescription || '',
          size_chart_json: order.sizeChart,
          color_grade_json: {
            ...order.colorGrade,
            _workflow: workflowMeta,
          },
          note_to_tailor: order.noteToTailor || '',
          stage: order.stage,
          tailor_payout_inr: order.tailorPayoutINR,
          delivery_payout_inr: order.deliveryPayoutINR,
          tailor_shop_name: order.tailorShopName,
          tailor_shop_address: order.tailorShopAddress,
          placed_at: order.placedAt,
          completed_at: order.completedAt || null,
          pickup_dispatched: order.pickupDispatched || false,
        },
        { onConflict: 'order_id' }
      );
    } catch (e) {
      console.warn('Supabase syncTailorOrder error:', e);
    }
  }

  try {
    const res = await fetch('/api/tailor/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not sync tailor order:', error);
    return false;
  }
}

export async function syncDeliveryTask(task: DeliveryTask): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const taskWorkflowMeta = {
        deliveryStage: task.deliveryStage,
        selectedService: task.selectedService,
        tailorShopName: task.tailorShopName,
        tailorShopAddress: task.tailorShopAddress,
        assignedPartnerId: task.assignedPartnerId,
        assignedPartnerName: task.assignedPartnerName,
        assignedPartnerPhone: task.assignedPartnerPhone,
        assignedAt: task.assignedAt,
        pickedUpAt: task.pickedUpAt,
        deliveredAt: task.deliveredAt,
        pickupLocationCoords: task.pickupLocationCoords,
        dropLocationCoords: task.dropLocationCoords,
        deliveryHistory: task.deliveryHistory,
      };
      await supabase.from('delivery_tasks').upsert(
        {
          task_id: task.id,
          order_number: task.orderNumber,
          category: task.category,
          title: task.title,
          customer_name: task.customerName,
          customer_phone: task.customerPhone,
          pickup_address: task.pickupAddress,
          drop_address: task.dropAddress,
          garment_summary: task.garmentSummary,
          payout_inr: task.payoutINR,
          distance_km: String(task.distanceKm),
          eta_minutes: task.etaMinutes,
          status: task.status,
          linked_tailor_order_id: task.linkedTailorOrderId || null,
          is_urgent_tailor_pickup: task.isUrgentTailorPickup || false,
          map_coords_json: {
            ...task.mapCoords,
            _taskWorkflow: taskWorkflowMeta,
          },
          recorded_measurements_json: task.recordedMeasurements || null,
        },
        { onConflict: 'task_id' }
      );
    } catch (e) {
      console.warn('Supabase syncDeliveryTask error:', e);
    }
  }

  try {
    const res = await fetch('/api/delivery/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not sync delivery task:', error);
    return false;
  }
}

export async function syncNotification(notification: PartnerNotification): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notifications').upsert(
        {
          notif_id: notification.id,
          order_number: notification.orderNumber,
          linked_order_id: notification.linkedOrderId,
          tailor_shop_name: notification.tailorShopName,
          tailor_address: notification.tailorAddress,
          customer_name: notification.customerName,
          cloth_to_be_altered: notification.clothToBeAltered,
          message: notification.message,
          timestamp: notification.timestamp,
          acknowledged: notification.acknowledged,
          payout_inr: notification.payoutINR,
        },
        { onConflict: 'notif_id' }
      );
    } catch (e) {
      console.warn('Supabase syncNotification error:', e);
    }
  }

  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not sync notification:', error);
    return false;
  }
}

export async function syncLedgerTransaction(tx: LedgerTransaction): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('ledger_transactions').upsert(
        {
          tx_id: tx.id,
          role: tx.role,
          order_number: tx.orderNumber,
          description: tx.description,
          category_label: tx.categoryLabel,
          amount_inr: tx.amountINR,
          timestamp: tx.timestamp,
          status: tx.status,
        },
        { onConflict: 'tx_id' }
      );
    } catch (e) {
      console.warn('Supabase syncLedgerTransaction error:', e);
    }
  }

  try {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not sync ledger transaction:', error);
    return false;
  }
}

export async function syncUserLogin(
  phoneOrEmail: string,
  email?: string,
  role: string = 'delivery'
): Promise<boolean> {
  const isEmail = phoneOrEmail.includes('@');
  const resolvedEmail = email || (isEmail ? phoneOrEmail : undefined);
  const resolvedPhone = !isEmail ? phoneOrEmail : undefined;
  const loginMethod = resolvedEmail
    ? resolvedEmail.toLowerCase().endsWith('@gmail.com')
      ? 'gmail'
      : 'email'
    : 'phone';
  const countryMatch = resolvedPhone?.match(/^(\+\d+)/);
  const countryCode = countryMatch ? countryMatch[1] : '+91';
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (isSupabaseConfigured && supabase) {
    try {
      await Promise.all([
        supabase.from('users').upsert(
          {
            uid: phoneOrEmail,
            email: resolvedEmail || null,
            phone: resolvedPhone || null,
            country_code: countryCode,
            login_method: loginMethod,
            role,
            otp_verified: true,
            remember_login: true,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: 'uid' }
        ),
        supabase.from('login_sessions').upsert(
          {
            session_id: sessionId,
            uid: phoneOrEmail,
            phone: resolvedPhone || null,
            email: resolvedEmail || null,
            country_code: countryCode,
            login_method: loginMethod,
            otp_code: '482910',
            otp_verified: true,
            remember_login: true,
            selected_role: role,
            logged_in_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        ),
      ]);
    } catch (e) {
      console.warn('Supabase syncUserLogin error:', e);
    }
  }

  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: phoneOrEmail,
        email: resolvedEmail,
        phone: resolvedPhone,
        countryCode,
        loginMethod,
        role,
        sessionId,
      }),
    });
    return res.ok;
  } catch (error) {
    console.warn('Could not sync user login to server:', error);
    return false;
  }
}

export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  url: string | null;
  message: string;
  sqlScriptPath: string;
} | null> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return {
      configured: isSupabaseConfigured,
      url: import.meta.env.VITE_SUPABASE_URL || null,
      message: isSupabaseConfigured ? 'Supabase client configured' : 'Using active Cloud SQL PostgreSQL database',
      sqlScriptPath: '/supabase_schema.sql',
    };
  }
}

export async function triggerSupabaseSync(): Promise<{
  success: boolean;
  recordsSynced?: any;
  error?: string;
} | null> {
  try {
    const res = await fetch('/api/supabase/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (error) {
    console.warn('Could not trigger Supabase sync:', error);
    return null;
  }
}



