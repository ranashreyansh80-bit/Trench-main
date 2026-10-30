import {
  AgentAuditLogEntry,
  AgentExceptionAlert,
  AgentPendingApproval,
  AgentProposal,
  PolicyValidationResult,
  ToolExecutionResult,
  WorkflowStageDefinition,
} from '../types.ts';

export function buildAuditLogEntry(params: {
  orderId: string;
  orderNumber: string;
  stageDef: WorkflowStageDefinition;
  proposal: AgentProposal;
  policyResult: PolicyValidationResult;
  toolResult?: ToolExecutionResult;
  eventTrigger: string;
  timestampLabel: string;
}): AgentAuditLogEntry {
  const {
    orderId,
    orderNumber,
    stageDef,
    proposal,
    policyResult,
    toolResult,
    eventTrigger,
    timestampLabel,
  } = params;

  return {
    id: `audit-${orderId}-${stageDef.stageNumber}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    timestamp: timestampLabel,
    orderId,
    orderNumber,
    agent: proposal.selectedAgent,
    eventTrigger: `[Stage ${String(stageDef.stageNumber).padStart(2, '0')}: ${
      stageDef.title
    }] ${eventTrigger}`,
    reasoning: proposal.reasoning,
    toolCalled: proposal.toolName,
    toolArgs: proposal.toolArgs,
    verificationStatus: policyResult.verificationStatus,
    outcomeSummary: toolResult ? toolResult.summary : policyResult.reason,
    statusBefore: `Stage ${String(stageDef.stageNumber).padStart(2, '0')}`,
    statusAfter:
      toolResult?.canAdvanceStage && stageDef.stageNumber < 11
        ? `Stage ${String(stageDef.stageNumber + 1).padStart(2, '0')}`
        : `Stage ${String(stageDef.stageNumber).padStart(2, '0')} (Waiting for Backend Event)`,
  };
}

export function buildExceptionAlertIfNeeded(params: {
  orderId: string;
  orderNumber: string;
  proposal: AgentProposal;
  policyResult: PolicyValidationResult;
  timestampLabel: string;
}): AgentExceptionAlert | null {
  const { orderId, orderNumber, proposal, policyResult, timestampLabel } = params;
  if (!policyResult.escalateToHuman) return null;

  return {
    id: `exc-${orderId}-${policyResult.escalateToHuman.issueType}`,
    orderId,
    orderNumber,
    agent:
      policyResult.escalateToHuman.issueType === 'missing_completion_evidence'
        ? 'Exception Agent'
        : proposal.selectedAgent,
    severity: policyResult.escalateToHuman.severity,
    issueType: policyResult.escalateToHuman.issueType,
    message: policyResult.escalateToHuman.message,
    resolutionHint: policyResult.escalateToHuman.resolutionHint,
    resolved: false,
    createdAt: timestampLabel,
  };
}

export function buildPendingApprovalIfNeeded(params: {
  orderId: string;
  orderNumber: string;
  proposal: AgentProposal;
  policyResult: PolicyValidationResult;
  timestampLabel: string;
}): AgentPendingApproval | null {
  const { orderId, orderNumber, proposal, policyResult, timestampLabel } = params;
  if (!policyResult.pendingApproval) return null;

  return {
    id: `appr-${orderId}-${policyResult.pendingApproval.proposedActionType}`,
    orderId,
    orderNumber,
    agent: proposal.selectedAgent,
    title: policyResult.pendingApproval.title,
    reason: policyResult.pendingApproval.reason,
    proposedActionType: policyResult.pendingApproval.proposedActionType,
    proposedPayload: proposal.toolArgs,
    requiredRole: policyResult.pendingApproval.requiredRole,
    createdAt: timestampLabel,
    status: 'pending',
  };
}
