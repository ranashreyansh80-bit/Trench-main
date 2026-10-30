import {
  AgentContextSnapshot,
  AgentProposal,
  ToolExecutionResult,
} from '../types.ts';
import { executeOrderTool } from '../tools/order.tools.ts';
import { executeDispatchTool } from '../tools/dispatch.tools.ts';
import { executeTailorTool } from '../tools/tailor.tools.ts';
import { executeDeliveryTool } from '../tools/delivery.tools.ts';
import { executeNotificationTool } from '../tools/notification.tools.ts';

const executedIdempotencyKeys = new Set<string>();

export function getExecutedIdempotencyKeys(): Set<string> {
  return executedIdempotencyKeys;
}

export function resetIdempotencyKeysForTesting(): void {
  executedIdempotencyKeys.clear();
}

/**
 * Executes an authorized tool proposal idempotently.
 */
export function executeAuthorizedAgentTool(
  ctx: AgentContextSnapshot,
  proposal: AgentProposal
): ToolExecutionResult {
  const { toolName, toolArgs, idempotencyKey } = proposal;

  let result: ToolExecutionResult;

  switch (toolName) {
    case 'requestMissingOrderRequirements':
    case 'validateOrderRequirementsComplete':
      result = executeOrderTool(ctx, toolName, toolArgs);
      break;

    case 'createFirstDeliveryAssignment':
    case 'createSecondDeliveryAssignment':
      result = executeDispatchTool(ctx, toolName, toolArgs);
      break;

    case 'confirmTailorWorkbenchReadiness':
    case 'authorizeTailorStartWork':
    case 'monitorTailorProgressEvidence':
    case 'verifyTailorCompletionEvidence':
      result = executeTailorTool(ctx, toolName, toolArgs);
      break;

    case 'verifyFirstLegDelivery':
    case 'verifyFinalCustomerDelivery':
      result = executeDeliveryTool(ctx, toolName, toolArgs);
      break;

    case 'sendVerifiedPortalNotification':
    case 'closeOrderLifecycle':
      result = executeNotificationTool(ctx, toolName, toolArgs);
      break;

    default:
      result = {
        executed: false,
        summary: `Unknown tool "${toolName}" rejected by Action Executor.`,
        canAdvanceStage: false,
      };
  }

  if (result.executed && idempotencyKey) {
    executedIdempotencyKeys.add(idempotencyKey);
  }

  return result;
}
