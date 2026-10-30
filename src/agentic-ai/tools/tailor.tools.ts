import { AgentContextSnapshot, ToolExecutionResult } from '../types.ts';

export function executeTailorTool(
  ctx: AgentContextSnapshot,
  toolName: string,
  _toolArgs: Record<string, any>
): ToolExecutionResult {
  const { order } = ctx;

  if (toolName === 'confirmTailorWorkbenchReadiness') {
    const ready = Boolean(order.workbench?.readyToBegin && order.stage !== 'incoming');
    return {
      executed: true,
      summary: ready
        ? `Tailor Workflow Agent verified workbench readiness (${order.workbench?.statusLabel}) for Order #${order.orderNumber}.`
        : `Tailor Workflow Agent requested Tailor confirmation of incoming order & workbench readiness for #${order.orderNumber}.`,
      canAdvanceStage: ready,
    };
  }

  if (toolName === 'authorizeTailorStartWork') {
    const canStart = Boolean(
      order.customerContacted && (order.stage === 'working' || order.stage === 'completed')
    );
    return {
      executed: true,
      summary: canStart
        ? `Tailor Workflow Agent confirmed customer contact and active stitching work for Order #${order.orderNumber}.`
        : order.customerContacted
        ? `Customer contact verified for #${order.orderNumber}; waiting for Tailor to click "Start Work".`
        : `Tailor Workflow Agent + Communication Agent reminded Tailor to contact ${order.customerName} before starting work on #${order.orderNumber}.`,
      canAdvanceStage: canStart,
    };
  }

  if (toolName === 'monitorTailorProgressEvidence') {
    const count = order.progressUpdates?.length || 0;
    return {
      executed: true,
      summary:
        count > 0
          ? `Tailor Workflow Agent verified ${count} uploaded work progress record(s) for Order #${order.orderNumber}.`
          : `Tailor Workflow Agent is waiting for Tailor to upload stitching progress photo evidence for #${order.orderNumber}.`,
      canAdvanceStage: count > 0,
    };
  }

  // verifyTailorCompletionEvidence
  const hasEvidence = Boolean(order.progressUpdates && order.progressUpdates.length > 0);
  const completed = order.stage === 'completed' && hasEvidence;
  return {
    executed: true,
    summary: completed
      ? `Exception Agent + Orchestrator verified Tailor completion submission and photo evidence for #${order.orderNumber}.`
      : `Stage 08 completion check: ${
          hasEvidence
            ? 'Progress evidence verified; waiting for Tailor to submit final completion.'
            : 'Blocked: Tailor must upload progress/completion evidence before Stage 09 dispatch.'
        }`,
    canAdvanceStage: completed,
  };
}
