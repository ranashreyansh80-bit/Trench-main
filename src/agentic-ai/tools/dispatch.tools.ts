import { AgentContextSnapshot, ToolExecutionResult } from '../types.ts';
import { AssignedDeliveryPartnerInfo, DeliveryTask, TailorOrder } from '../../types/appTypes.ts';
import { AVAILABLE_DELIVERY_PARTNERS } from '../../utils/appLogic.ts';

export function executeDispatchTool(
  ctx: AgentContextSnapshot,
  toolName: string,
  toolArgs: Record<string, any>
): ToolExecutionResult {
  const { order, firstDeliveryTask, secondDeliveryTask, nowLabel } = ctx;

  const partnerInfo: AssignedDeliveryPartnerInfo = {
    partnerId: String(toolArgs.partnerId || AVAILABLE_DELIVERY_PARTNERS[0].partnerId),
    partnerName: String(toolArgs.partnerName || AVAILABLE_DELIVERY_PARTNERS[0].partnerName),
    partnerPhone: String(toolArgs.partnerPhone || AVAILABLE_DELIVERY_PARTNERS[0].partnerPhone),
    vehicleType: String(toolArgs.vehicleType || AVAILABLE_DELIVERY_PARTNERS[0].vehicleType),
    vehicleNumber: String(toolArgs.vehicleNumber || AVAILABLE_DELIVERY_PARTNERS[0].vehicleNumber),
    assignedAt: nowLabel,
  };

  if (toolName === 'createFirstDeliveryAssignment') {
    if (firstDeliveryTask && order.firstDeliveryPartner?.partnerId) {
      return {
        executed: true,
        idempotentSkip: true,
        summary: `First delivery for #${order.orderNumber} already assigned to ${order.firstDeliveryPartner.partnerName} (idempotent).`,
        canAdvanceStage: false,
      };
    }

    const updatedOrder: TailorOrder = {
      ...order,
      orderStatus: 'First Delivery Assigned',
      firstDeliveryStatus: 'assigned',
      firstDeliveryPartner: partnerInfo,
    };

    const newTask: DeliveryTask = firstDeliveryTask || {
      id: `task-first-${order.id}`,
      orderNumber: order.orderNumber,
      category:
        order.selectedService === 'measurement_plus_cloth_pickup'
          ? 'measurement_only'
          : 'cloth_logistics',
      deliveryStage: 'first_delivery',
      selectedService: order.selectedService || 'measurement_plus_cloth_pickup',
      title: `Leg 1 Pickup (#${order.orderNumber}) — ${order.customerName}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      pickupAddress: order.customerAddress,
      dropAddress: order.tailorShopAddress,
      tailorShopName: order.tailorShopName,
      tailorShopAddress: order.tailorShopAddress,
      garmentSummary: `${order.clothToBeAltered} (Customer -> Tailor)`,
      payoutINR: order.deliveryPayoutINR || 85,
      distanceKm: 2.8,
      etaMinutes: 16,
      status: 'assigned',
      linkedTailorOrderId: order.id,
      assignedPartnerId: partnerInfo.partnerId,
      assignedPartnerName: partnerInfo.partnerName,
      assignedPartnerPhone: partnerInfo.partnerPhone,
      assignedAt: nowLabel,
      mapCoords: { x: 42, y: 48 },
    };

    return {
      executed: true,
      summary: `Dispatch Agent assigned ${partnerInfo.partnerName} for Stage 03 First Delivery (Customer -> Tailor) on Order #${order.orderNumber}.`,
      updatedOrder,
      createdOrUpdatedTask: newTask,
      canAdvanceStage: false, // Must wait for actual partner pickup/drop-off events
    };
  }

  // Stage 09: Second Delivery Assignment (Tailor -> Customer)
  if (secondDeliveryTask && order.secondDeliveryPartner?.partnerId) {
    return {
      executed: true,
      idempotentSkip: true,
      summary: `Second delivery for #${order.orderNumber} already assigned to ${order.secondDeliveryPartner.partnerName} (idempotent).`,
      canAdvanceStage: false,
    };
  }

  const updatedOrder: TailorOrder = {
    ...order,
    pickupDispatched: true,
    orderStatus: 'Second Delivery Assigned',
    secondDeliveryStatus: 'assigned',
    secondDeliveryPartner: partnerInfo,
  };

  const newSecondTask: DeliveryTask = secondDeliveryTask || {
    id: `task-second-${order.id}`,
    orderNumber: order.orderNumber,
    category: 'cloth_logistics',
    deliveryStage: 'second_delivery',
    selectedService: order.selectedService || 'measurement_plus_cloth_pickup',
    title: `Leg 2 Return (#${order.orderNumber}) — ${order.tailorShopName} -> ${order.customerName}`,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    pickupAddress: order.tailorShopAddress,
    dropAddress: order.customerAddress,
    tailorShopName: order.tailorShopName,
    tailorShopAddress: order.tailorShopAddress,
    garmentSummary: `${order.clothToBeAltered} (Tailor -> Customer Final Return)`,
    payoutINR: order.deliveryPayoutINR || 85,
    distanceKm: 2.8,
    etaMinutes: 15,
    status: 'assigned',
    linkedTailorOrderId: order.id,
    isUrgentTailorPickup: true,
    assignedPartnerId: partnerInfo.partnerId,
    assignedPartnerName: partnerInfo.partnerName,
    assignedPartnerPhone: partnerInfo.partnerPhone,
    assignedAt: nowLabel,
    mapCoords: { x: 64, y: 52 },
  };

  return {
    executed: true,
    summary: `Dispatch Agent created Stage 09 Second Delivery assignment (Tailor -> Customer) with ${partnerInfo.partnerName} for Order #${order.orderNumber}.`,
    updatedOrder,
    createdOrUpdatedTask: newSecondTask,
    canAdvanceStage: false, // Wait for backend drop-off confirmation
  };
}
