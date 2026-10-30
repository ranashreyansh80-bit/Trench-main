import { AgentContextSnapshot, AgentProposal } from '../types.ts';
import { inspectOrderRequirementCompleteness } from '../workflow-engine.ts';

/**
 * 1. Order Agent
 * What it observes: New orders, service type, measurement completeness
 * What it can do: Validate requirements and request missing information
 */
export function runOrderAgent(ctx: AgentContextSnapshot): AgentProposal {
  const { order, firstDeliveryTask } = ctx;
  const check = inspectOrderRequirementCompleteness(order, firstDeliveryTask);

  if (!check.isComplete) {
    return {
      selectedAgent: 'Order Agent',
      toolName: 'requestMissingOrderRequirements',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        missingFields: check.missingFields,
        selectedService: order.selectedService || 'measurement_plus_cloth_pickup',
      },
      reasoning: `Order Agent inspected Order #${order.orderNumber} (${
        order.selectedService || 'measurement_plus_cloth_pickup'
      }) and found missing fields: ${check.missingFields.join(
        ', '
      )}. Pausing workflow at Stage 02 to request customer input.`,
      idempotencyKey: `order-req-${order.id}-${check.missingFields.join('-')}`,
      requiresBackendEventToAdvance: true,
    };
  }

  return {
    selectedAgent: 'Order Agent',
    toolName: 'validateOrderRequirementsComplete',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      serviceType: order.selectedService || 'measurement_plus_cloth_pickup',
      pickupAddress: order.customerAddress,
    },
    reasoning: `Order Agent verified service type (${
      order.selectedService || 'measurement_plus_cloth_pickup'
    }), garment specification (${order.clothToBeAltered}), measurements, and pickup address for Order #${
      order.orderNumber
    }. Ready for Dispatch Agent.`,
    idempotencyKey: `order-validated-${order.id}`,
    requiresBackendEventToAdvance: false,
  };
}
