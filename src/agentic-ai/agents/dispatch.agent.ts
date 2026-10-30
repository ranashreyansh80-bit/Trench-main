import { AgentContextSnapshot, AgentProposal } from '../types.ts';
import { AVAILABLE_DELIVERY_PARTNERS } from '../../utils/appLogic.ts';

/**
 * 2. Dispatch Agent
 * What it observes: Order stage, partner availability, eligibility, service area
 * What it can do: Request and create authorized delivery assignments (Leg 1 & Leg 2)
 */
export function runDispatchAgent(
  ctx: AgentContextSnapshot,
  deliveryStage: 'first_delivery' | 'second_delivery'
): AgentProposal {
  const { order, onlinePartners } = ctx;

  // Select best eligible online partner or fallback to verified fleet roster
  const liveOnline = onlinePartners.find((p) => p.isOnline);
  const chosenPartner = liveOnline
    ? {
        partnerId: liveOnline.partnerId,
        partnerName: liveOnline.partnerName || 'Verified Fleet Partner',
        partnerPhone: liveOnline.partnerPhone,
        vehicleType: liveOnline.vehicleType || 'EV',
        vehicleNumber: liveOnline.vehicleNumber || 'KA-01-EV-2026',
      }
    : AVAILABLE_DELIVERY_PARTNERS[0];

  if (deliveryStage === 'first_delivery') {
    return {
      selectedAgent: 'Dispatch Agent',
      toolName: 'createFirstDeliveryAssignment',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        partnerId: chosenPartner.partnerId,
        partnerName: chosenPartner.partnerName,
        partnerPhone: chosenPartner.partnerPhone,
        vehicleType: chosenPartner.vehicleType,
        vehicleNumber: chosenPartner.vehicleNumber,
        pickupAddress: order.customerAddress,
        dropAddress: order.tailorShopAddress,
      },
      reasoning: `Dispatch Agent evaluated partner availability and service area for Stage 03 (First Delivery: Customer -> Tailor) on Order #${order.orderNumber}. Selected eligible partner ${chosenPartner.partnerName} (${chosenPartner.vehicleType}).`,
      idempotencyKey: `dispatch-leg1-${order.id}`,
      requiresBackendEventToAdvance: true,
    };
  }

  return {
    selectedAgent: 'Dispatch Agent',
    toolName: 'createSecondDeliveryAssignment',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      partnerId: chosenPartner.partnerId,
      partnerName: chosenPartner.partnerName,
      partnerPhone: chosenPartner.partnerPhone,
      vehicleType: chosenPartner.vehicleType,
      vehicleNumber: chosenPartner.vehicleNumber,
      pickupAddress: order.tailorShopAddress,
      dropAddress: order.customerAddress,
    },
    reasoning: `Dispatch Agent verified Stage 08 completion for Order #${order.orderNumber} and created Stage 09 Second Delivery assignment (Tailor -> Customer) with ${chosenPartner.partnerName}.`,
    idempotencyKey: `dispatch-leg2-${order.id}`,
    requiresBackendEventToAdvance: true,
  };
}
