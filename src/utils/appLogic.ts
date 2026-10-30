import {
  AppRole,
  AssignedDeliveryPartnerInfo,
  CustomerServiceOption,
  DeliveryPartnerProfile,
  DeliveryTask,
  FirstDeliveryLegStatus,
  GeoLocationPoint,
  LedgerTransaction,
  OrderTimelineEvent,
  OrderWorkflowStatus,
  PartnerNotification,
  RecordedMeasurements,
  SecondDeliveryLegStatus,
  TailorOrder,
  TailorOrderStage,
  TailorProfile,
  TailorWorkbenchState,
  WorkProgressUpdate,
} from '../types/appTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const AVAILABLE_DELIVERY_PARTNERS: AssignedDeliveryPartnerInfo[] = [
  {
    partnerId: 'dp-partner-101',
    partnerName: 'Delivery Partner 1',
    partnerPhone: '+91 98000 10001',
    vehicleType: 'EV Scooter',
    vehicleNumber: 'KA-01-DL-1001',
    assignedAt: 'Active Now',
  },
  {
    partnerId: 'dp-partner-102',
    partnerName: 'Delivery Partner 2',
    partnerPhone: '+91 98000 10002',
    vehicleType: 'Motorcycle',
    vehicleNumber: 'KA-01-DL-1002',
    assignedAt: 'Active Now',
  },
  {
    partnerId: 'dp-partner-103',
    partnerName: 'Delivery Partner 3',
    partnerPhone: '+91 98000 10003',
    vehicleType: 'EV Scooter',
    vehicleNumber: 'KA-01-DL-1003',
    assignedAt: 'Active Now',
  },
];

export const ORDER_WORKFLOW_STATUS_STEPS: OrderWorkflowStatus[] = [
  'Order Placed',
  'Awaiting First Delivery Assignment',
  'First Delivery Assigned',
  'Parcel Picked Up from Customer',
  'Parcel Delivered to Tailor',
  'Awaiting Tailor Workbench Update',
  'Ready to Start Work',
  'Work In Progress',
  'Work Completed',
  'Awaiting Second Delivery Assignment',
  'Second Delivery Assigned',
  'Parcel Picked Up from Tailor',
  'Delivered to Customer',
  'Order Completed',
];

/**
 * Real-world coordinate resolver that anchors customer pickup and tailor workshop
 * coordinates around the user's live device GPS coordinates when available.
 */
export function resolveRealGeoLocation(
  address: string,
  roleHint: 'customer' | 'tailor' = 'customer',
  baseCoords?: { lat: number; lng: number }
): GeoLocationPoint {
  // Deterministic offset from address string so each order/shop has a distinct nearby street pin
  const cleanAddress = (address || '').trim();
  let hash = 0;
  for (let i = 0; i < cleanAddress.length; i++) {
    hash = (hash * 31 + cleanAddress.charCodeAt(i)) % 1000;
  }

  // If the user's live device location is provided, anchor around their actual coordinates
  if (baseCoords && Number.isFinite(baseCoords.lat) && Number.isFinite(baseCoords.lng)) {
    const latOffset =
      roleHint === 'tailor'
        ? 0.0055 + ((hash % 20) - 10) * 0.0003
        : -0.0045 + ((hash % 24) - 12) * 0.00035;
    const lngOffset =
      roleHint === 'tailor'
        ? 0.0062 + (((hash >> 2) % 20) - 10) * 0.0003
        : 0.0048 + (((hash >> 3) % 24) - 12) * 0.00035;

    return {
      lat: Number((baseCoords.lat + latOffset).toFixed(5)),
      lng: Number((baseCoords.lng + lngOffset).toFixed(5)),
      address:
        cleanAddress ||
        (roleHint === 'tailor' ? 'Assigned Tailor Studio (Near You)' : 'Customer Pickup Location (Near You)'),
      landmark: roleHint === 'tailor' ? 'Tailor Workshop' : 'Customer Doorstep',
      mapX: roleHint === 'tailor' ? 66 : Math.max(18, Math.min(84, 25 + (hash % 55))),
      mapY: roleHint === 'tailor' ? 36 : Math.max(22, Math.min(82, 28 + ((hash >> 2) % 50))),
    };
  }

  const latOffset = ((hash % 40) - 20) * 0.0008;
  const lngOffset = (((hash >> 3) % 40) - 20) * 0.0008;
  const baseLat = roleHint === 'tailor' ? 12.9784 : 12.9685;
  const baseLng = roleHint === 'tailor' ? 77.6408 : 77.6345;

  return {
    lat: Number((baseLat + latOffset).toFixed(5)),
    lng: Number((baseLng + lngOffset).toFixed(5)),
    address:
      cleanAddress ||
      (roleHint === 'tailor' ? 'Tailor Studio' : 'Customer Doorstep Location'),
    landmark: roleHint === 'tailor' ? 'Tailor Workshop' : 'Customer Doorstep',
    mapX: roleHint === 'tailor' ? 66 : Math.max(18, Math.min(84, 25 + (hash % 55))),
    mapY: roleHint === 'tailor' ? 36 : Math.max(22, Math.min(82, 28 + ((hash >> 2) % 50))),
  };
}

/**
 * Re-anchors orders and delivery tasks around the user's real live device GPS coordinates
 * so that routes, pickup pins, and tailor drop-off pins appear in the user's actual vicinity
 * on Google Maps rather than in a distant hardcoded city.
 */
export function reanchorOrdersAndTasksToDeviceLocation(
  orders: TailorOrder[],
  tasks: DeliveryTask[],
  deviceLat: number,
  deviceLng: number,
  resolvedAreaName?: string
): {
  reanchoredOrders: TailorOrder[];
  reanchoredTasks: DeliveryTask[];
} {
  const areaSuffix =
    resolvedAreaName &&
    !resolvedAreaName.toLowerCase().includes('requesting') &&
    !resolvedAreaName.toLowerCase().includes('enable') &&
    !resolvedAreaName.includes('°')
      ? resolvedAreaName
      : '';

  const formatLocalAddress = (rawAddr: string, fallbackPrefix: string) => {
    const cleaned = (rawAddr || '')
      .replace(/·?\s*\(?\s*-?\d+\.\d+°?\s*[NS]?\s*,\s*-?\d+\.\d+°?\s*[EW]?\s*\)?/gi, '')
      .replace(/Live\s+Device\s+GPS\s*\([^)]*\)/gi, '')
      .replace(/,\s*Indiranagar\s*100ft\s*Road,\s*Bengaluru/gi, '')
      .replace(/,\s*Indiranagar,\s*Bengaluru/gi, '')
      .replace(/,\s*Indiranagar/gi, '')
      .replace(/,\s*Koramangala\s*4th\s*Block,\s*Bengaluru/gi, '')
      .replace(/,\s*Whitefield\s*Main\s*Rd,\s*Bengaluru/gi, '')
      .replace(/,\s*Vittal\s*Mallya\s*Rd,\s*Bengaluru/gi, '')
      .replace(/,\s*Bengaluru/gi, '')
      .trim();
    const basePart = cleaned.split('·')[0].trim() || fallbackPrefix;
    return areaSuffix ? `${basePart}, ${areaSuffix}` : basePart;
  };

  const reanchoredOrders = orders.map((ord, idx) => {
    const custLat = Number((deviceLat + (idx % 2 === 0 ? 0.0055 : -0.0062) + idx * 0.0012).toFixed(5));
    const custLng = Number((deviceLng + (idx % 2 === 0 ? -0.0048 : 0.0058) + idx * 0.001).toFixed(5));
    const tailorLat = Number((deviceLat + 0.0072).toFixed(5));
    const tailorLng = Number((deviceLng + 0.0068).toFixed(5));

    const updatedCustomerAddr = formatLocalAddress(ord.customerAddress, 'Customer Doorstep');
    const updatedTailorAddr = formatLocalAddress(ord.tailorShopAddress, 'Tailor Workshop');

    return {
      ...ord,
      customerAddress: updatedCustomerAddr,
      tailorShopAddress: updatedTailorAddr,
      customerLocation: {
        lat: custLat,
        lng: custLng,
        address: updatedCustomerAddr,
        landmark: 'Customer Pickup & Delivery Point',
        mapX: ord.customerLocation?.mapX || 28,
        mapY: ord.customerLocation?.mapY || 66,
      },
      tailorLocation: {
        lat: tailorLat,
        lng: tailorLng,
        address: `${ord.tailorShopName}, ${updatedTailorAddr}`,
        landmark: 'Tailor Studio',
        mapX: ord.tailorLocation?.mapX || 64,
        mapY: ord.tailorLocation?.mapY || 36,
      },
    };
  });

  const reanchoredTasks = tasks.map((task, idx) => {
    const isSecond =
      task.deliveryStage === 'second_delivery' || Boolean(task.isUrgentTailorPickup);

    const custLat = Number((deviceLat + (idx % 2 === 0 ? 0.0055 : -0.0062) + idx * 0.0012).toFixed(5));
    const custLng = Number((deviceLng + (idx % 2 === 0 ? -0.0048 : 0.0058) + idx * 0.001).toFixed(5));
    const tailorLat = Number((deviceLat + 0.0072).toFixed(5));
    const tailorLng = Number((deviceLng + 0.0068).toFixed(5));

    const updatedPickupAddr = formatLocalAddress(
      task.pickupAddress,
      isSecond ? task.tailorShopName || 'Tailor Studio' : 'Customer Pickup'
    );
    const updatedDropAddr = formatLocalAddress(
      task.dropAddress,
      isSecond ? 'Customer Delivery' : task.tailorShopName || 'Tailor Studio'
    );

    const pickupCoords: GeoLocationPoint = isSecond
      ? {
          lat: tailorLat,
          lng: tailorLng,
          address: updatedPickupAddr,
          landmark: 'Tailor Studio Pickup',
          mapX: 64,
          mapY: 36,
        }
      : {
          lat: custLat,
          lng: custLng,
          address: updatedPickupAddr,
          landmark: 'Customer Doorstep Pickup',
          mapX: 28,
          mapY: 66,
        };

    const dropCoords: GeoLocationPoint = isSecond
      ? {
          lat: custLat,
          lng: custLng,
          address: updatedDropAddr,
          landmark: 'Customer Delivery Point',
          mapX: 28,
          mapY: 66,
        }
      : {
          lat: tailorLat,
          lng: tailorLng,
          address: updatedDropAddr,
          landmark: 'Tailor Studio Drop-off',
          mapX: 64,
          mapY: 36,
        };

    // Compute real Haversine distance in km from partner's live device location to pickup + drop
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const legDistKm = Number(
      Math.max(
        0.8,
        (haversineKm(deviceLat, deviceLng, pickupCoords.lat, pickupCoords.lng) +
          haversineKm(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng)) *
          1.25
      ).toFixed(1)
    );

    return {
      ...task,
      pickupAddress: updatedPickupAddr,
      dropAddress: updatedDropAddr,
      tailorShopAddress: formatLocalAddress(
        task.tailorShopAddress || '',
        'Tailor Studio'
      ),
      distanceKm: legDistKm,
      etaMinutes: Math.max(6, Math.round(legDistKm * 4)),
      pickupLocationCoords: pickupCoords,
      dropLocationCoords: dropCoords,
    };
  });

  return { reanchoredOrders, reanchoredTasks };
}


export function normalizeTailorOrder(order: TailorOrder): TailorOrder {
  const customerLoc =
    order.customerLocation || resolveRealGeoLocation(order.customerAddress, 'customer');
  const tailorLoc =
    order.tailorLocation ||
    resolveRealGeoLocation(
      `${order.tailorShopName}, ${order.tailorShopAddress}`,
      'tailor'
    );

  const selectedService: CustomerServiceOption =
    order.selectedService ||
    (order.id === 'ord-101' || order.orderNumber === 'TRN-8821'
      ? 'measurement_plus_cloth_pickup'
      : 'measurement_cloth_pickup_only');

  let defaultOrderStatus: OrderWorkflowStatus = 'First Delivery Assigned';
  let defaultFirstDelivery: FirstDeliveryLegStatus = 'assigned';
  let defaultSecondDelivery: SecondDeliveryLegStatus = 'not_ready';

  if (order.stage === 'accepted') {
    defaultOrderStatus = order.workbench?.readyToBegin
      ? 'Ready to Start Work'
      : 'Awaiting Tailor Workbench Update';
    defaultFirstDelivery = 'delivered_to_tailor';
  } else if (order.stage === 'working') {
    defaultOrderStatus = 'Work In Progress';
    defaultFirstDelivery = 'delivered_to_tailor';
  } else if (order.stage === 'completed') {
    defaultFirstDelivery = 'delivered_to_tailor';
    defaultOrderStatus = order.secondDeliveryPartner
      ? 'Second Delivery Assigned'
      : 'Awaiting Second Delivery Assignment';
    defaultSecondDelivery = order.secondDeliveryPartner
      ? 'assigned'
      : 'awaiting_assignment';
  }

  const workbench: TailorWorkbenchState = order.workbench || {
    statusLabel:
      order.stage === 'working' || order.stage === 'completed'
        ? 'Cutting Table & Machine Calibrated — Ready'
        : order.stage === 'accepted'
        ? 'Parcel Received — Awaiting Workbench Setup'
        : 'Awaiting First Delivery Parcel from Customer',
    readyToBegin: order.stage === 'working' || order.stage === 'completed',
    notes:
      order.stage === 'working' || order.stage === 'completed'
        ? 'Pattern chalked and thread shade matched to Pantone reference.'
        : 'Tailor must inspect cloth and update workbench before starting work.',
    updatedAt: order.placedAt || 'Today',
    updatedBy: order.tailorShopName || 'Tailor Studio',
  };

  const defaultProgress: WorkProgressUpdate[] =
    order.progressUpdates && order.progressUpdates.length > 0
      ? order.progressUpdates
      : order.stage === 'working' || order.stage === 'completed'
      ? [
          {
            id: `prog-init-${order.id}`,
            orderId: order.id,
            photoUrl:
              'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
            description: `Initial chalk marking, seam alignment, and fabric inspection completed for ${order.clothToBeAltered}.`,
            uploadedAt: order.workStartedAt || order.placedAt || 'Today, 09:15 AM',
            workStatus:
              order.stage === 'completed'
                ? 'Final Steam Press & Quality Check Passed'
                : 'Pattern Cutting & Seam Stitching In Progress',
          },
        ]
      : [];

  const defaultTimeline: OrderTimelineEvent[] =
    order.timeline && order.timeline.length > 0
      ? order.timeline
      : [
          {
            id: `tl-1-${order.id}`,
            status: 'Order Placed',
            actor: 'customer',
            description: `${order.customerName} placed order (${
              selectedService === 'measurement_plus_cloth_pickup'
                ? 'Measurement + Cloth Pickup'
                : 'Measurement / Cloth Pickup Only'
            }).`,
            timestamp: order.placedAt,
          },
          {
            id: `tl-2-${order.id}`,
            status: 'First Delivery Assigned',
            actor: 'system',
            description: `First Delivery (Customer → Tailor) assigned to ${order.firstDeliveryPartner?.partnerName || 'Delivery Partner'}.`,
            timestamp: order.placedAt,
          },
        ];

  return {
    ...order,
    selectedService,
    needsTailor: order.needsTailor ?? true,
    orderStatus: order.orderStatus || defaultOrderStatus,
    firstDeliveryStatus: order.firstDeliveryStatus || defaultFirstDelivery,
    secondDeliveryStatus: order.secondDeliveryStatus || defaultSecondDelivery,
    firstDeliveryPartner:
      order.firstDeliveryPartner || AVAILABLE_DELIVERY_PARTNERS[0],
    customerLocation: customerLoc,
    tailorLocation: tailorLoc,
    workbench,
    customerContacted:
      order.customerContacted ??
      (order.stage === 'working' || order.stage === 'completed'),
    customerCalledAt:
      order.customerCalledAt ||
      (order.stage === 'working' || order.stage === 'completed'
        ? 'Today, 09:00 AM'
        : undefined),
    workStartedAt:
      order.workStartedAt ||
      (order.stage === 'working' || order.stage === 'completed'
        ? 'Today, 09:10 AM'
        : undefined),
    progressUpdates: defaultProgress,
    timeline: defaultTimeline,
  };
}

export function stripAddressCoordinates(raw: string, fallback: string): string {
  const cleaned = (raw || '')
    .replace(/\s*·?\s*Live\s+Device\s+GPS\s*\([^)]*\)/gi, '')
    .replace(/\s*·?\s*\(?\s*-?\d+\.\d+°?\s*[NS]?\s*,\s*-?\d+\.\d+°?\s*[EW]?\s*\)?/gi, '')
    .replace(/\s*·\s*$/g, '')
    .replace(/,\s*$/g, '')
    .trim();
  return cleaned || fallback;
}

export function normalizeDeliveryTask(task: DeliveryTask): DeliveryTask {
  const isSecond =
    task.deliveryStage === 'second_delivery' ||
    Boolean(task.isUrgentTailorPickup) ||
    task.pickupAddress.toLowerCase().includes('tailor');

  const deliveryStage =
    task.deliveryStage || (isSecond ? 'second_delivery' : 'first_delivery');

  const cleanPickupAddress = stripAddressCoordinates(
    task.pickupAddress,
    deliveryStage === 'second_delivery' ? 'Tailor Studio Pickup' : 'Customer Doorstep'
  );
  const cleanDropAddress = stripAddressCoordinates(
    task.dropAddress,
    deliveryStage === 'second_delivery' ? 'Customer Delivery Address' : 'Assigned Tailor Studio'
  );
  const cleanTailorAddress = stripAddressCoordinates(
    task.tailorShopAddress || '',
    'Tailor Workshop Location'
  );

  const pickupCoords =
    task.pickupLocationCoords ||
    resolveRealGeoLocation(
      cleanPickupAddress,
      deliveryStage === 'second_delivery' ? 'tailor' : 'customer'
    );

  const dropCoords =
    task.dropLocationCoords ||
    resolveRealGeoLocation(
      cleanDropAddress,
      deliveryStage === 'second_delivery' ? 'customer' : 'tailor'
    );

  return {
    ...task,
    pickupAddress: cleanPickupAddress,
    dropAddress: cleanDropAddress,
    deliveryStage,
    selectedService:
      task.selectedService ||
      (task.category === 'measurement_only'
        ? 'measurement_plus_cloth_pickup'
        : 'measurement_cloth_pickup_only'),
    tailorShopName: task.tailorShopName || 'Tailor Studio',
    tailorShopAddress: cleanTailorAddress,
    assignedPartnerId: task.assignedPartnerId || 'dp-partner-101',
    assignedPartnerName: task.assignedPartnerName || 'Delivery Partner',
    assignedPartnerPhone: task.assignedPartnerPhone || '',
    assignedAt: task.assignedAt || 'Assigned',
    pickupLocationCoords: pickupCoords,
    dropLocationCoords: dropCoords,
    deliveryHistory:
      task.deliveryHistory && task.deliveryHistory.length > 0
        ? task.deliveryHistory
        : [
            {
              id: `dh-init-${task.id}`,
              status: 'assigned',
              label:
                deliveryStage === 'second_delivery'
                  ? 'Second Delivery Assigned (Tailor → Customer)'
                  : 'First Delivery Assigned (Customer → Tailor)',
              timestamp: task.assignedAt || 'Today, 10:30 AM',
              locationAddress: cleanPickupAddress,
            },
          ],
  };
}

export function validateOtpInput(phone: string, otp: string): ValidationResult {
  const errors: string[] = [];
  const digitsOnlyPhone = phone.replace(/\D/g, '');
  if (digitsOnlyPhone.length < 10) {
    errors.push('Enter a valid 10-digit mobile number.');
  }
  if (!/^\d{4,6}$/.test(otp.trim())) {
    errors.push('Enter the verification OTP sent to your mobile number.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isValidAadhaarNumber(raw: string): boolean {
  const digits = raw.replace(/\s|-/g, '');
  return /^\d{12}$/.test(digits);
}

export function isValidPanNumber(raw: string): boolean {
  const cleaned = raw.trim().toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned);
}

export function validateAadhaarPortal(
  profile: DeliveryPartnerProfile
): ValidationResult {
  const errors: string[] = [];
  const aadhaarComplete =
    Boolean(profile.documentNumber) &&
    isValidAadhaarNumber(profile.documentNumber) &&
    Boolean(profile.documentUploaded);
  const panComplete =
    Boolean(profile.panNumber) &&
    isValidPanNumber(profile.panNumber || '') &&
    Boolean(profile.panUploaded);

  if (aadhaarComplete || panComplete) {
    return { valid: true, errors: [] };
  }

  if (profile.documentType === 'PAN Card') {
    if (!profile.panNumber || !isValidPanNumber(profile.panNumber)) {
      errors.push('Enter a valid 10-character PAN Number (e.g., ABCDE1234F).');
    }
    if (!profile.panUploaded) {
      errors.push('Please upload your PAN Card PDF document.');
    }
  } else {
    if (!profile.documentNumber || !isValidAadhaarNumber(profile.documentNumber)) {
      errors.push(
        'Enter a valid 12-digit Aadhaar Number (e.g., 1234 5678 9012).'
      );
    }
    if (!profile.documentUploaded) {
      errors.push('Please upload your Aadhaar Card PDF document.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateVehiclePortal(
  profile: DeliveryPartnerProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.drivingLicenseUploaded) {
    errors.push('Please upload your Driving License photo.');
  }
  if (!profile.vehicleNumber || profile.vehicleNumber.trim().length < 4) {
    errors.push('Enter your Vehicle Registration Number.');
  }
  if (
    profile.vehicleType !== 'EV' &&
    profile.vehicleType !== 'Motorcycle / Bike' &&
    profile.vehicleType !== '3-Wheeler' &&
    profile.vehicleType !== 'Bike' &&
    profile.vehicleType !== 'Motorcycle'
  ) {
    errors.push('Select your Vehicle Type (EV, Motorcycle / Bike, or 3-Wheeler).');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePersonalPortal(
  profile: DeliveryPartnerProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.fullName || profile.fullName.trim().length < 2) {
    errors.push('Full Name is required.');
  }
  if (
    !profile.phoneNumber ||
    profile.phoneNumber.replace(/\D/g, '').length < 10
  ) {
    errors.push('Valid 10-digit Phone Number is required.');
  }
  if (!profile.gmailAddress || !profile.gmailAddress.includes('@')) {
    errors.push('Enter a valid Gmail Address.');
  }
  if (
    !profile.residentialAddress ||
    profile.residentialAddress.trim().length < 5
  ) {
    errors.push('Residential Address is required.');
  }
  if (!/^\d{6}$/.test(profile.pincode.trim())) {
    errors.push('Enter a valid 6-digit Pincode.');
  }
  if (!profile.partnerPhotoUrl || profile.partnerPhotoUrl.trim().length === 0) {
    errors.push(
      'Live Photo of Partner is mandatory (*). Please capture or upload your live photo.'
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validateBankPortal(
  profile: DeliveryPartnerProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.upiId || !profile.upiId.includes('@')) {
    errors.push('Enter a valid UPI ID (e.g., name@upi).');
  }
  if (
    !profile.bankAccountNumber ||
    profile.bankAccountNumber.trim().length < 8
  ) {
    errors.push('Enter a valid Bank Account Number (minimum 8 digits).');
  }
  return { valid: errors.length === 0, errors };
}

export function validateDeliveryOnboarding(
  profile: DeliveryPartnerProfile
): ValidationResult {
  const errors: string[] = [
    ...validateAadhaarPortal(profile).errors,
    ...validateVehiclePortal(profile).errors,
    ...validatePersonalPortal(profile).errors,
    ...validateBankPortal(profile).errors,
  ];
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTailorIdentityPortal(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.documentUploaded) {
    errors.push('Verification document upload is required (Trade / GST / Aadhaar).');
  }
  if (!profile.documentNumber || profile.documentNumber.trim().length < 4) {
    errors.push('Document number is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTailorEquipmentPortal(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.shopName || profile.shopName.trim().length < 2) {
    errors.push('Shop / Atelier Name is required.');
  }
  if (!profile.specialty) {
    errors.push('Select your Job / Specialty (Stitching, Alteration, or Both).');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTailorPersonalPortal(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];
  if (profile.ownerName !== undefined && profile.ownerName.trim().length < 2) {
    errors.push('Master Tailor / Owner Name is required.');
  }
  if (
    profile.phoneNumber !== undefined &&
    profile.phoneNumber.replace(/\D/g, '').length < 10
  ) {
    errors.push('Valid 10-digit Phone Number is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTailorCameraPortal(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];
  if (!profile.liveCameraCaptured) {
    errors.push(
      'Live Camera capture of your shop or sewing machine with exact printed location is required.'
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validateTailorBankPortal(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];
  if (profile.upiId && !profile.upiId.includes('@')) {
    errors.push('Enter a valid UPI ID (e.g., tailor@upi).');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTailorOnboarding(
  profile: TailorProfile
): ValidationResult {
  const errors: string[] = [];

  if (!profile.documentUploaded || !profile.documentNumber.trim()) {
    errors.push('Document upload and identification number are required.');
  }
  if (!profile.shopName || profile.shopName.trim().length < 2) {
    errors.push('Shop Name is required.');
  }
  if (!profile.specialty) {
    errors.push('Select your Job / Specialty (e.g., Stitching, Alteration).');
  }
  if (!profile.liveCameraCaptured) {
    errors.push(
      'Live Camera capture is required for real-time shop/tailor verification.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Reverse geocodes coordinates to a clean, human-readable street address
 * using Google Maps Geocoder if active, then OpenStreetMap Nominatim, then formatted GPS address.
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<string> {
  // 1. Check Google Maps Geocoder
  try {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response && response.results && response.results[0]?.formatted_address) {
        return response.results[0].formatted_address;
      }
    }
  } catch {}

  // 2. OpenStreetMap Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {}

  // 3. Deterministic street locality fallback from coordinates
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `Atelier Workshop Premises, Live GPS (${latStr}, ${lngStr})`;
}

export interface OrderTransitionOutput {
  updatedOrders: TailorOrder[];
  updatedTasks: DeliveryTask[];
  updatedNotifications: PartnerNotification[];
  updatedLedger: LedgerTransaction[];
  createdNotification?: PartnerNotification;
}

/**
 * Create a Customer Order with Service Selection, Tailor Requirement Popup result,
 * and automatic First Delivery (Customer -> Tailor) partner assignment.
 */
export function createCustomerOrderWithFirstDelivery(
  baseOrder: TailorOrder,
  selectedService: CustomerServiceOption,
  needsTailor: boolean,
  assignedFirstPartner: AssignedDeliveryPartnerInfo = AVAILABLE_DELIVERY_PARTNERS[0],
  timestampLabel: string = 'Just now'
): {
  createdOrder: TailorOrder;
  createdFirstDeliveryTask: DeliveryTask;
  createdNotification: PartnerNotification;
} {
  const customerLocation = resolveRealGeoLocation(
    baseOrder.customerAddress,
    'customer'
  );
  const tailorLocation = resolveRealGeoLocation(
    `${baseOrder.tailorShopName}, ${baseOrder.tailorShopAddress}`,
    'tailor'
  );

  const serviceLabel =
    selectedService === 'measurement_plus_cloth_pickup'
      ? 'Measurement + Cloth Pickup'
      : 'Measurement / Cloth Pickup Only';

  const createdOrder: TailorOrder = normalizeTailorOrder({
    ...baseOrder,
    selectedService,
    needsTailor,
    orderStatus: 'First Delivery Assigned',
    firstDeliveryStatus: 'assigned',
    secondDeliveryStatus: 'not_ready',
    firstDeliveryPartner: {
      ...assignedFirstPartner,
      assignedAt: timestampLabel,
    },
    customerLocation,
    tailorLocation,
    workbench: {
      statusLabel: 'Awaiting First Delivery Parcel from Customer',
      readyToBegin: false,
      notes: `Service: ${serviceLabel}. Tailor required: ${needsTailor ? 'Yes' : 'No'}.`,
      updatedAt: timestampLabel,
      updatedBy: baseOrder.tailorShopName,
    },
    customerContacted: false,
    progressUpdates: [],
    timeline: [
      {
        id: `tl-${Date.now()}-1`,
        status: 'Order Placed',
        actor: 'customer',
        description: `Order #${baseOrder.orderNumber} placed by ${baseOrder.customerName} with service "${serviceLabel}" (Needs Tailor: ${needsTailor ? 'Yes' : 'No'}).`,
        timestamp: timestampLabel,
      },
      {
        id: `tl-${Date.now()}-2`,
        status: 'First Delivery Assigned',
        actor: 'system',
        description: `First Delivery (Customer → Tailor) assigned to ${assignedFirstPartner.partnerName} (${assignedFirstPartner.vehicleNumber}).`,
        timestamp: timestampLabel,
      },
    ],
  });

  const createdFirstDeliveryTask: DeliveryTask = normalizeDeliveryTask({
    id: `task-first-${baseOrder.id}`,
    orderNumber: baseOrder.orderNumber,
    category:
      selectedService === 'measurement_plus_cloth_pickup'
        ? 'measurement_only'
        : 'cloth_logistics',
    deliveryStage: 'first_delivery',
    selectedService,
    title:
      selectedService === 'measurement_plus_cloth_pickup'
        ? `1st Delivery: Take Measurements & Pickup Cloth → ${baseOrder.tailorShopName}`
        : `1st Delivery: Customer Cloth Pickup → ${baseOrder.tailorShopName}`,
    customerName: baseOrder.customerName,
    customerPhone: baseOrder.customerPhone,
    pickupAddress: baseOrder.customerAddress,
    dropAddress: `${baseOrder.tailorShopName}, ${baseOrder.tailorShopAddress}`,
    tailorShopName: baseOrder.tailorShopName,
    tailorShopAddress: baseOrder.tailorShopAddress,
    garmentSummary: `${baseOrder.clothToBeAltered} (${serviceLabel})`,
    payoutINR: baseOrder.deliveryPayoutINR || 95,
    distanceKm: 2.6,
    etaMinutes: 14,
    status: 'assigned',
    linkedTailorOrderId: baseOrder.id,
    isUrgentTailorPickup: false,
    assignedPartnerId: assignedFirstPartner.partnerId,
    assignedPartnerName: assignedFirstPartner.partnerName,
    assignedPartnerPhone: assignedFirstPartner.partnerPhone,
    assignedAt: timestampLabel,
    pickupLocationCoords: customerLocation,
    dropLocationCoords: tailorLocation,
    mapCoords: { x: customerLocation.mapX, y: customerLocation.mapY },
    deliveryHistory: [
      {
        id: `dh-${Date.now()}-1`,
        status: 'assigned',
        label: `First Delivery Assigned to ${assignedFirstPartner.partnerName}`,
        timestamp: timestampLabel,
        locationAddress: baseOrder.customerAddress,
      },
    ],
  });

  const createdNotification: PartnerNotification = {
    id: `notif-first-${Date.now()}`,
    orderNumber: baseOrder.orderNumber,
    linkedOrderId: baseOrder.id,
    tailorShopName: baseOrder.tailorShopName,
    tailorAddress: baseOrder.tailorShopAddress,
    customerName: baseOrder.customerName,
    clothToBeAltered: baseOrder.clothToBeAltered,
    message: `New First Delivery (${serviceLabel}) assigned for Order #${baseOrder.orderNumber}: Collect parcel from ${baseOrder.customerName} and deliver to ${baseOrder.tailorShopName}.`,
    timestamp: timestampLabel,
    acknowledged: false,
    payoutINR: baseOrder.deliveryPayoutINR || 95,
    targetRole: 'delivery',
    workflowStatus: 'First Delivery Assigned',
  };

  return {
    createdOrder,
    createdFirstDeliveryTask,
    createdNotification,
  };
}

/**
 * Section 4: Tailor Workbench Update Before Starting Work
 */
export function updateTailorWorkbenchState(
  orders: TailorOrder[],
  notifications: PartnerNotification[],
  orderId: string,
  statusLabel: string,
  readyToBegin: boolean,
  notes: string,
  timestampLabel: string = 'Just now'
): {
  updatedOrders: TailorOrder[];
  updatedNotifications: PartnerNotification[];
  createdNotification?: PartnerNotification;
} {
  let createdNotification: PartnerNotification | undefined;

  const updatedOrders = orders.map((raw) => {
    const order = normalizeTailorOrder(raw);
    if (order.id !== orderId) return order;

    const nextWorkflowStatus: OrderWorkflowStatus = readyToBegin
      ? 'Ready to Start Work'
      : 'Awaiting Tailor Workbench Update';

    const newEvent: OrderTimelineEvent = {
      id: `tl-wb-${Date.now()}`,
      status: nextWorkflowStatus,
      actor: 'tailor',
      description: `Workbench updated: "${statusLabel}" (${
        readyToBegin ? 'Ready to Begin Order' : 'Preparation in Progress'
      }). ${notes ? `Notes: ${notes}` : ''}`,
      timestamp: timestampLabel,
    };

    createdNotification = {
      id: `notif-wb-${Date.now()}`,
      orderNumber: order.orderNumber,
      linkedOrderId: order.id,
      tailorShopName: order.tailorShopName,
      tailorAddress: order.tailorShopAddress,
      customerName: order.customerName,
      clothToBeAltered: order.clothToBeAltered,
      message: `${order.tailorShopName} updated Workbench for Order #${order.orderNumber}: ${statusLabel} (${
        readyToBegin ? 'Ready to Start Work' : 'Bench Prep'
      }).`,
      timestamp: timestampLabel,
      acknowledged: false,
      payoutINR: order.tailorPayoutINR,
      targetRole: 'tailor',
      workflowStatus: nextWorkflowStatus,
    };

    return {
      ...order,
      stage: order.stage === 'incoming' ? 'accepted' : order.stage,
      orderStatus: nextWorkflowStatus,
      workbench: {
        statusLabel,
        readyToBegin,
        notes,
        updatedAt: timestampLabel,
        updatedBy: order.tailorShopName,
      },
      timeline: [...(order.timeline || []), newEvent],
    };
  });

  const updatedNotifications = createdNotification
    ? [createdNotification, ...notifications]
    : notifications;

  return {
    updatedOrders,
    updatedNotifications,
    createdNotification,
  };
}

/**
 * Section 5A: Record Tailor Call to Customer
 */
export function recordTailorCustomerCall(
  orders: TailorOrder[],
  orderId: string,
  timestampLabel: string = 'Just now'
): TailorOrder[] {
  return orders.map((raw) => {
    const order = normalizeTailorOrder(raw);
    if (order.id !== orderId) return order;

    const newEvent: OrderTimelineEvent = {
      id: `tl-call-${Date.now()}`,
      status: order.orderStatus || 'Ready to Start Work',
      actor: 'tailor',
      description: `Tailor called customer ${order.customerName} (${order.customerPhone}) to confirm fit & stitching requirements.`,
      timestamp: timestampLabel,
    };

    return {
      ...order,
      customerContacted: true,
      customerCalledAt: timestampLabel,
      timeline: [...(order.timeline || []), newEvent],
    };
  });
}

/**
 * Section 6: Tailor Work Progress Photo & Status Upload
 */
export function addTailorWorkProgressUpdate(
  orders: TailorOrder[],
  notifications: PartnerNotification[],
  orderId: string,
  photoUrl: string,
  description: string,
  workStatus: string,
  timestampLabel: string = 'Just now'
): {
  updatedOrders: TailorOrder[];
  updatedNotifications: PartnerNotification[];
  createdNotification?: PartnerNotification;
} {
  let createdNotification: PartnerNotification | undefined;

  const updatedOrders = orders.map((raw) => {
    const order = normalizeTailorOrder(raw);
    if (order.id !== orderId) return order;

    const progressItem: WorkProgressUpdate = {
      id: `prog-${Date.now()}`,
      orderId: order.id,
      photoUrl,
      description,
      uploadedAt: timestampLabel,
      workStatus,
    };

    const newEvent: OrderTimelineEvent = {
      id: `tl-prog-${Date.now()}`,
      status: 'Work In Progress',
      actor: 'tailor',
      description: `Progress uploaded (${workStatus}): ${description}`,
      timestamp: timestampLabel,
    };

    createdNotification = {
      id: `notif-prog-${Date.now()}`,
      orderNumber: order.orderNumber,
      linkedOrderId: order.id,
      tailorShopName: order.tailorShopName,
      tailorAddress: order.tailorShopAddress,
      customerName: order.customerName,
      clothToBeAltered: order.clothToBeAltered,
      message: `Work Progress Update for Order #${order.orderNumber} (${workStatus}): ${description}`,
      timestamp: timestampLabel,
      acknowledged: false,
      payoutINR: order.tailorPayoutINR,
      targetRole: 'customer',
      workflowStatus: 'Work In Progress',
    };

    return {
      ...order,
      progressUpdates: [progressItem, ...(order.progressUpdates || [])],
      timeline: [...(order.timeline || []), newEvent],
    };
  });

  return {
    updatedOrders,
    updatedNotifications: createdNotification
      ? [createdNotification, ...notifications]
      : notifications,
    createdNotification,
  };
}

/**
 * Section 7: Assign Second Delivery Partner (Tailor -> Customer)
 * Only allowed after the tailor has marked the work as completed.
 */
export function assignSecondDeliveryPartnerToOrder(
  orders: TailorOrder[],
  tasks: DeliveryTask[],
  notifications: PartnerNotification[],
  orderId: string,
  partner: AssignedDeliveryPartnerInfo,
  timestampLabel: string = 'Just now'
): {
  updatedOrders: TailorOrder[];
  updatedTasks: DeliveryTask[];
  updatedNotifications: PartnerNotification[];
  createdTask?: DeliveryTask;
  createdNotification?: PartnerNotification;
} {
  const targetRaw = orders.find((o) => o.id === orderId);
  if (!targetRaw) {
    return {
      updatedOrders: orders,
      updatedTasks: tasks,
      updatedNotifications: notifications,
    };
  }
  const targetOrder = normalizeTailorOrder(targetRaw);

  // Guard: Second delivery can ONLY be assigned after work is completed
  if (targetOrder.stage !== 'completed') {
    return {
      updatedOrders: orders,
      updatedTasks: tasks,
      updatedNotifications: notifications,
    };
  }

  const assignedPartnerInfo: AssignedDeliveryPartnerInfo = {
    ...partner,
    assignedAt: timestampLabel,
  };

  const tailorLoc =
    targetOrder.tailorLocation ||
    resolveRealGeoLocation(
      `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
      'tailor'
    );
  const customerLoc =
    targetOrder.customerLocation ||
    resolveRealGeoLocation(targetOrder.customerAddress, 'customer');

  const updatedOrders = orders.map((raw) => {
    const o = normalizeTailorOrder(raw);
    if (o.id !== orderId) return o;

    const newEvent: OrderTimelineEvent = {
      id: `tl-2nd-assign-${Date.now()}`,
      status: 'Second Delivery Assigned',
      actor: 'tailor',
      description: `Second Delivery (Tailor → Customer) assigned to ${partner.partnerName} (${partner.vehicleNumber}) for final doorstep drop-off.`,
      timestamp: timestampLabel,
    };

    return {
      ...o,
      pickupDispatched: true,
      orderStatus: 'Second Delivery Assigned' as OrderWorkflowStatus,
      secondDeliveryStatus: 'assigned' as SecondDeliveryLegStatus,
      secondDeliveryPartner: assignedPartnerInfo,
      timeline: [...(o.timeline || []), newEvent],
    };
  });

  // Prevent duplicate second delivery tasks for the same order
  const existingSecondTask = tasks.find(
    (t) =>
      t.linkedTailorOrderId === orderId &&
      (t.deliveryStage === 'second_delivery' || t.isUrgentTailorPickup)
  );

  let createdTask: DeliveryTask;
  let updatedTasks: DeliveryTask[];

  if (existingSecondTask) {
    createdTask = normalizeDeliveryTask({
      ...existingSecondTask,
      deliveryStage: 'second_delivery',
      title: `2nd Delivery: Pickup Completed Order from ${targetOrder.tailorShopName} → Deliver to ${targetOrder.customerName}`,
      pickupAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
      dropAddress: targetOrder.customerAddress,
      tailorShopName: targetOrder.tailorShopName,
      tailorShopAddress: targetOrder.tailorShopAddress,
      assignedPartnerId: partner.partnerId,
      assignedPartnerName: partner.partnerName,
      assignedPartnerPhone: partner.partnerPhone,
      assignedAt: timestampLabel,
      status: 'assigned',
      isUrgentTailorPickup: true,
      pickupLocationCoords: tailorLoc,
      dropLocationCoords: customerLoc,
      mapCoords: { x: tailorLoc.mapX, y: tailorLoc.mapY },
      deliveryHistory: [
        ...(existingSecondTask.deliveryHistory || []),
        {
          id: `dh-2nd-${Date.now()}`,
          status: 'assigned',
          label: `Second Delivery Assigned to ${partner.partnerName}`,
          timestamp: timestampLabel,
          locationAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
        },
      ],
    });
    updatedTasks = tasks.map((t) =>
      t.id === existingSecondTask.id ? createdTask : t
    );
  } else {
    createdTask = normalizeDeliveryTask({
      id: `task-second-${targetOrder.id}`,
      orderNumber: targetOrder.orderNumber,
      category: 'cloth_logistics',
      deliveryStage: 'second_delivery',
      selectedService: targetOrder.selectedService,
      title: `2nd Delivery: Pickup Completed Order from ${targetOrder.tailorShopName} → Deliver to ${targetOrder.customerName}`,
      customerName: targetOrder.customerName,
      customerPhone: targetOrder.customerPhone,
      pickupAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
      dropAddress: targetOrder.customerAddress,
      tailorShopName: targetOrder.tailorShopName,
      tailorShopAddress: targetOrder.tailorShopAddress,
      garmentSummary: `${targetOrder.clothToBeAltered} (${targetOrder.colorGrade.shadeName})`,
      payoutINR: targetOrder.deliveryPayoutINR || 95,
      distanceKm: 3.2,
      etaMinutes: 14,
      status: 'assigned',
      linkedTailorOrderId: targetOrder.id,
      isUrgentTailorPickup: true,
      assignedPartnerId: partner.partnerId,
      assignedPartnerName: partner.partnerName,
      assignedPartnerPhone: partner.partnerPhone,
      assignedAt: timestampLabel,
      pickupLocationCoords: tailorLoc,
      dropLocationCoords: customerLoc,
      mapCoords: { x: tailorLoc.mapX, y: tailorLoc.mapY },
      deliveryHistory: [
        {
          id: `dh-2nd-${Date.now()}`,
          status: 'assigned',
          label: `Second Delivery Assigned to ${partner.partnerName} (Tailor → Customer)`,
          timestamp: timestampLabel,
          locationAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
        },
      ],
    });
    updatedTasks = [createdTask, ...tasks];
  }

  const createdNotification: PartnerNotification = {
    id: `notif-2nd-${Date.now()}-${targetOrder.id}`,
    orderNumber: targetOrder.orderNumber,
    linkedOrderId: targetOrder.id,
    tailorShopName: targetOrder.tailorShopName,
    tailorAddress: targetOrder.tailorShopAddress,
    customerName: targetOrder.customerName,
    clothToBeAltered: targetOrder.clothToBeAltered,
    message: `Second Delivery Assigned to ${partner.partnerName}: Pickup completed Order #${targetOrder.orderNumber} (${targetOrder.clothToBeAltered}) from ${targetOrder.tailorShopName} and deliver to ${targetOrder.customerName}.`,
    timestamp: timestampLabel,
    acknowledged: false,
    payoutINR: targetOrder.deliveryPayoutINR || 95,
    targetRole: 'delivery',
    workflowStatus: 'Second Delivery Assigned',
  };

  return {
    updatedOrders,
    updatedTasks,
    updatedNotifications: [createdNotification, ...notifications],
    createdTask,
    createdNotification,
  };
}

export function transitionTailorOrderStage(
  orders: TailorOrder[],
  tasks: DeliveryTask[],
  notifications: PartnerNotification[],
  ledger: LedgerTransaction[],
  orderId: string,
  targetStage: TailorOrderStage,
  timestampLabel: string = 'Just now'
): OrderTransitionOutput {
  const targetRaw = orders.find((o) => o.id === orderId);
  if (!targetRaw) {
    return {
      updatedOrders: orders,
      updatedTasks: tasks,
      updatedNotifications: notifications,
      updatedLedger: ledger,
    };
  }
  const targetOrder = normalizeTailorOrder(targetRaw);

  let createdNotification: PartnerNotification | undefined;

  const updatedOrders = orders.map((raw) => {
    const order = normalizeTailorOrder(raw);
    if (order.id !== orderId) return order;

    let nextOrderStatus: OrderWorkflowStatus =
      order.orderStatus || 'First Delivery Assigned';
    let nextSecondDeliveryStatus: SecondDeliveryLegStatus =
      order.secondDeliveryStatus || 'not_ready';
    let description = '';

    if (targetStage === 'accepted') {
      nextOrderStatus = order.workbench?.readyToBegin
        ? 'Ready to Start Work'
        : 'Awaiting Tailor Workbench Update';
      description = `Tailor accepted Order #${order.orderNumber} for review and workbench preparation.`;
    } else if (targetStage === 'working') {
      nextOrderStatus = 'Work In Progress';
      description = `Tailor started active stitching/alteration work on Order #${order.orderNumber}. Customer notified.`;
    } else if (targetStage === 'completed') {
      nextOrderStatus = 'Work Completed';
      nextSecondDeliveryStatus = 'awaiting_assignment';
      description = `Tailor marked Order #${order.orderNumber} as Work Completed. Ready to assign Delivery Partner for Second Delivery (Tailor → Customer).`;
    } else if (targetStage === 'declined') {
      description = `Tailor declined Order #${order.orderNumber}.`;
    }

    const newEvent: OrderTimelineEvent = {
      id: `tl-stage-${Date.now()}`,
      status: nextOrderStatus,
      actor: 'tailor',
      description,
      timestamp: timestampLabel,
    };

    return {
      ...order,
      stage: targetStage,
      orderStatus: nextOrderStatus,
      secondDeliveryStatus: nextSecondDeliveryStatus,
      workStartedAt:
        targetStage === 'working'
          ? order.workStartedAt || timestampLabel
          : order.workStartedAt,
      completedAt:
        targetStage === 'completed' ? timestampLabel : order.completedAt,
      workbench:
        targetStage === 'working' && order.workbench
          ? {
              ...order.workbench,
              readyToBegin: true,
              statusLabel:
                order.workbench.statusLabel ===
                'Awaiting First Delivery Parcel from Customer'
                  ? 'Active Stitching & Alteration Workbench'
                  : order.workbench.statusLabel,
            }
          : order.workbench,
      timeline: [...(order.timeline || []), newEvent],
    };
  });

  let updatedTasks = [...tasks];
  let updatedNotifications = [...notifications];
  let updatedLedger = [...ledger];

  if (targetStage === 'working' && targetOrder.stage !== 'working') {
    createdNotification = {
      id: `notif-workstart-${Date.now()}-${targetOrder.id}`,
      orderNumber: targetOrder.orderNumber,
      linkedOrderId: targetOrder.id,
      tailorShopName: targetOrder.tailorShopName,
      tailorAddress: targetOrder.tailorShopAddress,
      customerName: targetOrder.customerName,
      clothToBeAltered: targetOrder.clothToBeAltered,
      message: `${targetOrder.tailorShopName} started tailoring work on Order #${targetOrder.orderNumber} (${targetOrder.clothToBeAltered}). Status: Work In Progress.`,
      timestamp: timestampLabel,
      acknowledged: false,
      payoutINR: targetOrder.tailorPayoutINR,
      targetRole: 'customer',
      workflowStatus: 'Work In Progress',
    };
    updatedNotifications = [createdNotification, ...updatedNotifications];
  }

  if (targetStage === 'completed' && targetOrder.stage !== 'completed') {
    createdNotification = {
      id: `notif-${Date.now()}-${targetOrder.id}`,
      orderNumber: targetOrder.orderNumber,
      linkedOrderId: targetOrder.id,
      tailorShopName: targetOrder.tailorShopName,
      tailorAddress: targetOrder.tailorShopAddress,
      customerName: targetOrder.customerName,
      clothToBeAltered: targetOrder.clothToBeAltered,
      message: `${targetOrder.tailorShopName} marked Order #${targetOrder.orderNumber} (${targetOrder.clothToBeAltered}) as WORK COMPLETED. Ready for Second Delivery assignment (Tailor → Customer).`,
      timestamp: timestampLabel,
      acknowledged: false,
      payoutINR: targetOrder.deliveryPayoutINR,
      targetRole: 'delivery',
      workflowStatus: 'Work Completed',
    };

    updatedNotifications = [createdNotification, ...updatedNotifications];

    const tailorTx: LedgerTransaction = {
      id: `tx-tailor-${Date.now()}-${targetOrder.id}`,
      role: 'tailor',
      orderNumber: targetOrder.orderNumber,
      description: `${targetOrder.clothToBeAltered} — ${targetOrder.customerName}`,
      categoryLabel: 'Tailor Order Completed',
      amountINR: targetOrder.tailorPayoutINR,
      timestamp: timestampLabel,
      status: 'Settled to UPI',
    };
    updatedLedger = [tailorTx, ...updatedLedger];

    const tailorLoc =
      targetOrder.tailorLocation ||
      resolveRealGeoLocation(
        `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
        'tailor'
      );
    const customerLoc =
      targetOrder.customerLocation ||
      resolveRealGeoLocation(targetOrder.customerAddress, 'customer');

    const defaultPartner =
      targetOrder.secondDeliveryPartner ||
      targetOrder.firstDeliveryPartner ||
      AVAILABLE_DELIVERY_PARTNERS[0];

    const secondTask: DeliveryTask = normalizeDeliveryTask({
      id: `task-second-${targetOrder.id}`,
      orderNumber: targetOrder.orderNumber,
      category: 'cloth_logistics',
      deliveryStage: 'second_delivery',
      selectedService: targetOrder.selectedService,
      title: `2nd Delivery: Pickup Completed Order from ${targetOrder.tailorShopName} → Deliver to ${targetOrder.customerName}`,
      customerName: targetOrder.customerName,
      customerPhone: targetOrder.customerPhone,
      pickupAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
      dropAddress: targetOrder.customerAddress,
      tailorShopName: targetOrder.tailorShopName,
      tailorShopAddress: targetOrder.tailorShopAddress,
      garmentSummary: `${targetOrder.clothToBeAltered} (Completed Stitching)`,
      payoutINR: targetOrder.deliveryPayoutINR || 95,
      distanceKm: 3.1,
      etaMinutes: 18,
      status: 'assigned',
      linkedTailorOrderId: targetOrder.id,
      isUrgentTailorPickup: true,
      assignedPartnerId: defaultPartner.partnerId,
      assignedPartnerName: defaultPartner.partnerName,
      assignedPartnerPhone: defaultPartner.partnerPhone,
      assignedAt: timestampLabel,
      pickupLocationCoords: tailorLoc,
      dropLocationCoords: customerLoc,
      mapCoords: { x: tailorLoc.mapX, y: tailorLoc.mapY },
      deliveryHistory: [
        {
          id: `dh-2nd-${Date.now()}`,
          status: 'assigned',
          label: `Second Delivery Assigned to ${defaultPartner.partnerName} (Tailor → Customer)`,
          timestamp: timestampLabel,
          locationAddress: `${targetOrder.tailorShopName}, ${targetOrder.tailorShopAddress}`,
        },
      ],
    });

    const existingTaskIdx = updatedTasks.findIndex(
      (t) =>
        t.linkedTailorOrderId === targetOrder.id &&
        (t.deliveryStage === 'second_delivery' || t.isUrgentTailorPickup)
    );
    if (existingTaskIdx >= 0) {
      updatedTasks[existingTaskIdx] = secondTask;
    } else {
      updatedTasks = [secondTask, ...updatedTasks];
    }
  }

  return {
    updatedOrders,
    updatedTasks,
    updatedNotifications,
    updatedLedger,
    createdNotification,
  };
}

export type ExtendedDeliveryAction =
  | 'pickup_cloth'
  | 'deliver_cloth'
  | 'submit_measurements'
  | 'pickup_from_customer'
  | 'deliver_to_tailor'
  | 'pickup_from_tailor'
  | 'deliver_to_customer';

export interface DeliveryTaskActionOutput {
  updatedTasks: DeliveryTask[];
  updatedLedger: LedgerTransaction[];
  updatedOrders?: TailorOrder[];
  updatedNotifications?: PartnerNotification[];
  createdNotification?: PartnerNotification;
}

export function performDeliveryTaskAction(
  tasks: DeliveryTask[],
  ledger: LedgerTransaction[],
  taskId: string,
  action: ExtendedDeliveryAction,
  measurements?: RecordedMeasurements,
  timestampLabel: string = 'Just now',
  orders: TailorOrder[] = [],
  notifications: PartnerNotification[] = []
): DeliveryTaskActionOutput {
  const rawTask = tasks.find((t) => t.id === taskId);
  if (!rawTask) {
    return {
      updatedTasks: tasks,
      updatedLedger: ledger,
      updatedOrders: orders,
      updatedNotifications: notifications,
    };
  }
  const targetTask = normalizeDeliveryTask(rawTask);

  const isSecondDelivery =
    targetTask.deliveryStage === 'second_delivery' ||
    Boolean(targetTask.isUrgentTailorPickup);

  let nextStatus = targetTask.status;
  let shouldCreditPayout = false;
  let txCategory = '';
  let historyLabel = '';
  let historyAddress = targetTask.pickupAddress;

  // Map generic or specific actions cleanly to First Delivery vs Second Delivery
  if (action === 'submit_measurements') {
    nextStatus = 'measurement_recorded';
    shouldCreditPayout = true;
    txCategory = 'Doorstep Measurement & Pickup Visit';
    historyLabel = 'Customer Measurements Recorded at Doorstep';
    historyAddress = targetTask.pickupAddress;
  } else if (
    action === 'pickup_from_customer' ||
    (action === 'pickup_cloth' && !isSecondDelivery)
  ) {
    nextStatus = 'picked_up_from_customer';
    historyLabel = 'Parcel Picked Up from Customer';
    historyAddress = targetTask.pickupAddress;
  } else if (
    action === 'deliver_to_tailor' ||
    (action === 'deliver_cloth' && !isSecondDelivery)
  ) {
    if (
      targetTask.status !== 'delivered_to_tailor' &&
      targetTask.status !== 'cloth_delivered'
    ) {
      nextStatus = 'delivered_to_tailor';
      shouldCreditPayout = true;
      txCategory = 'First Delivery (Customer → Tailor)';
      historyLabel = `Parcel Delivered to Tailor (${targetTask.tailorShopName || 'Tailor Workshop'})`;
      historyAddress = targetTask.dropAddress;
    }
  } else if (
    action === 'pickup_from_tailor' ||
    (action === 'pickup_cloth' && isSecondDelivery)
  ) {
    nextStatus = 'picked_up_from_tailor';
    historyLabel = `Completed Garment Picked Up from Tailor (${targetTask.tailorShopName || 'Tailor Workshop'})`;
    historyAddress = targetTask.pickupAddress;
  } else if (
    action === 'deliver_to_customer' ||
    (action === 'deliver_cloth' && isSecondDelivery)
  ) {
    if (
      targetTask.status !== 'delivered_to_customer' &&
      targetTask.status !== 'cloth_delivered'
    ) {
      nextStatus = 'delivered_to_customer';
      shouldCreditPayout = true;
      txCategory = 'Second Delivery (Tailor → Customer)';
      historyLabel = `Completed Garment Delivered to Customer (${targetTask.customerName})`;
      historyAddress = targetTask.dropAddress;
    }
  }

  // Update mapCoords so active navigation pin moves from pickup to drop once picked up
  const nextMapCoords =
    nextStatus === 'picked_up_from_customer' ||
    nextStatus === 'picked_up_from_tailor'
      ? {
          x: targetTask.dropLocationCoords?.mapX || 64,
          y: targetTask.dropLocationCoords?.mapY || 36,
        }
      : targetTask.mapCoords;

  const updatedTasks = tasks.map((t) => {
    if (t.id !== taskId) return t;
    const norm = normalizeDeliveryTask(t);
    return {
      ...norm,
      status: nextStatus,
      pickedUpAt:
        nextStatus === 'picked_up_from_customer' ||
        nextStatus === 'picked_up_from_tailor'
          ? timestampLabel
          : norm.pickedUpAt,
      deliveredAt:
        nextStatus === 'delivered_to_tailor' ||
        nextStatus === 'delivered_to_customer'
          ? timestampLabel
          : norm.deliveredAt,
      mapCoords: nextMapCoords,
      recordedMeasurements: measurements ?? norm.recordedMeasurements,
      deliveryHistory: historyLabel
        ? [
            ...(norm.deliveryHistory || []),
            {
              id: `dh-${Date.now()}`,
              status: nextStatus,
              label: historyLabel,
              timestamp: timestampLabel,
              locationAddress: historyAddress,
            },
          ]
        : norm.deliveryHistory,
    };
  });

  // Synchronize linked TailorOrder status, measurements, and notifications
  let createdNotification: PartnerNotification | undefined;
  const updatedOrders = orders.map((rawOrder) => {
    const order = normalizeTailorOrder(rawOrder);
    const isLinked =
      order.id === targetTask.linkedTailorOrderId ||
      order.orderNumber === targetTask.orderNumber;
    if (!isLinked) return order;

    let nextOrderStatus: OrderWorkflowStatus =
      order.orderStatus || 'First Delivery Assigned';
    let nextFirstDeliveryStatus: FirstDeliveryLegStatus =
      order.firstDeliveryStatus || 'assigned';
    let nextSecondDeliveryStatus: SecondDeliveryLegStatus =
      order.secondDeliveryStatus || 'not_ready';
    let updatedSizeChart = order.sizeChart;
    let eventDesc = '';

    if (measurements) {
      updatedSizeChart = {
        ...order.sizeChart,
        shoulderInches: measurements.shoulder || order.sizeChart.shoulderInches,
        chestInches: measurements.chest || order.sizeChart.chestInches,
        waistInches: measurements.waist || order.sizeChart.waistInches,
        sleeveLengthInches:
          measurements.sleeve || order.sizeChart.sleeveLengthInches,
        garmentLengthInches:
          measurements.inseam || order.sizeChart.garmentLengthInches,
      };
    }

    if (nextStatus === 'measurement_recorded') {
      eventDesc = `Delivery Partner recorded doorstep customer measurements (Chest ${measurements?.chest}", Waist ${measurements?.waist}", Shoulder ${measurements?.shoulder}").`;
    } else if (nextStatus === 'picked_up_from_customer') {
      nextOrderStatus = 'Parcel Picked Up from Customer';
      nextFirstDeliveryStatus = 'picked_up_from_customer';
      eventDesc = `First Delivery: Parcel picked up from customer ${order.customerName} by ${targetTask.assignedPartnerName || 'Delivery Partner'}. En route to ${order.tailorShopName}.`;
      createdNotification = {
        id: `notif-f-pickup-${Date.now()}`,
        orderNumber: order.orderNumber,
        linkedOrderId: order.id,
        tailorShopName: order.tailorShopName,
        tailorAddress: order.tailorShopAddress,
        customerName: order.customerName,
        clothToBeAltered: order.clothToBeAltered,
        message: `Order #${order.orderNumber}: Parcel picked up from customer ${order.customerName}. Delivery Partner is en route to ${order.tailorShopName}.`,
        timestamp: timestampLabel,
        acknowledged: false,
        payoutINR: targetTask.payoutINR,
        targetRole: 'tailor',
        workflowStatus: 'Parcel Picked Up from Customer',
      };
    } else if (nextStatus === 'delivered_to_tailor') {
      nextOrderStatus = 'Parcel Delivered to Tailor';
      nextFirstDeliveryStatus = 'delivered_to_tailor';
      eventDesc = `First Delivery Completed: Parcel handed over to ${order.tailorShopName}. Awaiting Tailor Workbench Update before starting work.`;
      createdNotification = {
        id: `notif-f-deliv-${Date.now()}`,
        orderNumber: order.orderNumber,
        linkedOrderId: order.id,
        tailorShopName: order.tailorShopName,
        tailorAddress: order.tailorShopAddress,
        customerName: order.customerName,
        clothToBeAltered: order.clothToBeAltered,
        message: `Parcel Arrived at Workshop! First Delivery for Order #${order.orderNumber} (${order.clothToBeAltered}) has been handed over to ${order.tailorShopName}. Please update your Workbench to begin.`,
        timestamp: timestampLabel,
        acknowledged: false,
        payoutINR: targetTask.payoutINR,
        targetRole: 'tailor',
        workflowStatus: 'Parcel Delivered to Tailor',
      };
    } else if (nextStatus === 'picked_up_from_tailor') {
      nextOrderStatus = 'Parcel Picked Up from Tailor';
      nextSecondDeliveryStatus = 'picked_up_from_tailor';
      eventDesc = `Second Delivery: Completed garment picked up from ${order.tailorShopName} by ${targetTask.assignedPartnerName || 'Delivery Partner'}. Navigating to customer ${order.customerName}.`;
      createdNotification = {
        id: `notif-s-pickup-${Date.now()}`,
        orderNumber: order.orderNumber,
        linkedOrderId: order.id,
        tailorShopName: order.tailorShopName,
        tailorAddress: order.tailorShopAddress,
        customerName: order.customerName,
        clothToBeAltered: order.clothToBeAltered,
        message: `Order #${order.orderNumber} picked up from ${order.tailorShopName}. Out for final delivery to ${order.customerName}!`,
        timestamp: timestampLabel,
        acknowledged: false,
        payoutINR: targetTask.payoutINR,
        targetRole: 'customer',
        workflowStatus: 'Parcel Picked Up from Tailor',
      };
    } else if (nextStatus === 'delivered_to_customer') {
      nextOrderStatus = 'Order Completed';
      nextSecondDeliveryStatus = 'delivered_to_customer';
      eventDesc = `Second Delivery Completed: Altered garment delivered to customer ${order.customerName}. Order #${order.orderNumber} is now Completed!`;
      createdNotification = {
        id: `notif-s-deliv-${Date.now()}`,
        orderNumber: order.orderNumber,
        linkedOrderId: order.id,
        tailorShopName: order.tailorShopName,
        tailorAddress: order.tailorShopAddress,
        customerName: order.customerName,
        clothToBeAltered: order.clothToBeAltered,
        message: `Order #${order.orderNumber} (${order.clothToBeAltered}) successfully delivered to customer ${order.customerName}! Full 2-stage workflow completed.`,
        timestamp: timestampLabel,
        acknowledged: false,
        payoutINR: targetTask.payoutINR,
        targetRole: 'all',
        workflowStatus: 'Order Completed',
      };
    }

    return {
      ...order,
      sizeChart: updatedSizeChart,
      orderStatus: nextOrderStatus,
      firstDeliveryStatus: nextFirstDeliveryStatus,
      secondDeliveryStatus: nextSecondDeliveryStatus,
      workbench:
        nextStatus === 'delivered_to_tailor' && order.workbench
          ? {
              ...order.workbench,
              statusLabel: 'Parcel Arrived at Workshop — Awaiting Workbench Update',
              updatedAt: timestampLabel,
            }
          : order.workbench,
      timeline: eventDesc
        ? [
            ...(order.timeline || []),
            {
              id: `tl-del-${Date.now()}`,
              status: nextOrderStatus,
              actor: 'delivery' as const,
              description: eventDesc,
              timestamp: timestampLabel,
            },
          ]
        : order.timeline,
    };
  });

  let updatedLedger = [...ledger];
  if (shouldCreditPayout) {
    const newTx: LedgerTransaction = {
      id: `tx-del-${Date.now()}-${targetTask.id}`,
      role: 'delivery',
      orderNumber: targetTask.orderNumber,
      description: `${targetTask.title} — ${targetTask.customerName}`,
      categoryLabel: txCategory,
      amountINR: targetTask.payoutINR,
      timestamp: timestampLabel,
      status: 'Settled to UPI',
    };
    updatedLedger = [newTx, ...updatedLedger];
  }

  const updatedNotifications = createdNotification
    ? [createdNotification, ...notifications]
    : notifications;

  return {
    updatedTasks,
    updatedLedger,
    updatedOrders,
    updatedNotifications,
    createdNotification,
  };
}

export function calculateRoleEarnings(
  ledger: LedgerTransaction[],
  role: AppRole
): {
  totalEarningsINR: number;
  completedCount: number;
  roleTransactions: LedgerTransaction[];
} {
  const roleTransactions = ledger.filter((tx) => tx.role === role);
  const totalEarningsINR = roleTransactions.reduce(
    (sum, tx) => sum + tx.amountINR,
    0
  );
  return {
    totalEarningsINR,
    completedCount: roleTransactions.length,
    roleTransactions,
  };
}

export const EMPTY_DELIVERY_PROFILE: DeliveryPartnerProfile = {
  documentType: 'Aadhaar Card',
  documentNumber: '',
  documentUploaded: false,
  documentFileName: '',
  documentPreviewUrl: '',
  aadhaarStatus: 'Pending',
  aadhaarNumber: '',
  aadhaarVerified: false,
  aadhaarFrontUploaded: false,
  aadhaarPdfFileName: '',
  aadhaarBackUploaded: false,
  aadhaarBackPdfFileName: '',
  panNumber: '',
  panUploaded: false,
  panFileName: '',
  panPreviewUrl: '',
  panStatus: 'Pending',
  panCardUploaded: false,
  panPdfFileName: '',
  drivingLicenseUploaded: false,
  drivingLicenseFileName: '',
  drivingLicensePreviewUrl: '',
  drivingLicenseNumber: '',
  vehicleVerified: false,
  personalDetailsVerified: false,
  partnerPhotoCaptured: false,
  partnerPhotoDataUrl: '',
  bankAccountHolder: '',
  ifscCode: '',
  bankVerified: false,
  applicationSubmittedAt: '',
  menTutorialWatchedPercent: 0,
  womenTutorialWatchedPercent: 0,
  menTutorialCompleted: false,
  womenTutorialCompleted: false,
  tutorialConfirmationChecked: false,
  city: '',
  streetAddress: '',
  dateOfBirth: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  vehicleNumber: '',
  vehicleType: '',
  fullName: '',
  phoneNumber: '',
  gmailAddress: '',
  residentialAddress: '',
  pincode: '',
  partnerPhotoUrl: '',
  partnerPhotoPreviewUrl: '',
  upiId: '',
  bankAccountNumber: '',
  verified: false,
  adminApproved: false,
  tutorialCompleted: false,
};

export const EMPTY_TAILOR_PROFILE: TailorProfile = {
  documentType: '',
  documentNumber: '',
  documentUploaded: false,
  documentFileName: '',
  shopName: '',
  specialty: 'Stitching',
  machineType: '',
  machineNumber: '',
  dailyCapacity: '',
  ownerName: '',
  phoneNumber: '',
  email: '',
  shopAddress: '',
  city: '',
  pincode: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  ifscCode: '',
  upiId: '',
  bankVerified: false,
  liveCameraCaptured: false,
  liveCameraTimestamp: '',
  liveCameraDataUrl: '',
  liveCameraAddress: '',
  liveCameraCoords: undefined,
  liveCameraMachineType: '',
  verified: false,
  adminApproved: false,
};

export const INITIAL_TAILOR_ORDERS: TailorOrder[] = [];

export const INITIAL_DELIVERY_TASKS: DeliveryTask[] = [];

export const INITIAL_NOTIFICATIONS: PartnerNotification[] = [];

export const INITIAL_LEDGER: LedgerTransaction[] = [];
