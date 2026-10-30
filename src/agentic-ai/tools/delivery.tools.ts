import { AgentContextSnapshot, ToolExecutionResult } from '../types.ts';

export function executeDeliveryTool(
  ctx: AgentContextSnapshot,
  toolName: string,
  _toolArgs: Record<string, any>
): ToolExecutionResult {
  const { order, firstDeliveryTask, secondDeliveryTask } = ctx;

  if (toolName === 'verifyFirstLegDelivery') {
    const status = firstDeliveryTask?.status || order.firstDeliveryStatus || 'assigned';
    const delivered =
      status === 'delivered_to_tailor' ||
      status === 'cloth_delivered' ||
      order.firstDeliveryStatus === 'delivered_to_tailor' ||
      order.stage === 'accepted' ||
      order.stage === 'working' ||
      order.stage === 'completed';

    return {
      executed: true,
      summary: delivered
        ? `Delivery Monitoring Agent verified Leg 1 cloth drop-off at ${order.tailorShopName} for Order #${order.orderNumber}.`
        : `Delivery Monitoring Agent inspected Leg 1 status ("${status}") for #${order.orderNumber}. Holding Stage 04 until backend confirms drop-off at Tailor.`,
      canAdvanceStage: delivered,
    };
  }

  // verifyFinalCustomerDelivery
  const status = secondDeliveryTask?.status || order.secondDeliveryStatus || 'assigned';
  const finalDelivered =
    status === 'delivered_to_customer' ||
    order.secondDeliveryStatus === 'delivered_to_customer' ||
    order.orderStatus === 'Delivered to Customer' ||
    order.orderStatus === 'Order Completed';

  return {
    executed: true,
    summary: finalDelivered
      ? `Delivery Monitoring Agent verified final customer drop-off for Order #${order.orderNumber}.`
      : `Delivery Monitoring Agent inspected Leg 2 status ("${status}") for #${order.orderNumber}. Holding Stage 10 until backend confirms customer delivery.`,
    canAdvanceStage: finalDelivered,
  };
}
