import {
  AgentAuditLogEntry,
  AgentExceptionAlert,
  AgentOrchestratorState,
  AgentPendingApproval,
  AgentVerificationStatus,
  DeliveryTask,
  InternalAgentRole,
  LedgerTransaction,
  OrderAgentSummary,
  PartnerLiveLocation,
  PartnerNotification,
  TailorOrder,
} from '../types/appTypes.ts';

export type WorkflowStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type WorkflowStageCode =
  | '01_CUSTOMER_PLACES_ORDER'
  | '02_VALIDATE_ORDER_REQUIREMENTS'
  | '03_ASSIGN_FIRST_DELIVERY'
  | '04_COLLECT_CLOTH_FROM_CUSTOMER'
  | '05_CONFIRM_TAILOR_READINESS'
  | '06_CONTACT_CUSTOMER_AND_START_WORK'
  | '07_TRACK_TAILORING_PROGRESS'
  | '08_VERIFY_COMPLETION'
  | '09_ASSIGN_SECOND_DELIVERY'
  | '10_VERIFY_FINAL_DELIVERY'
  | '11_CLOSE_ORDER_LIFECYCLE';

export interface WorkflowStageDefinition {
  stageNumber: WorkflowStageNumber;
  code: WorkflowStageCode;
  title: string;
  responsibleAgent: InternalAgentRole;
  cooperatingAgent?: InternalAgentRole | 'Orchestrator';
  description: string;
  portalTarget: 'customer' | 'tailor' | 'delivery' | 'all';
}

export interface AgentProposal {
  selectedAgent: InternalAgentRole;
  toolName: string;
  toolArgs: Record<string, any>;
  reasoning: string;
  idempotencyKey: string;
  requiresBackendEventToAdvance: boolean;
}

export interface PolicyValidationResult {
  authorized: boolean;
  reason: string;
  verificationStatus: AgentVerificationStatus;
  escalateToHuman?: {
    role: 'customer' | 'tailor' | 'delivery';
    issueType: AgentExceptionAlert['issueType'];
    severity: 'warning' | 'critical';
    message: string;
    resolutionHint: string;
  };
  pendingApproval?: {
    title: string;
    reason: string;
    proposedActionType: AgentPendingApproval['proposedActionType'];
    requiredRole: 'tailor' | 'delivery' | 'customer';
  };
}

export interface ToolExecutionResult {
  executed: boolean;
  idempotentSkip?: boolean;
  summary: string;
  updatedOrder?: TailorOrder;
  createdOrUpdatedTask?: DeliveryTask;
  createdNotification?: PartnerNotification;
  createdLedgerTx?: LedgerTransaction;
  canAdvanceStage: boolean;
}

export interface WorkflowRunRecord {
  runId: string;
  orderId: string;
  orderNumber: string;
  currentStageNumber: WorkflowStageNumber;
  currentStageCode: WorkflowStageCode;
  currentStageLabel: string;
  activeAgent: InternalAgentRole;
  workflowStatus: 'active' | 'paused_for_input' | 'paused_exception' | 'completed';
  version: number;
  blockingReason?: string | null;
  nextRecommendedAction: string;
  updatedAt: string;
}

export interface AgentContextSnapshot {
  order: TailorOrder;
  tasksForOrder: DeliveryTask[];
  firstDeliveryTask?: DeliveryTask;
  secondDeliveryTask?: DeliveryTask;
  onlinePartners: PartnerLiveLocation[];
  triggerEvent: string;
  sourcePortal: 'customer' | 'tailor' | 'delivery' | 'system';
  nowIso: string;
  nowLabel: string;
}

export interface DeliveryPartnerCopilotAdvice {
  partnerStatusSummary: string;
  activeStageTitle: string;
  activeAgent: InternalAgentRole;
  routeOptimizationTip: string;
  verificationChecklist: string[];
  nextRequiredEvent: string;
  delayRiskLevel: 'low' | 'moderate' | 'high';
  exceptionCount: number;
}

export type {
  AgentAuditLogEntry,
  AgentExceptionAlert,
  AgentOrchestratorState,
  AgentPendingApproval,
  AgentVerificationStatus,
  InternalAgentRole,
  OrderAgentSummary,
};
