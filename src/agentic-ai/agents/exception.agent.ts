import { AgentContextSnapshot, AgentProposal } from '../types.ts';

/**
 * 6. Exception Agent
 * What it observes: Failed tools, timeouts, conflicting states, missing evidence
 * What it can do: Retry eligible operations, pause unsafe transitions, escalate to a human
 */
export function runExceptionAgent(ctx: AgentContextSnapshot): AgentProposal {
  const { order } = ctx;
  const progressCount = order.progressUpdates?.length || 0;
  const hasEvidence = progressCount > 0;

  if (!hasEvidence) {
    return {
      selectedAgent: 'Exception Agent',
      toolName: 'verifyTailorCompletionEvidence',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        progressCount,
        evidencePresent: false,
      },
      reasoning: `Exception Agent inspected Stage 08 completion readiness for Order #${order.orderNumber} and detected missing work progress/completion photo evidence. Pausing transition to Stage 09.`,
      idempotencyKey: `exc-completion-missing-${order.id}`,
      requiresBackendEventToAdvance: true,
    };
  }

  return {
    selectedAgent: 'Exception Agent',
    toolName: 'verifyTailorCompletionEvidence',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      progressCount,
      evidencePresent: true,
      completedByTailor: order.stage === 'completed',
    },
    reasoning:
      order.stage === 'completed'
        ? `Orchestrator + Exception Agent verified ${progressCount} uploaded progress record(s) and Tailor completion submission for Order #${order.orderNumber}. Authorizing Stage 09 Second Delivery.`
        : `Orchestrator + Exception Agent verified ${progressCount} progress evidence upload(s) for Order #${order.orderNumber}. Ready for Tailor to mark order Completed.`,
    idempotencyKey: `exc-completion-ok-${order.id}-${order.stage}`,
    requiresBackendEventToAdvance: order.stage !== 'completed',
  };
}
