import { AgentContextSnapshot, AgentProposal } from '../types.ts';

/**
 * 4. Delivery Monitoring Agent
 * What it observes: Assignment status, pickup/drop-off evidence, timestamps
 * What it can do: Detect delays, verify delivery events, request recovery actions
 */
export function runDeliveryMonitoringAgent(
  ctx: AgentContextSnapshot,
  leg: 'first_leg' | 'second_leg'
): AgentProposal {
  const { order, firstDeliveryTask, secondDeliveryTask } = ctx;

  if (leg === 'first_leg') {
    const status = firstDeliveryTask?.status || order.firstDeliveryStatus || 'assigned';
    const measurementsRecorded = Boolean(firstDeliveryTask?.recordedMeasurements);
    const isDeliveredToTailor =
      status === 'delivered_to_tailor' ||
      status === 'cloth_delivered' ||
      order.firstDeliveryStatus === 'delivered_to_tailor';

    return {
      selectedAgent: 'Delivery Monitoring Agent',
      toolName: 'verifyFirstLegDelivery',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        taskId: firstDeliveryTask?.id || null,
        legStatus: status,
        measurementsRecorded,
        pickedUpAt: firstDeliveryTask?.pickedUpAt || null,
        deliveredAt: firstDeliveryTask?.deliveredAt || null,
      },
      reasoning: isDeliveredToTailor
        ? `Delivery Monitoring Agent verified backend drop-off of cloth at ${order.tailorShopName} for Order #${order.orderNumber}.`
        : `Delivery Monitoring Agent is tracking Stage 04 (Leg 1: Customer -> Tailor) for Order #${order.orderNumber}. Current task status: "${status}". Waiting for real backend delivery confirmation.`,
      idempotencyKey: `del-mon-leg1-${order.id}-${status}`,
      requiresBackendEventToAdvance: !isDeliveredToTailor,
    };
  }

  // Second leg: Tailor -> Customer
  const status = secondDeliveryTask?.status || order.secondDeliveryStatus || 'assigned';
  const isDeliveredToCustomer =
    status === 'delivered_to_customer' ||
    order.secondDeliveryStatus === 'delivered_to_customer' ||
    order.orderStatus === 'Delivered to Customer' ||
    order.orderStatus === 'Order Completed';

  return {
    selectedAgent: 'Delivery Monitoring Agent',
    toolName: 'verifyFinalCustomerDelivery',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      taskId: secondDeliveryTask?.id || null,
      legStatus: status,
      pickedUpAt: secondDeliveryTask?.pickedUpAt || null,
      deliveredAt: secondDeliveryTask?.deliveredAt || null,
    },
    reasoning: isDeliveredToCustomer
      ? `Delivery Monitoring Agent verified final drop-off evidence to customer ${order.customerName} for Order #${order.orderNumber}.`
      : `Delivery Monitoring Agent is tracking Stage 10 (Leg 2: Tailor -> Customer) for Order #${order.orderNumber}. Current status: "${status}". Waiting for backend drop-off confirmation.`,
    idempotencyKey: `del-mon-leg2-${order.id}-${status}`,
    requiresBackendEventToAdvance: !isDeliveredToCustomer,
  };
}
