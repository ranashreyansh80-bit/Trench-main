import {
  AgentContextSnapshot,
  AgentProposal,
  PolicyValidationResult,
  WorkflowStageNumber,
} from './types.ts';
import { inspectOrderRequirementCompleteness } from './workflow-engine.ts';

/**
 * Deterministic Backend Policy Engine.
 *
 * Architectural Rule:
 * "The AI model chooses an appropriate action, while deterministic backend rules
 * enforce whether that action is allowed. The AI must never be the authority that
 * changes an order's status without validation."
 */
export function validateAgentProposalAgainstPolicy(
  ctx: AgentContextSnapshot,
  stageNumber: WorkflowStageNumber,
  proposal: AgentProposal,
  executedIdempotencyKeys: Set<string>
): PolicyValidationResult {
  const { order, firstDeliveryTask, secondDeliveryTask } = ctx;

  // 1. Idempotency Guard: Prevent duplicate dispatches or repeated mutations
  if (
    proposal.idempotencyKey &&
    executedIdempotencyKeys.has(proposal.idempotencyKey) &&
    (proposal.toolName === 'createFirstDeliveryAssignment' ||
      proposal.toolName === 'createSecondDeliveryAssignment')
  ) {
    return {
      authorized: false,
      reason: `Idempotency policy blocked duplicate execution for key "${proposal.idempotencyKey}".`,
      verificationStatus: 'verified',
    };
  }

  // 2. Stage 02 Policy: Cannot assign first delivery if required measurements or pickup address are missing
  if (proposal.toolName === 'createFirstDeliveryAssignment') {
    const reqCheck = inspectOrderRequirementCompleteness(order, firstDeliveryTask);
    if (!reqCheck.isComplete) {
      return {
        authorized: false,
        reason: `Policy Engine blocked first delivery assignment: missing ${reqCheck.missingFields.join(
          ', '
        )}.`,
        verificationStatus: 'blocked_safety',
        escalateToHuman: {
          role: 'customer',
          issueType: 'missing_measurements',
          severity: 'warning',
          message: `Order #${order.orderNumber} is missing required ${reqCheck.missingFields.join(
            ' & '
          )}.`,
          resolutionHint:
            'Customer must provide missing measurements or switch service to Doorstep Measurement + Cloth Pickup.',
        },
        pendingApproval: {
          title: `Provide Missing Measurements for #${order.orderNumber}`,
          reason: `Order Agent paused dispatch until ${reqCheck.missingFields.join(
            ', '
          )} are verified.`,
          proposedActionType: 'resolve_missing_measurements',
          requiredRole: 'customer',
        },
      };
    }
  }

  // 3. Stage 04 Policy: Never assume cloth was picked up or delivered to tailor without backend task status
  if (proposal.toolName === 'verifyFirstLegDelivery') {
    const delivered =
      order.firstDeliveryStatus === 'delivered_to_tailor' ||
      firstDeliveryTask?.status === 'delivered_to_tailor' ||
      firstDeliveryTask?.status === 'cloth_delivered' ||
      order.stage === 'accepted' ||
      order.stage === 'working' ||
      order.stage === 'completed';

    if (!delivered) {
      return {
        authorized: true,
        reason:
          'Delivery Monitoring Agent observed first-leg status. Waiting for real backend pickup/drop-off event from Delivery Partner before advancing to Stage 05.',
        verificationStatus: 'verified',
      };
    }
  }

  // 4. Stage 05 Policy: Tailor readiness requires actual tailor acceptance & workbench readyToBegin
  if (proposal.toolName === 'confirmTailorWorkbenchReadiness') {
    const workbenchReady = Boolean(order.workbench?.readyToBegin);
    if (!workbenchReady && order.stage !== 'working' && order.stage !== 'completed') {
      return {
        authorized: true,
        reason:
          'Tailor Workflow Agent requested workbench readiness confirmation. Workflow paused at Stage 05 until Tailor confirms workbench is ready.',
        verificationStatus: 'requires_human_approval',
        escalateToHuman: {
          role: 'tailor',
          issueType: 'workbench_not_ready',
          severity: 'warning',
          message: `Order #${order.orderNumber}: Tailor workbench readiness is not yet confirmed.`,
          resolutionHint:
            'Mark Workbench as Ready in Tailor Portal to unlock customer contact and stitching.',
        },
        pendingApproval: {
          title: `Confirm Workbench Ready (#${order.orderNumber})`,
          reason:
            'Tailor Workflow Agent requires workbench calibration/readiness confirmation before work can start.',
          proposedActionType: 'confirm_workbench_ready',
          requiredRole: 'tailor',
        },
      };
    }
  }

  // 5. Stage 06 Policy: Cannot start work without both workbench readiness AND customer contact confirmation
  if (proposal.toolName === 'authorizeTailorStartWork') {
    if (!order.workbench?.readyToBegin && order.stage !== 'working' && order.stage !== 'completed') {
      return {
        authorized: false,
        reason:
          'Policy Engine rejected Start Work: Tailor workbench is not marked ready.',
        verificationStatus: 'blocked_safety',
      };
    }
    if (!order.customerContacted && order.stage !== 'working' && order.stage !== 'completed') {
      return {
        authorized: true,
        reason:
          'Communication Agent reminded tailor to contact customer. Policy Engine holds Stage 06 transition until Tailor logs customer call/contact confirmation.',
        verificationStatus: 'requires_human_approval',
        escalateToHuman: {
          role: 'tailor',
          issueType: 'unconfirmed_customer_contact',
          severity: 'warning',
          message: `Order #${order.orderNumber}: Tailor has not yet confirmed customer consultation call.`,
          resolutionHint:
            'Click "Call / Confirm Customer Contact" in Tailor Portal before starting alteration work.',
        },
        pendingApproval: {
          title: `Confirm Customer Contact & Start Work (#${order.orderNumber})`,
          reason:
            'Tailor Workflow Agent + Communication Agent require customer contact confirmation before stitching begins.',
          proposedActionType: 'approve_start_work',
          requiredRole: 'tailor',
        },
      };
    }
  }

  // 6. Stage 08 & 09 Policy: Cannot authorize completion or second delivery without uploaded progress/completion evidence
  if (
    proposal.toolName === 'verifyTailorCompletionEvidence' ||
    proposal.toolName === 'createSecondDeliveryAssignment'
  ) {
    const hasEvidence = Boolean(
      order.progressUpdates && order.progressUpdates.length > 0
    );
    if (!hasEvidence) {
      return {
        authorized: false,
        reason:
          'Policy Engine + Exception Agent blocked completion authorization: no tailoring progress/completion photo evidence uploaded.',
        verificationStatus: 'blocked_safety',
        escalateToHuman: {
          role: 'tailor',
          issueType: 'missing_completion_evidence',
          severity: 'critical',
          message: `Order #${order.orderNumber}: Missing tailoring progress/completion evidence before second delivery dispatch.`,
          resolutionHint:
            'Upload at least one work progress photo & status update in Tailor Portal.',
        },
      };
    }
  }

  // 7. Stage 10 & 11 Policy: Cannot close order lifecycle unless backend confirms final delivery to customer
  if (proposal.toolName === 'closeOrderLifecycle') {
    const finalDelivered =
      order.secondDeliveryStatus === 'delivered_to_customer' ||
      secondDeliveryTask?.status === 'delivered_to_customer' ||
      order.orderStatus === 'Delivered to Customer' ||
      order.orderStatus === 'Order Completed';

    if (!finalDelivered) {
      return {
        authorized: false,
        reason:
          'Policy Engine rejected Close Order Lifecycle: backend has not confirmed final drop-off to customer.',
        verificationStatus: 'blocked_safety',
      };
    }
  }

  return {
    authorized: true,
    reason: 'Policy Engine verified all stage prerequisites and authorized the tool action.',
    verificationStatus: 'verified',
  };
}
