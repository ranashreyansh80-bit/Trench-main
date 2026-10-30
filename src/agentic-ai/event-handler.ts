import {
  AgentContextSnapshot,
  AgentProposal,
  WorkflowStageNumber,
} from './types.ts';
import { runOrderAgent } from './agents/order.agent.ts';
import { runDispatchAgent } from './agents/dispatch.agent.ts';
import { runTailorWorkflowAgent } from './agents/tailor-workflow.agent.ts';
import { runDeliveryMonitoringAgent } from './agents/delivery-monitoring.agent.ts';
import { runCommunicationAgent } from './agents/communication.agent.ts';
import { runExceptionAgent } from './agents/exception.agent.ts';

/**
 * Selects the appropriate specialized internal agent for the verified workflow stage (01..11)
 * and returns its proposed tool action.
 */
export function selectAgentAndProposeAction(
  ctx: AgentContextSnapshot,
  stageNumber: WorkflowStageNumber
): AgentProposal {
  switch (stageNumber) {
    case 1:
    case 2:
      return runOrderAgent(ctx);

    case 3:
      return runDispatchAgent(ctx, 'first_delivery');

    case 4:
      return runDeliveryMonitoringAgent(ctx, 'first_leg');

    case 5:
      return runTailorWorkflowAgent(ctx, 5);

    case 6:
      // Stage 06: Tailor Workflow Agent + Communication Agent
      if (!ctx.order.customerContacted) {
        return runTailorWorkflowAgent(ctx, 6);
      }
      return runTailorWorkflowAgent(ctx, 6);

    case 7:
      return runTailorWorkflowAgent(ctx, 7);

    case 8:
      return runExceptionAgent(ctx);

    case 9:
      return runDispatchAgent(ctx, 'second_delivery');

    case 10:
      return runDeliveryMonitoringAgent(ctx, 'second_leg');

    case 11:
    default:
      return runCommunicationAgent(ctx, 'close_order_lifecycle');
  }
}
