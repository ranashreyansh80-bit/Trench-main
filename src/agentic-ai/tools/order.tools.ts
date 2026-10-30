import { AgentContextSnapshot, ToolExecutionResult } from '../types.ts';

export function executeOrderTool(
  ctx: AgentContextSnapshot,
  toolName: string,
  toolArgs: Record<string, any>
): ToolExecutionResult {
  const { order } = ctx;

  if (toolName === 'requestMissingOrderRequirements') {
    const missing: string[] = Array.isArray(toolArgs.missingFields)
      ? toolArgs.missingFields
      : ['customer_measurements'];
    return {
      executed: true,
      summary: `Order Agent flagged missing customer requirements (${missing.join(
        ', '
      )}) for Order #${order.orderNumber} and notified Customer App.`,
      canAdvanceStage: false,
    };
  }

  return {
    executed: true,
    summary: `Order Agent verified Order #${order.orderNumber} requirements (Service: ${
      order.selectedService || 'measurement_plus_cloth_pickup'
    }, Address: ${order.customerAddress}).`,
    canAdvanceStage: true,
  };
}
