import { AgentContextSnapshot, ToolExecutionResult } from '../types.ts';
import { PartnerNotification, TailorOrder } from '../../types/appTypes.ts';

export function executeNotificationTool(
  ctx: AgentContextSnapshot,
  toolName: string,
  toolArgs: Record<string, any>
): ToolExecutionResult {
  const { order, nowLabel } = ctx;

  if (toolName === 'closeOrderLifecycle') {
    const closedOrder: TailorOrder = {
      ...order,
      orderStatus: 'Order Completed',
      secondDeliveryStatus: 'delivered_to_customer',
      completedAt: order.completedAt || nowLabel,
    };

    const closingNotif: PartnerNotification = {
      id: `notif-closed-${order.id}`,
      orderNumber: order.orderNumber,
      linkedOrderId: order.id,
      tailorShopName: order.tailorShopName,
      tailorAddress: order.tailorShopAddress,
      customerName: order.customerName,
      clothToBeAltered: order.clothToBeAltered,
      message: `Lifecycle Closed (#${order.orderNumber}): Final delivery to ${order.customerName} verified. Audit trail preserved.`,
      timestamp: nowLabel,
      acknowledged: false,
      payoutINR: order.deliveryPayoutINR || 85,
      targetRole: 'all',
      workflowStatus: 'Order Completed',
    };

    return {
      executed: true,
      summary: `Orchestrator + Communication Agent closed Stage 11 lifecycle for Order #${order.orderNumber} and notified all portals.`,
      updatedOrder: closedOrder,
      createdNotification: closingNotif,
      canAdvanceStage: false,
    };
  }

  // sendVerifiedPortalNotification
  const notif: PartnerNotification = {
    id: `notif-agent-${order.id}-${Date.now()}`,
    orderNumber: order.orderNumber,
    linkedOrderId: order.id,
    tailorShopName: order.tailorShopName,
    tailorAddress: order.tailorShopAddress,
    customerName: order.customerName,
    clothToBeAltered: order.clothToBeAltered,
    message: String(
      toolArgs.message ||
        `Communication Agent update for Order #${order.orderNumber}`
    ),
    timestamp: nowLabel,
    acknowledged: false,
    payoutINR: order.deliveryPayoutINR || 85,
    targetRole: (toolArgs.targetRole as any) || 'all',
  };

  return {
    executed: true,
    summary: `Communication Agent recorded notification: "${notif.message}"`,
    createdNotification: notif,
    canAdvanceStage: false,
  };
}
