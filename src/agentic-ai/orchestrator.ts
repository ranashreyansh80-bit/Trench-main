import { GoogleGenAI, Type } from '@google/genai';
import {
  AgentAuditLogEntry,
  AgentContextSnapshot,
  AgentExceptionAlert,
  AgentOrchestratorState,
  AgentPendingApproval,
  DeliveryPartnerCopilotAdvice,
  InternalAgentRole,
  OrderAgentSummary,
  WorkflowRunRecord,
} from './types.ts';
import {
  DeliveryTask,
  LedgerTransaction,
  PartnerLiveLocation,
  PartnerNotification,
  TailorOrder,
} from '../types/appTypes.ts';
import {
  COMPLETE_11_STAGE_WORKFLOW,
  getStageDefinition,
  resolveVerifiedWorkflowStage,
} from './workflow-engine.ts';
import { selectAgentAndProposeAction } from './event-handler.ts';
import { validateAgentProposalAgainstPolicy } from './policy-engine.ts';
import {
  executeAuthorizedAgentTool,
  getExecutedIdempotencyKeys,
} from './services/action-executor.ts';
import {
  buildAuditLogEntry,
  buildExceptionAlertIfNeeded,
  buildPendingApprovalIfNeeded,
} from './services/audit.service.ts';
import {
  recordOrderEvent,
  saveWorkflowRunRecord,
} from './services/event-publisher.ts';

let sharedAiClient: GoogleGenAI | null = null;

function getServerGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    return null;
  }
  if (!sharedAiClient) {
    sharedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return sharedAiClient;
}

export interface OrchestratorCycleInput {
  orders: TailorOrder[];
  tasks: DeliveryTask[];
  notifications: PartnerNotification[];
  ledger: LedgerTransaction[];
  onlinePartners?: PartnerLiveLocation[];
  triggerEvent: string;
  sourcePortal?: 'customer' | 'tailor' | 'delivery' | 'system';
  targetOrderId?: string;
  existingAuditLog?: AgentAuditLogEntry[];
  existingApprovals?: AgentPendingApproval[];
  useGeminiEnrichment?: boolean;
}

export interface OrchestratorCycleOutput {
  orders: TailorOrder[];
  tasks: DeliveryTask[];
  notifications: PartnerNotification[];
  ledger: LedgerTransaction[];
  agentState: AgentOrchestratorState;
  workflowRuns: WorkflowRunRecord[];
  partnerCopilot: DeliveryPartnerCopilotAdvice;
}

/**
 * Runs the Central AI Orchestrator Controlled Decision Cycle:
 * 1. Order event received
 * 2. Load verified order state
 * 3. Check permissions and prerequisites
 * 4. Select appropriate internal agent (Order, Dispatch, Tailor Workflow, Delivery Monitoring, Communication, Exception)
 * 5. Agent proposes a tool action
 * 6. Backend validation via deterministic Policy Engine
 * 7. Execute idempotent tool OR Handle failure / escalate to human
 * 8. Verify persisted result & check if workflow can continue
 * 9. Record decision and next state
 */
export async function runCentralOrchestratorCycle(
  input: OrchestratorCycleInput
): Promise<OrchestratorCycleOutput> {
  const nowIso = new Date().toISOString();
  const nowLabel = `Today · ${new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const workingOrders = [...(input.orders || [])];
  const workingTasks = [...(input.tasks || [])];
  const workingNotifications = [...(input.notifications || [])];
  const workingLedger = [...(input.ledger || [])];
  const onlinePartners = input.onlinePartners || [];

  const auditLog: AgentAuditLogEntry[] = [...(input.existingAuditLog || [])].slice(0, 45);
  const pendingApprovals: AgentPendingApproval[] = [];
  const exceptions: AgentExceptionAlert[] = [];
  const orderSummaries: Record<string, OrderAgentSummary> = {};
  const workflowRuns: WorkflowRunRecord[] = [];

  let primaryActiveAgent: InternalAgentRole = 'Order Agent';
  const aiClient = input.useGeminiEnrichment !== false ? getServerGeminiClient() : null;
  let usedGemini = false;

  for (let i = 0; i < workingOrders.length; i++) {
    let order = workingOrders[i];
    const tasksForOrder = workingTasks.filter(
      (t) => t.linkedTailorOrderId === order.id || t.orderNumber === order.orderNumber
    );
    const firstDeliveryTask = tasksForOrder.find(
      (t) => t.deliveryStage !== 'second_delivery'
    );
    const secondDeliveryTask = tasksForOrder.find(
      (t) => t.deliveryStage === 'second_delivery'
    );

    // Record incoming order event
    recordOrderEvent({
      eventId: `evt-${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      eventType: input.triggerEvent,
      sourcePortal: input.sourcePortal || 'system',
      timestamp: nowIso,
    });

    const ctx: AgentContextSnapshot = {
      order,
      tasksForOrder,
      firstDeliveryTask,
      secondDeliveryTask,
      onlinePartners,
      triggerEvent: input.triggerEvent,
      sourcePortal: input.sourcePortal || 'system',
      nowIso,
      nowLabel,
    };

    // Step 1-3: Resolve verified stage from real backend state
    const resolved = resolveVerifiedWorkflowStage(ctx);
    const stageDef = resolved.definition;

    // Step 4-5: Select appropriate internal agent & propose tool action
    const proposal = selectAgentAndProposeAction(ctx, resolved.stageNumber);
    primaryActiveAgent = proposal.selectedAgent;

    // Optional server-side Gemini 3.8 Flash reasoning enhancement (AI proposes/explains; Policy Engine enforces)
    if (
      aiClient &&
      (!input.targetOrderId || input.targetOrderId === order.id || i === 0)
    ) {
      try {
        const aiRes = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are the ${proposal.selectedAgent} inside the Trench Central AI Orchestrator.
Order #${order.orderNumber} (${order.clothToBeAltered}) is at Stage ${String(
            stageDef.stageNumber
          ).padStart(2, '0')}: "${stageDef.title}".
Trigger Event: "${input.triggerEvent}".
Proposed Tool: "${proposal.toolName}".
Waiting Condition: "${resolved.waitingForBackendEvent}".
Write a single concise sentence (max 24 words) explaining your verified decision and what must happen next.`,
        });
        if (aiRes.text && aiRes.text.trim().length > 8) {
          proposal.reasoning = aiRes.text.trim();
          usedGemini = true;
        }
      } catch {
        // Fallback to deterministic agent reasoning
      }
    }

    // Step 6: Deterministic Backend Policy Validation
    const policyResult = validateAgentProposalAgainstPolicy(
      ctx,
      resolved.stageNumber,
      proposal,
      getExecutedIdempotencyKeys()
    );

    let toolResult = undefined;
    if (policyResult.authorized) {
      // Step 7a: Execute idempotent tool
      toolResult = executeAuthorizedAgentTool(ctx, proposal);

      if (toolResult.updatedOrder) {
        order = toolResult.updatedOrder;
        workingOrders[i] = order;
      }
      if (toolResult.createdOrUpdatedTask) {
        const taskIdx = workingTasks.findIndex(
          (t) => t.id === toolResult!.createdOrUpdatedTask!.id
        );
        if (taskIdx >= 0) {
          workingTasks[taskIdx] = toolResult.createdOrUpdatedTask;
        } else {
          workingTasks.unshift(toolResult.createdOrUpdatedTask);
        }
      }
      if (toolResult.createdNotification) {
        const exists = workingNotifications.some(
          (n) => n.id === toolResult!.createdNotification!.id
        );
        if (!exists) {
          workingNotifications.unshift(toolResult.createdNotification);
        }
      }
    }

    // Step 7b: Handle failure or escalate to human if needed
    const exceptionAlert = buildExceptionAlertIfNeeded({
      orderId: order.id,
      orderNumber: order.orderNumber,
      proposal,
      policyResult,
      timestampLabel: nowLabel,
    });
    if (exceptionAlert) {
      exceptions.push(exceptionAlert);
    }

    const pendingApproval = buildPendingApprovalIfNeeded({
      orderId: order.id,
      orderNumber: order.orderNumber,
      proposal,
      policyResult,
      timestampLabel: nowLabel,
    });
    if (pendingApproval) {
      pendingApprovals.push(pendingApproval);
    }

    // Step 8-9: Re-evaluate verified stage after tool execution & record audit entry
    const postCtx: AgentContextSnapshot = {
      ...ctx,
      order,
      tasksForOrder: workingTasks.filter(
        (t) => t.linkedTailorOrderId === order.id || t.orderNumber === order.orderNumber
      ),
      firstDeliveryTask: workingTasks.find(
        (t) =>
          (t.linkedTailorOrderId === order.id || t.orderNumber === order.orderNumber) &&
          t.deliveryStage !== 'second_delivery'
      ),
      secondDeliveryTask: workingTasks.find(
        (t) =>
          (t.linkedTailorOrderId === order.id || t.orderNumber === order.orderNumber) &&
          t.deliveryStage === 'second_delivery'
      ),
    };
    const nextResolved = resolveVerifiedWorkflowStage(postCtx);
    const nextStageDef = getStageDefinition(nextResolved.stageNumber);

    const auditEntry = buildAuditLogEntry({
      orderId: order.id,
      orderNumber: order.orderNumber,
      stageDef,
      proposal,
      policyResult,
      toolResult,
      eventTrigger: input.triggerEvent,
      timestampLabel: nowLabel,
    });

    // Avoid duplicating identical consecutive audit entries for the same order & tool
    const isDuplicateTopEntry =
      auditLog.length > 0 &&
      auditLog[0].orderId === auditEntry.orderId &&
      auditLog[0].toolCalled === auditEntry.toolCalled &&
      auditLog[0].statusAfter === auditEntry.statusAfter;

    if (!isDuplicateTopEntry) {
      auditLog.unshift(auditEntry);
    }

    let safetyGateStatus: OrderAgentSummary['safetyGateStatus'] = 'clear';
    if (nextResolved.stageNumber === 2) {
      safetyGateStatus = 'awaiting_measurements';
    } else if (nextResolved.stageNumber === 5 || nextResolved.stageNumber === 6) {
      safetyGateStatus = 'awaiting_tailor_confirmation';
    } else if (nextResolved.stageNumber === 7 || nextResolved.stageNumber === 8) {
      safetyGateStatus = 'awaiting_completion_evidence';
    }

    orderSummaries[order.id] = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      activeAgent: nextStageDef.responsibleAgent,
      workflowStepIndex: nextResolved.stageNumber,
      workflowStepLabel: `${String(nextResolved.stageNumber).padStart(2, '0')} · ${
        nextStageDef.title
      }`,
      currentStepAnalysis: proposal.reasoning,
      nextRecommendedAction: nextResolved.waitingForBackendEvent,
      safetyGateStatus,
      lastUpdated: nowLabel,
    };

    const runRecord: WorkflowRunRecord = {
      runId: `run-${order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStageNumber: nextResolved.stageNumber,
      currentStageCode: nextStageDef.code,
      currentStageLabel: nextStageDef.title,
      activeAgent: nextStageDef.responsibleAgent,
      workflowStatus:
        nextResolved.stageNumber === 11
          ? 'completed'
          : exceptionAlert
          ? 'paused_exception'
          : pendingApproval
          ? 'paused_for_input'
          : 'active',
      version: (order.timeline?.length || 1) + 1,
      blockingReason: exceptionAlert?.message || null,
      nextRecommendedAction: nextResolved.waitingForBackendEvent,
      updatedAt: nowIso,
    };
    saveWorkflowRunRecord(runRecord);
    workflowRuns.push(runRecord);
  }

  const partnerCopilot = buildDeliveryPartnerCopilotAdvice({
    orders: workingOrders,
    tasks: workingTasks,
    exceptions,
    orderSummaries,
  });

  const agentState: AgentOrchestratorState = {
    isRunning: false,
    engineStatus: usedGemini ? 'gemini_active' : 'deterministic_fallback',
    lastRunAt: nowLabel,
    lastTriggerEvent: input.triggerEvent,
    activeAgent: primaryActiveAgent,
    auditLog: auditLog.slice(0, 40),
    pendingApprovals,
    exceptions,
    orderSummaries,
  };

  return {
    orders: workingOrders,
    tasks: workingTasks,
    notifications: workingNotifications,
    ledger: workingLedger,
    agentState,
    workflowRuns,
    partnerCopilot,
  };
}

/**
 * Generates Delivery & Partner AI Copilot insights for the Delivery Partner Portal
 * and Tailor Partner Portal.
 */
export function buildDeliveryPartnerCopilotAdvice(params: {
  orders: TailorOrder[];
  tasks: DeliveryTask[];
  exceptions: AgentExceptionAlert[];
  orderSummaries: Record<string, OrderAgentSummary>;
}): DeliveryPartnerCopilotAdvice {
  const { orders, tasks, exceptions, orderSummaries } = params;

  const activeTasks = tasks.filter(
    (t) =>
      t.status !== 'delivered_to_tailor' &&
      t.status !== 'cloth_delivered' &&
      t.status !== 'delivered_to_customer'
  );
  const firstLegTasks = activeTasks.filter((t) => t.deliveryStage !== 'second_delivery');
  const secondLegTasks = activeTasks.filter((t) => t.deliveryStage === 'second_delivery');

  const topOrder = orders[0];
  const topSummary = topOrder ? orderSummaries[topOrder.id] : undefined;

  if (activeTasks.length === 0 && orders.length === 0) {
    return {
      partnerStatusSummary:
        'Delivery & Partner AI Ready — Standing by for new customer orders or tailor return dispatches.',
      activeStageTitle: '01 · Waiting for Order Placement',
      activeAgent: 'Dispatch Agent',
      routeOptimizationTip:
        'Keep Online status active and Live GPS enabled to receive priority Zomato-style instant order offers within 15 km.',
      verificationChecklist: [
        'Online toggle enabled with fresh GPS coordinates',
        'Measurement kit & garment seal bags ready',
        'Instant offer ringtone & notification permissions active',
      ],
      nextRequiredEvent: 'Customer places an order or Tailor dispatches completed garment.',
      delayRiskLevel: 'low',
      exceptionCount: exceptions.length,
    };
  }

  if (secondLegTasks.length > 0) {
    const t = secondLegTasks[0];
    return {
      partnerStatusSummary: `Partner AI tracking Stage 09/10 Return Delivery (#${t.orderNumber}): ${t.tailorShopName || 'Tailor Atelier'} → ${t.customerName}.`,
      activeStageTitle: topSummary?.workflowStepLabel || '10 · Verify final delivery',
      activeAgent: 'Delivery Monitoring Agent',
      routeOptimizationTip: `Priority Return Leg (${t.distanceKm} km · ~${t.etaMinutes} min): Collect steamed garment from ${t.pickupAddress} and verify customer drop-off at ${t.dropAddress}.`,
      verificationChecklist: [
        `Inspect completed garment quality seal at ${t.tailorShopName || 'Tailor Atelier'}`,
        'Confirm "Picked Up from Tailor" in Delivery Portal',
        `Verify final doorstep drop-off to ${t.customerName} to close Stage 11 lifecycle`,
      ],
      nextRequiredEvent:
        t.status === 'picked_up_from_tailor'
          ? `Confirm final delivery to ${t.customerName} (Stage 10 -> 11)`
          : `Confirm pickup from ${t.tailorShopName || 'Tailor Atelier'} (Stage 09 -> 10)`,
      delayRiskLevel: t.etaMinutes > 25 ? 'moderate' : 'low',
      exceptionCount: exceptions.length,
    };
  }

  if (firstLegTasks.length > 0) {
    const t = firstLegTasks[0];
    const needsMeasurements =
      t.category === 'measurement_only' ||
      t.selectedService === 'measurement_plus_cloth_pickup';
    return {
      partnerStatusSummary: `Partner AI tracking Stage 03/04 Cloth Collection (#${t.orderNumber}): ${t.customerName} → ${t.tailorShopName || 'Tailor Atelier'}.`,
      activeStageTitle: topSummary?.workflowStepLabel || '04 · Collect cloth from customer',
      activeAgent: 'Delivery Monitoring Agent',
      routeOptimizationTip: `Leg 1 Route (${t.distanceKm} km · ~${t.etaMinutes} min): Pickup at ${t.pickupAddress} → Drop at ${t.dropAddress}.`,
      verificationChecklist: [
        needsMeasurements && !t.recordedMeasurements
          ? 'Record 6-point body measurements & posture check at customer doorstep'
          : 'Measurements verified in Order Agent record',
        'Collect cloth parcel and mark "Picked Up from Customer"',
        `Deliver cloth to ${t.tailorShopName || 'Tailor Atelier'} to unlock Stage 05 Tailor Readiness`,
      ],
      nextRequiredEvent:
        t.status === 'picked_up_from_customer' || t.status === 'cloth_picked_up'
          ? `Confirm drop-off at ${t.tailorShopName || 'Tailor Atelier'} (Stage 04 -> 05)`
          : `Collect cloth from ${t.customerName} (Stage 04)`,
      delayRiskLevel: exceptions.length > 0 ? 'moderate' : 'low',
      exceptionCount: exceptions.length,
    };
  }

  return {
    partnerStatusSummary: topSummary
      ? `Central Orchestrator tracking Order #${topOrder.orderNumber} at ${topSummary.workflowStepLabel}.`
      : 'Central Orchestrator monitoring active tailor & delivery workflows.',
    activeStageTitle: topSummary?.workflowStepLabel || '05 · Confirm tailor readiness',
    activeAgent: topSummary?.activeAgent || 'Tailor Workflow Agent',
    routeOptimizationTip:
      'Tailor is processing active garment(s). Partner AI will automatically alert you when Stage 08 completion is verified for Stage 09 Second Delivery.',
    verificationChecklist: [
      'Stage 04 cloth delivery to Tailor verified',
      'Tailor Workflow Agent monitoring workbench, customer call & stitch progress',
      'Dispatch Agent standing by for Stage 09 return leg assignment',
    ],
    nextRequiredEvent:
      topSummary?.nextRecommendedAction ||
      'Awaiting Tailor completion evidence to trigger Second Delivery.',
    delayRiskLevel: exceptions.some((e) => e.severity === 'critical') ? 'high' : 'low',
    exceptionCount: exceptions.length,
  };
}

export { COMPLETE_11_STAGE_WORKFLOW };
