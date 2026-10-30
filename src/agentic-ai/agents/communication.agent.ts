import { AgentContextSnapshot, AgentProposal } from '../types.ts';

/**
 * 5. Communication Agent
 * What it observes: Verified order events and communication preferences
 * What it can do: Send relevant notifications and record delivery results
 */
export function runCommunicationAgent(
  ctx: AgentContextSnapshot,
  mode: 'remind_tailor_contact' | 'close_order_lifecycle'
): AgentProposal {
  const { order } = ctx;

  if (mode === 'remind_tailor_contact') {
    return {
      selectedAgent: 'Communication Agent',
      toolName: 'sendVerifiedPortalNotification',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        targetRole: 'tailor',
        message: `Reminder: Please contact ${order.customerName} (${order.customerPhone}) to confirm fit & stitch notes before starting work on #${order.orderNumber}.`,
      },
      reasoning: `Communication Agent dispatched a verified reminder to ${order.tailorShopName} to contact customer ${order.customerName} before starting work on Order #${order.orderNumber}.`,
      idempotencyKey: `comm-remind-contact-${order.id}`,
      requiresBackendEventToAdvance: true,
    };
  }

  return {
    selectedAgent: 'Communication Agent',
    toolName: 'closeOrderLifecycle',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      tailorShopName: order.tailorShopName,
      finalStatus: 'Order Completed',
    },
    reasoning: `Orchestrator + Communication Agent verified all 11 lifecycle stages for Order #${order.orderNumber}, recorded final audit trail, and notified Customer, Tailor, and Delivery Partner.`,
    idempotencyKey: `comm-close-lifecycle-${order.id}`,
    requiresBackendEventToAdvance: false,
  };
}
