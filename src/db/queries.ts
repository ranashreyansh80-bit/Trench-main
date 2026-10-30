import { eq, desc, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  deliveryProfiles,
  tailorProfiles,
  tailorOrders,
  deliveryTasks,
  notifications,
  ledgerTransactions,
  deliveryOffers,
  partnerLocations,
  users,
} from './schema.ts';
import {
  DeliveryPartnerProfile,
  TailorProfile,
  TailorOrder,
  DeliveryTask,
  PartnerNotification,
  LedgerTransaction,
  IncomingDeliveryOffer,
  PartnerLiveLocation,
} from '../types/appTypes.ts';

// User helper
export async function getOrCreateUser(uid: string, email?: string, phone?: string, role: string = 'delivery') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [inserted] = await db
      .insert(users)
      .values({
        uid,
        email: email || '',
        phone: phone || '',
        role,
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('Failed to get/create user:', error);
    throw new Error('Database error getting user', { cause: error });
  }
}

// Delivery Profile
export async function getDeliveryProfile(phone: string): Promise<DeliveryPartnerProfile | null> {
  try {
    const records = await db
      .select()
      .from(deliveryProfiles)
      .where(eq(deliveryProfiles.phone, phone))
      .limit(1);

    if (records.length === 0) return null;
    const r = records[0];

    return {
      documentType: (r.documentType as any) || 'Aadhaar Card',
      documentNumber: r.documentNumber || '',
      documentUploaded: r.documentUploaded || false,
      documentFileName: r.documentFileName || '',
      documentPreviewUrl: r.documentPreviewUrl || '',
      aadhaarStatus: (r.aadhaarStatus as any) || 'Pending',
      panNumber: r.panNumber || '',
      panUploaded: r.panUploaded || false,
      panFileName: r.panFileName || '',
      panPreviewUrl: r.panPreviewUrl || '',
      panStatus: (r.panStatus as any) || 'Pending',
      drivingLicenseUploaded: r.drivingLicenseUploaded || false,
      drivingLicenseFileName: r.drivingLicenseFileName || '',
      drivingLicensePreviewUrl: r.drivingLicensePreviewUrl || '',
      vehicleNumber: r.vehicleNumber || '',
      vehicleType: (r.vehicleType as any) || 'EV',
      fullName: r.fullName || '',
      phoneNumber: r.phone,
      gmailAddress: r.gmailAddress || '',
      residentialAddress: r.residentialAddress || '',
      pincode: r.pincode || '',
      partnerPhotoUrl: r.partnerPhotoUrl || '',
      partnerPhotoPreviewUrl: r.partnerPhotoPreviewUrl || '',
      upiId: r.upiId || '',
      bankAccountNumber: r.bankAccountNumber || '',
      verified: r.verified || false,
      adminApproved: r.adminApproved || false,
      tutorialCompleted: r.tutorialCompleted || false,
    };
  } catch (error) {
    console.error('Failed to get delivery profile:', error);
    throw new Error('Database query failed for delivery profile', { cause: error });
  }
}

export async function upsertDeliveryProfile(p: DeliveryPartnerProfile) {
  try {
    const existing = await db
      .select()
      .from(deliveryProfiles)
      .where(eq(deliveryProfiles.phone, p.phoneNumber))
      .limit(1);

    const values = {
      phone: p.phoneNumber,
      fullName: p.fullName || '',
      documentType: p.documentType || 'Aadhaar Card',
      documentNumber: p.documentNumber || '',
      documentUploaded: p.documentUploaded || false,
      documentFileName: p.documentFileName || '',
      documentPreviewUrl: p.documentPreviewUrl || '',
      aadhaarStatus: p.aadhaarStatus || 'Pending',
      panNumber: p.panNumber || '',
      panUploaded: p.panUploaded || false,
      panFileName: p.panFileName || '',
      panPreviewUrl: p.panPreviewUrl || '',
      panStatus: p.panStatus || 'Pending',
      drivingLicenseUploaded: p.drivingLicenseUploaded || false,
      drivingLicenseFileName: p.drivingLicenseFileName || '',
      drivingLicensePreviewUrl: p.drivingLicensePreviewUrl || '',
      vehicleNumber: p.vehicleNumber || '',
      vehicleType: p.vehicleType || 'EV',
      gmailAddress: p.gmailAddress || '',
      residentialAddress: p.residentialAddress || '',
      pincode: p.pincode || '',
      partnerPhotoUrl: p.partnerPhotoUrl || '',
      partnerPhotoPreviewUrl: p.partnerPhotoPreviewUrl || '',
      upiId: p.upiId || '',
      bankAccountNumber: p.bankAccountNumber || '',
      verified: p.verified || false,
      adminApproved: p.adminApproved || false,
      tutorialCompleted: p.tutorialCompleted || false,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(deliveryProfiles)
        .set(values)
        .where(eq(deliveryProfiles.phone, p.phoneNumber));
    } else {
      await db.insert(deliveryProfiles).values(values);
    }
    return p;
  } catch (error) {
    console.error('Failed to upsert delivery profile:', error);
    throw new Error('Database upsert failed for delivery profile', { cause: error });
  }
}

// Tailor Profile
export async function getTailorProfile(phone: string): Promise<TailorProfile | null> {
  try {
    const records = await db
      .select()
      .from(tailorProfiles)
      .where(eq(tailorProfiles.phone, phone))
      .limit(1);

    if (records.length === 0) return null;
    const r = records[0];

    return {
      documentType: r.documentType || '',
      documentNumber: r.documentNumber || '',
      documentUploaded: r.documentUploaded || false,
      documentFileName: r.documentFileName || '',
      documentPreviewUrl: r.documentPreviewUrl || '',
      shopName: r.shopName || '',
      specialty: (r.specialty as any) || 'Stitching',
      liveCameraCaptured: r.liveCameraCaptured || false,
      liveCameraTimestamp: r.liveCameraTimestamp || '',
      liveCameraDataUrl: r.liveCameraDataUrl || '',
      verified: r.verified || false,
      adminApproved: r.adminApproved || false,
    };
  } catch (error) {
    console.error('Failed to get tailor profile:', error);
    throw new Error('Database query failed for tailor profile', { cause: error });
  }
}

export async function upsertTailorProfile(phone: string, p: TailorProfile) {
  try {
    const existing = await db
      .select()
      .from(tailorProfiles)
      .where(eq(tailorProfiles.phone, phone))
      .limit(1);

    const values = {
      phone,
      shopName: p.shopName || '',
      specialty: p.specialty || 'Stitching',
      documentType: p.documentType || '',
      documentNumber: p.documentNumber || '',
      documentUploaded: p.documentUploaded || false,
      documentFileName: p.documentFileName || '',
      documentPreviewUrl: p.documentPreviewUrl || '',
      liveCameraCaptured: p.liveCameraCaptured || false,
      liveCameraTimestamp: p.liveCameraTimestamp || '',
      liveCameraDataUrl: p.liveCameraDataUrl || '',
      verified: p.verified || false,
      adminApproved: p.adminApproved || false,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db.update(tailorProfiles).set(values).where(eq(tailorProfiles.phone, phone));
    } else {
      await db.insert(tailorProfiles).values(values);
    }
    return p;
  } catch (error) {
    console.error('Failed to upsert tailor profile:', error);
    throw new Error('Database upsert failed for tailor profile', { cause: error });
  }
}

// Tailor Orders
export async function getTailorOrders(): Promise<TailorOrder[]> {
  try {
    const rows = await db.select().from(tailorOrders).orderBy(desc(tailorOrders.createdAt));
    return rows.map((r) => {
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
        if (r.sizeChartJson) sizeChart = JSON.parse(r.sizeChartJson);
      } catch {}
      try {
        if (r.colorGradeJson) {
          const parsed = JSON.parse(r.colorGradeJson);
          if (parsed && parsed._workflow) {
            workflowMeta = parsed._workflow;
            const { _workflow, ...restColor } = parsed;
            colorGrade = restColor;
          } else if (parsed) {
            colorGrade = parsed;
          }
        }
      } catch {}

      return {
        id: r.orderId,
        orderNumber: r.orderNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerAddress: r.customerAddress,
        clothToBeAltered: r.clothToBeAltered,
        clothDescription: r.clothDescription || '',
        sizeChart,
        colorGrade,
        noteToTailor: r.noteToTailor || '',
        stage: r.stage as any,
        tailorPayoutINR: r.tailorPayoutINR,
        deliveryPayoutINR: r.deliveryPayoutINR,
        tailorShopName: r.tailorShopName,
        tailorShopAddress: r.tailorShopAddress,
        placedAt: r.placedAt,
        completedAt: r.completedAt || undefined,
        pickupDispatched: r.pickupDispatched || false,
        ...workflowMeta,
      };
    });
  } catch (error) {
    console.error('Failed to get tailor orders:', error);
    throw new Error('Database query failed for tailor orders', { cause: error });
  }
}

export async function upsertTailorOrder(order: TailorOrder) {
  try {
    const existing = await db
      .select()
      .from(tailorOrders)
      .where(eq(tailorOrders.orderId, order.id))
      .limit(1);

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

    const values = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      clothToBeAltered: order.clothToBeAltered,
      clothDescription: order.clothDescription || '',
      sizeChartJson: JSON.stringify(order.sizeChart),
      colorGradeJson: JSON.stringify({
        ...order.colorGrade,
        _workflow: workflowMeta,
      }),
      noteToTailor: order.noteToTailor || '',
      stage: order.stage,
      tailorPayoutINR: order.tailorPayoutINR,
      deliveryPayoutINR: order.deliveryPayoutINR,
      tailorShopName: order.tailorShopName,
      tailorShopAddress: order.tailorShopAddress,
      placedAt: order.placedAt,
      completedAt: order.completedAt || null,
      pickupDispatched: order.pickupDispatched || false,
    };

    if (existing.length > 0) {
      await db.update(tailorOrders).set(values).where(eq(tailorOrders.orderId, order.id));
    } else {
      await db.insert(tailorOrders).values(values);
    }
    return order;
  } catch (error) {
    console.error('Failed to upsert tailor order:', error);
    throw new Error('Database upsert failed for tailor order', { cause: error });
  }
}

// Delivery Tasks
export async function getDeliveryTasks(): Promise<DeliveryTask[]> {
  try {
    const rows = await db.select().from(deliveryTasks).orderBy(desc(deliveryTasks.createdAt));
    return rows.map((r) => {
      let mapCoords = { x: 50, y: 50 };
      let taskWorkflowMeta: any = {};
      let recordedMeasurements = undefined;
      try {
        if (r.mapCoordsJson) {
          const parsed = JSON.parse(r.mapCoordsJson);
          if (parsed && parsed._taskWorkflow) {
            taskWorkflowMeta = parsed._taskWorkflow;
            mapCoords = { x: parsed.x ?? 50, y: parsed.y ?? 50 };
          } else if (parsed) {
            mapCoords = parsed;
          }
        }
      } catch {}
      try {
        if (r.recordedMeasurementsJson) recordedMeasurements = JSON.parse(r.recordedMeasurementsJson);
      } catch {}

      return {
        id: r.taskId,
        orderNumber: r.orderNumber,
        category: r.category as any,
        title: r.title,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        pickupAddress: r.pickupAddress,
        dropAddress: r.dropAddress,
        garmentSummary: r.garmentSummary,
        payoutINR: r.payoutINR,
        distanceKm: parseFloat(r.distanceKm || '2.5') || 2.5,
        etaMinutes: r.etaMinutes || 15,
        status: r.status as any,
        linkedTailorOrderId: r.linkedTailorOrderId || undefined,
        isUrgentTailorPickup: r.isUrgentTailorPickup || false,
        mapCoords,
        recordedMeasurements,
        ...taskWorkflowMeta,
      };
    });
  } catch (error) {
    console.error('Failed to get delivery tasks:', error);
    throw new Error('Database query failed for delivery tasks', { cause: error });
  }
}

export async function upsertDeliveryTask(task: DeliveryTask) {
  try {
    const existing = await db
      .select()
      .from(deliveryTasks)
      .where(eq(deliveryTasks.taskId, task.id))
      .limit(1);

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

    const values = {
      taskId: task.id,
      orderNumber: task.orderNumber,
      category: task.category,
      title: task.title,
      customerName: task.customerName,
      customerPhone: task.customerPhone,
      pickupAddress: task.pickupAddress,
      dropAddress: task.dropAddress,
      garmentSummary: task.garmentSummary,
      payoutINR: task.payoutINR,
      distanceKm: String(task.distanceKm),
      etaMinutes: task.etaMinutes,
      status: task.status,
      linkedTailorOrderId: task.linkedTailorOrderId || null,
      isUrgentTailorPickup: task.isUrgentTailorPickup || false,
      mapCoordsJson: JSON.stringify({
        ...task.mapCoords,
        _taskWorkflow: taskWorkflowMeta,
      }),
      recordedMeasurementsJson: task.recordedMeasurements ? JSON.stringify(task.recordedMeasurements) : null,
    };

    if (existing.length > 0) {
      await db.update(deliveryTasks).set(values).where(eq(deliveryTasks.taskId, task.id));
    } else {
      await db.insert(deliveryTasks).values(values);
    }
    return task;
  } catch (error) {
    console.error('Failed to upsert delivery task:', error);
    throw new Error('Database upsert failed for delivery task', { cause: error });
  }
}

// Notifications
export async function getNotifications(): Promise<PartnerNotification[]> {
  try {
    const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    return rows.map((r) => ({
      id: r.notifId,
      orderNumber: r.orderNumber,
      linkedOrderId: r.linkedOrderId,
      tailorShopName: r.tailorShopName,
      tailorAddress: r.tailorAddress,
      customerName: r.customerName,
      clothToBeAltered: r.clothToBeAltered,
      message: r.message,
      timestamp: r.timestamp,
      acknowledged: r.acknowledged || false,
      payoutINR: r.payoutINR,
    }));
  } catch (error) {
    console.error('Failed to get notifications:', error);
    throw new Error('Database query failed for notifications', { cause: error });
  }
}

export async function upsertNotification(n: PartnerNotification) {
  try {
    const existing = await db
      .select()
      .from(notifications)
      .where(eq(notifications.notifId, n.id))
      .limit(1);

    const values = {
      notifId: n.id,
      orderNumber: n.orderNumber,
      linkedOrderId: n.linkedOrderId,
      tailorShopName: n.tailorShopName,
      tailorAddress: n.tailorAddress,
      customerName: n.customerName,
      clothToBeAltered: n.clothToBeAltered,
      message: n.message,
      timestamp: n.timestamp,
      acknowledged: n.acknowledged || false,
      payoutINR: n.payoutINR,
    };

    if (existing.length > 0) {
      await db.update(notifications).set(values).where(eq(notifications.notifId, n.id));
    } else {
      await db.insert(notifications).values(values);
    }
    return n;
  } catch (error) {
    console.error('Failed to upsert notification:', error);
    throw new Error('Database upsert failed for notification', { cause: error });
  }
}

// Ledger Transactions
export async function getLedgerTransactions(): Promise<LedgerTransaction[]> {
  try {
    const rows = await db.select().from(ledgerTransactions).orderBy(desc(ledgerTransactions.createdAt));
    return rows.map((r) => ({
      id: r.txId,
      role: r.role as any,
      orderNumber: r.orderNumber,
      description: r.description,
      categoryLabel: r.categoryLabel,
      amountINR: r.amountINR,
      timestamp: r.timestamp,
      status: r.status as any,
    }));
  } catch (error) {
    console.error('Failed to get ledger transactions:', error);
    throw new Error('Database query failed for ledger', { cause: error });
  }
}

export async function addLedgerTransaction(tx: LedgerTransaction) {
  try {
    await db.insert(ledgerTransactions).values({
      txId: tx.id,
      role: tx.role,
      orderNumber: tx.orderNumber,
      description: tx.description,
      categoryLabel: tx.categoryLabel,
      amountINR: tx.amountINR,
      timestamp: tx.timestamp,
      status: tx.status,
    });
    return tx;
  } catch (error) {
    console.error('Failed to add ledger transaction:', error);
    throw new Error('Database insert failed for ledger transaction', { cause: error });
  }
}

// Clean synthetic data if any exists in tables so app starts brand new
export async function seedAllDataIfEmpty() {
  try {
    const syntheticOrderNumbers = ['TRN-8821', 'TRN-8824', 'TRN-8819', 'TRN-8830', 'TRN-8815', 'TRN-8818', 'TRN-8812', 'TRN-8805', 'TRN-8794'];
    const syntheticOrderIds = ['ord-101', 'ord-102', 'ord-103', 'ord-104'];
    const syntheticTaskIds = ['task-101', 'task-102', 'task-103'];
    const syntheticNotifIds = ['notif-101', 'notif-102'];
    const syntheticTxIds = ['tx-init-1', 'tx-init-2', 'tx-del-sample-1', 'tx-del-sample-2', 'tx-del-sample-3', 'tx-del-sample-4', 'tx-del-sample-5'];

    for (const num of syntheticOrderNumbers) {
      await db.delete(tailorOrders).where(eq(tailorOrders.orderNumber, num)).catch(() => {});
      await db.delete(deliveryTasks).where(eq(deliveryTasks.orderNumber, num)).catch(() => {});
      await db.delete(notifications).where(eq(notifications.orderNumber, num)).catch(() => {});
      await db.delete(ledgerTransactions).where(eq(ledgerTransactions.orderNumber, num)).catch(() => {});
    }

    for (const id of syntheticOrderIds) {
      await db.delete(tailorOrders).where(eq(tailorOrders.orderId, id)).catch(() => {});
    }
    for (const id of syntheticTaskIds) {
      await db.delete(deliveryTasks).where(eq(deliveryTasks.taskId, id)).catch(() => {});
    }
    for (const id of syntheticNotifIds) {
      await db.delete(notifications).where(eq(notifications.notifId, id)).catch(() => {});
    }
    for (const id of syntheticTxIds) {
      await db.delete(ledgerTransactions).where(eq(ledgerTransactions.txId, id)).catch(() => {});
    }

  } catch (error) {
    console.warn('Synthetic cleanup warning (non-fatal):', error);
  }
}

export async function upsertPartnerLocationDb(loc: PartnerLiveLocation) {
  try {
    const existing = await db
      .select()
      .from(partnerLocations)
      .where(eq(partnerLocations.partnerId, loc.partnerId))
      .limit(1);

    const values = {
      partnerId: loc.partnerId,
      partnerPhone: loc.partnerPhone,
      partnerName: loc.partnerName || 'Delivery Partner',
      vehicleType: loc.vehicleType || 'EV',
      vehicleNumber: loc.vehicleNumber || '',
      isOnline: loc.isOnline,
      lat: loc.lat !== null && loc.lat !== undefined ? String(loc.lat) : null,
      lng: loc.lng !== null && loc.lng !== undefined ? String(loc.lng) : null,
      serviceRadiusKm: loc.serviceRadiusKm || 15,
      updatedAt: new Date(loc.updatedAt || Date.now()),
    };

    if (existing.length > 0) {
      await db
        .update(partnerLocations)
        .set(values)
        .where(eq(partnerLocations.partnerId, loc.partnerId));
    } else {
      await db.insert(partnerLocations).values(values);
    }
    return loc;
  } catch (error) {
    console.warn('upsertPartnerLocationDb warning:', error);
    return loc;
  }
}

export async function getAllPartnerLocationsDb(): Promise<PartnerLiveLocation[]> {
  try {
    const rows = await db
      .select()
      .from(partnerLocations)
      .orderBy(desc(partnerLocations.updatedAt));
    return rows.map((r) => ({
      partnerId: r.partnerId,
      partnerPhone: r.partnerPhone,
      partnerName: r.partnerName,
      vehicleType: r.vehicleType || 'EV',
      vehicleNumber: r.vehicleNumber || '',
      isOnline: Boolean(r.isOnline),
      lat: r.lat !== null ? parseFloat(r.lat) : null,
      lng: r.lng !== null ? parseFloat(r.lng) : null,
      serviceRadiusKm: r.serviceRadiusKm || 15,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('getAllPartnerLocationsDb warning:', error);
    return [];
  }
}

export async function upsertDeliveryOfferDb(offer: IncomingDeliveryOffer) {
  try {
    const existing = await db
      .select()
      .from(deliveryOffers)
      .where(eq(deliveryOffers.offerId, offer.offerId))
      .limit(1);

    const values = {
      offerId: offer.offerId,
      orderId: offer.orderId,
      orderNumber: offer.orderNumber,
      taskId: offer.taskId || null,
      partnerId: offer.partnerId,
      partnerPhone: offer.partnerPhone,
      customerName: offer.customerName,
      customerPhone: offer.customerPhone || '',
      restaurantName: offer.restaurantName,
      orderAmountINR: offer.orderAmountINR,
      estimatedEarningsINR: offer.estimatedEarningsINR,
      pickupAddress: offer.pickupAddress,
      deliveryAddress: offer.deliveryAddress,
      pickupLat: offer.pickupCoords ? String(offer.pickupCoords.lat) : null,
      pickupLng: offer.pickupCoords ? String(offer.pickupCoords.lng) : null,
      deliveryLat: offer.deliveryCoords ? String(offer.deliveryCoords.lat) : null,
      deliveryLng: offer.deliveryCoords ? String(offer.deliveryCoords.lng) : null,
      distanceKm: String(offer.distanceKm),
      etaMinutes: offer.etaMinutes,
      garmentSummary: offer.garmentSummary || '',
      deliveryStage: offer.deliveryStage || 'first_delivery',
      status: offer.status,
      expiresAt: new Date(offer.expiresAt),
      respondedAt: offer.respondedAt ? new Date(offer.respondedAt) : null,
    };

    if (existing.length > 0) {
      await db
        .update(deliveryOffers)
        .set(values)
        .where(eq(deliveryOffers.offerId, offer.offerId));
    } else {
      await db.insert(deliveryOffers).values(values);
    }
    return offer;
  } catch (error) {
    console.warn('upsertDeliveryOfferDb warning:', error);
    return offer;
  }
}

export async function getDeliveryOffersDb(): Promise<IncomingDeliveryOffer[]> {
  try {
    const rows = await db
      .select()
      .from(deliveryOffers)
      .orderBy(desc(deliveryOffers.createdAt));
    return rows.map((r) => ({
      offerId: r.offerId,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      taskId: r.taskId || undefined,
      partnerId: r.partnerId,
      partnerPhone: r.partnerPhone,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerPhoneAuthorized: r.status === 'accepted',
      restaurantName: r.restaurantName,
      orderAmountINR: r.orderAmountINR,
      estimatedEarningsINR: r.estimatedEarningsINR,
      pickupAddress: r.pickupAddress,
      deliveryAddress: r.deliveryAddress,
      pickupCoords:
        r.pickupLat && r.pickupLng
          ? { lat: parseFloat(r.pickupLat), lng: parseFloat(r.pickupLng) }
          : null,
      deliveryCoords:
        r.deliveryLat && r.deliveryLng
          ? { lat: parseFloat(r.deliveryLat), lng: parseFloat(r.deliveryLng) }
          : null,
      distanceKm: parseFloat(r.distanceKm || '0') || 0,
      etaMinutes: r.etaMinutes || 15,
      garmentSummary: r.garmentSummary || '',
      deliveryStage: (r.deliveryStage as any) || 'first_delivery',
      status: r.status as any,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
    }));
  } catch (error) {
    console.warn('getDeliveryOffersDb warning:', error);
    return [];
  }
}


