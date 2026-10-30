import { AgentContextSnapshot, AgentProposal, WorkflowStageNumber } from '../types.ts';

/**
 * 3. Tailor Workflow Agent
 * What it observes: Workbench readiness, tailor acceptance, progress uploads
 * What it can do: Send reminders, request confirmation, advance valid workflow steps
 */
export function runTailorWorkflowAgent(
  ctx: AgentContextSnapshot,
  stageNumber: WorkflowStageNumber
): AgentProposal {
  const { order } = ctx;

  if (stageNumber === 5) {
    const workbenchReady = Boolean(order.workbench?.readyToBegin);
    const tailorAccepted =
      order.stage === 'accepted' || order.stage === 'working' || order.stage === 'completed';

    return {
      selectedAgent: 'Tailor Workflow Agent',
      toolName: 'confirmTailorWorkbenchReadiness',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tailorAccepted,
        workbenchReady,
        workbenchStatus: order.workbench?.statusLabel || 'Awaiting Workbench Prep',
      },
      reasoning:
        tailorAccepted && workbenchReady
          ? `Tailor Workflow Agent verified order acceptance and workbench readiness (${order.workbench?.statusLabel}) for Order #${order.orderNumber}.`
          : `Tailor Workflow Agent observed Stage 05 for Order #${order.orderNumber}: waiting for Tailor Partner to accept order and mark workbench ready.`,
      idempotencyKey: `tailor-wb-${order.id}-${tailorAccepted}-${workbenchReady}`,
      requiresBackendEventToAdvance: !(tailorAccepted && workbenchReady),
    };
  }

  if (stageNumber === 6) {
    const customerContacted = Boolean(order.customerContacted);
    return {
      selectedAgent: 'Tailor Workflow Agent',
      toolName: 'authorizeTailorStartWork',
      toolArgs: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerContacted,
        customerCalledAt: order.customerCalledAt || null,
        currentStage: order.stage,
      },
      reasoning: customerContacted
        ? `Tailor Workflow Agent confirmed customer contact (${
            order.customerCalledAt || 'verified'
          }) for Order #${order.orderNumber}. Waiting for Tailor to start stitching work.`
        : `Tailor Workflow Agent + Communication Agent remind Tailor to contact ${order.customerName} before starting work on Order #${order.orderNumber}.`,
      idempotencyKey: `tailor-contact-${order.id}-${customerContacted}`,
      requiresBackendEventToAdvance: order.stage !== 'working' && order.stage !== 'completed',
    };
  }

  // Stage 07: Track tailoring progress
  const progressCount = order.progressUpdates?.length || 0;
  return {
    selectedAgent: 'Tailor Workflow Agent',
    toolName: 'monitorTailorProgressEvidence',
    toolArgs: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      progressUpdatesCount: progressCount,
      latestStatus:
        order.progressUpdates?.[progressCount - 1]?.workStatus || 'Awaiting First Progress Upload',
    },
    reasoning:
      progressCount > 0
        ? `Tailor Workflow Agent verified ${progressCount} progress update(s) with photo evidence for Order #${order.orderNumber}.`
        : `Tailor Workflow Agent is monitoring Stage 07 for Order #${order.orderNumber}. Waiting for Tailor to upload stitching progress photo evidence.`,
    idempotencyKey: `tailor-progress-${order.id}-${progressCount}`,
    requiresBackendEventToAdvance: progressCount === 0,
  };
}
