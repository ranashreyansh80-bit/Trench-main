import {
  WorkflowStageDefinition,
  WorkflowStageNumber,
  AgentContextSnapshot,
} from './types.ts';
import { TailorOrder, DeliveryTask } from '../types/appTypes.ts';

/**
 * Complete 11-Stage Order Workflow — from placement to final delivery.
 * Matches the user's architectural specification verbatim.
 */
export const COMPLETE_11_STAGE_WORKFLOW: WorkflowStageDefinition[] = [
  {
    stageNumber: 1,
    code: '01_CUSTOMER_PLACES_ORDER',
    title: 'Customer places order',
    responsibleAgent: 'Order Agent',
    description:
      'Read the order, service type, measurements, pickup address, and required information.',
    portalTarget: 'customer',
  },
  {
    stageNumber: 2,
    code: '02_VALIDATE_ORDER_REQUIREMENTS',
    title: 'Validate order requirements',
    responsibleAgent: 'Order Agent',
    cooperatingAgent: 'Orchestrator',
    description:
      'Check database records. If required information is missing, pause and ask the customer.',
    portalTarget: 'customer',
  },
  {
    stageNumber: 3,
    code: '03_ASSIGN_FIRST_DELIVERY',
    title: 'Assign first delivery',
    responsibleAgent: 'Dispatch Agent',
    description:
      'Find an eligible delivery partner and create a single valid assignment.',
    portalTarget: 'delivery',
  },
  {
    stageNumber: 4,
    code: '04_COLLECT_CLOTH_FROM_CUSTOMER',
    title: 'Collect cloth from customer',
    responsibleAgent: 'Delivery Monitoring Agent',
    description:
      'Verify partner acceptance, pickup evidence, and delivery to the tailor.',
    portalTarget: 'delivery',
  },
  {
    stageNumber: 5,
    code: '05_CONFIRM_TAILOR_READINESS',
    title: 'Confirm tailor readiness',
    responsibleAgent: 'Tailor Workflow Agent',
    description:
      "Check the tailor's incoming order and workbench readiness. Request confirmation if needed.",
    portalTarget: 'tailor',
  },
  {
    stageNumber: 6,
    code: '06_CONTACT_CUSTOMER_AND_START_WORK',
    title: 'Contact customer and start work',
    responsibleAgent: 'Tailor Workflow Agent',
    cooperatingAgent: 'Communication Agent',
    description:
      'Remind the tailor to contact the customer. Start work only after the required tailor confirmation.',
    portalTarget: 'tailor',
  },
  {
    stageNumber: 7,
    code: '07_TRACK_TAILORING_PROGRESS',
    title: 'Track tailoring progress',
    responsibleAgent: 'Tailor Workflow Agent',
    description:
      'Monitor progress updates and uploaded evidence. Flag missing updates or inconsistencies.',
    portalTarget: 'tailor',
  },
  {
    stageNumber: 8,
    code: '08_VERIFY_COMPLETION',
    title: 'Verify completion',
    responsibleAgent: 'Exception Agent',
    cooperatingAgent: 'Orchestrator',
    description:
      "Check the tailor's completion submission and required evidence before authorizing the next stage.",
    portalTarget: 'tailor',
  },
  {
    stageNumber: 9,
    code: '09_ASSIGN_SECOND_DELIVERY',
    title: 'Assign second delivery',
    responsibleAgent: 'Dispatch Agent',
    description:
      'Create a new assignment for delivery from the tailor to the customer.',
    portalTarget: 'delivery',
  },
  {
    stageNumber: 10,
    code: '10_VERIFY_FINAL_DELIVERY',
    title: 'Verify final delivery',
    responsibleAgent: 'Delivery Monitoring Agent',
    description:
      'Verify the drop-off evidence and update the order only when the backend confirms delivery.',
    portalTarget: 'delivery',
  },
  {
    stageNumber: 11,
    code: '11_CLOSE_ORDER_LIFECYCLE',
    title: 'Close order lifecycle',
    responsibleAgent: 'Communication Agent',
    cooperatingAgent: 'Orchestrator',
    description:
      'Record the final state, notify relevant parties, and preserve the audit history.',
    portalTarget: 'all',
  },
];

export function getStageDefinition(stageNumber: WorkflowStageNumber): WorkflowStageDefinition {
  return (
    COMPLETE_11_STAGE_WORKFLOW.find((s) => s.stageNumber === stageNumber) ||
    COMPLETE_11_STAGE_WORKFLOW[0]
  );
}

/**
 * Checks whether an order has complete required measurements and pickup address.
 * Note: If selectedService === 'measurement_plus_cloth_pickup', the delivery partner
 * records measurements at pickup, unless chest/waist are missing when 'measurement_cloth_pickup_only' is chosen.
 */
export function inspectOrderRequirementCompleteness(
  order: TailorOrder,
  firstDeliveryTask?: DeliveryTask
): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!order.customerAddress || order.customerAddress.trim().length < 4) {
    missingFields.push('pickup_address');
  }
  if (!order.clothToBeAltered || order.clothToBeAltered.trim().length < 2) {
    missingFields.push('garment_type');
  }

  const size = order.sizeChart;
  const hasSavedMeasurements = Boolean(
    size &&
      size.chestInches &&
      size.chestInches !== '0' &&
      size.waistInches &&
      size.waistInches !== '0' &&
      size.shoulderInches &&
      size.shoulderInches !== '0'
  );
  const hasPartnerRecordedMeasurements = Boolean(
    firstDeliveryTask?.recordedMeasurements &&
      firstDeliveryTask.recordedMeasurements.chest &&
      firstDeliveryTask.recordedMeasurements.waist
  );

  // If service requires customer-supplied measurements upfront ('measurement_cloth_pickup_only')
  if (
    order.selectedService === 'measurement_cloth_pickup_only' &&
    !hasSavedMeasurements &&
    !hasPartnerRecordedMeasurements
  ) {
    missingFields.push('customer_measurements');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Deterministic state machine that evaluates verified backend records to determine
 * the exact current stage (01..11) of an order.
 *
 * CRITICAL RULE:
 * The system waits for real backend events at each stage. It never assumes that a
 * pickup, tailor confirmation, or delivery happened simply because an agent requested it.
 */
export function resolveVerifiedWorkflowStage(
  ctx: AgentContextSnapshot
): {
  stageNumber: WorkflowStageNumber;
  definition: WorkflowStageDefinition;
  waitingForBackendEvent: string;
} {
  const { order, firstDeliveryTask, secondDeliveryTask } = ctx;

  // Stage 02: Validate order requirements
  const reqCheck = inspectOrderRequirementCompleteness(order, firstDeliveryTask);
  if (!reqCheck.isComplete) {
    return {
      stageNumber: 2,
      definition: getStageDefinition(2),
      waitingForBackendEvent: `Missing customer requirements: ${reqCheck.missingFields.join(', ')}`,
    };
  }

  // Stage 03: Assign first delivery
  const hasFirstPartnerAssigned = Boolean(
    order.firstDeliveryPartner?.partnerId ||
      firstDeliveryTask?.assignedPartnerId ||
      (firstDeliveryTask && firstDeliveryTask.status !== 'assigned') ||
      order.firstDeliveryStatus === 'assigned' ||
      order.firstDeliveryStatus === 'picked_up_from_customer' ||
      order.firstDeliveryStatus === 'delivered_to_tailor'
  );

  if (!hasFirstPartnerAssigned && order.stage === 'incoming') {
    return {
      stageNumber: 3,
      definition: getStageDefinition(3),
      waitingForBackendEvent: 'Awaiting eligible delivery partner assignment for Leg 1',
    };
  }

  // Stage 04: Collect cloth from customer & deliver to tailor
  const firstLegDeliveredToTailor = Boolean(
    order.firstDeliveryStatus === 'delivered_to_tailor' ||
      firstDeliveryTask?.status === 'delivered_to_tailor' ||
      firstDeliveryTask?.status === 'cloth_delivered' ||
      order.stage === 'accepted' ||
      order.stage === 'working' ||
      order.stage === 'completed'
  );

  if (!firstLegDeliveredToTailor) {
    const pickedUp =
      order.firstDeliveryStatus === 'picked_up_from_customer' ||
      firstDeliveryTask?.status === 'picked_up_from_customer' ||
      firstDeliveryTask?.status === 'cloth_picked_up';
    return {
      stageNumber: 4,
      definition: getStageDefinition(4),
      waitingForBackendEvent: pickedUp
        ? 'Cloth picked up from customer; awaiting backend confirmation of drop-off at Tailor Atelier'
        : 'Awaiting delivery partner cloth pickup from customer doorstep',
    };
  }

  // Stage 05: Confirm tailor readiness (tailor acceptance + workbench readyToBegin)
  const tailorAccepted =
    order.stage === 'accepted' || order.stage === 'working' || order.stage === 'completed';
  const workbenchReady = Boolean(order.workbench?.readyToBegin);

  if (!tailorAccepted || (!workbenchReady && order.stage !== 'working' && order.stage !== 'completed')) {
    return {
      stageNumber: 5,
      definition: getStageDefinition(5),
      waitingForBackendEvent: !tailorAccepted
        ? 'Awaiting Tailor Partner acceptance of incoming order'
        : 'Awaiting Tailor Workbench readiness confirmation',
    };
  }

  // Stage 06: Contact customer and start work
  const customerContacted = Boolean(order.customerContacted);
  const workStarted = order.stage === 'working' || order.stage === 'completed';

  if (!workStarted) {
    return {
      stageNumber: 6,
      definition: getStageDefinition(6),
      waitingForBackendEvent: !customerContacted
        ? 'Tailor must contact customer to confirm fit details before starting work'
        : 'Customer contacted; awaiting Tailor confirmation to transition to Working stage',
    };
  }

  // Stage 07: Track tailoring progress
  const hasProgressEvidence = Boolean(
    order.progressUpdates && order.progressUpdates.length > 0
  );

  if (order.stage === 'working' && !hasProgressEvidence) {
    return {
      stageNumber: 7,
      definition: getStageDefinition(7),
      waitingForBackendEvent:
        'Awaiting Tailor work progress update and photo evidence upload',
    };
  }

  // Stage 08: Verify completion
  if (order.stage === 'working' && hasProgressEvidence) {
    return {
      stageNumber: 8,
      definition: getStageDefinition(8),
      waitingForBackendEvent:
        'Progress evidence verified; awaiting Tailor completion submission',
    };
  }

  // If tailor marked order 'completed', verify that completion evidence exists
  if (order.stage === 'completed' && !hasProgressEvidence && !order.completedAt) {
    return {
      stageNumber: 8,
      definition: getStageDefinition(8),
      waitingForBackendEvent:
        'Tailor completion requires verified progress/completion evidence before second delivery dispatch',
    };
  }

  // Stage 09: Assign second delivery (Tailor -> Customer)
  const hasSecondDeliveryAssigned = Boolean(
    order.secondDeliveryPartner?.partnerId ||
      secondDeliveryTask?.id ||
      order.secondDeliveryStatus === 'assigned' ||
      order.secondDeliveryStatus === 'picked_up_from_tailor' ||
      order.secondDeliveryStatus === 'delivered_to_customer'
  );

  if (!hasSecondDeliveryAssigned) {
    return {
      stageNumber: 9,
      definition: getStageDefinition(9),
      waitingForBackendEvent:
        'Tailor work verified; awaiting Second Delivery Partner assignment (Tailor -> Customer)',
    };
  }

  // Stage 10: Verify final delivery to customer
  const finalDeliveredToCustomer = Boolean(
    order.secondDeliveryStatus === 'delivered_to_customer' ||
      secondDeliveryTask?.status === 'delivered_to_customer' ||
      order.orderStatus === 'Delivered to Customer' ||
      order.orderStatus === 'Order Completed'
  );

  if (!finalDeliveredToCustomer) {
    const pickedFromTailor =
      order.secondDeliveryStatus === 'picked_up_from_tailor' ||
      secondDeliveryTask?.status === 'picked_up_from_tailor';
    return {
      stageNumber: 10,
      definition: getStageDefinition(10),
      waitingForBackendEvent: pickedFromTailor
        ? 'Altered garment in transit from Tailor; awaiting customer drop-off confirmation'
        : 'Second delivery assigned; awaiting garment pickup from Tailor Atelier',
    };
  }

  // Stage 11: Close order lifecycle
  return {
    stageNumber: 11,
    definition: getStageDefinition(11),
    waitingForBackendEvent: 'All delivery and tailoring events verified. Lifecycle closed.',
  };
}

/**
 * Pure deterministic helper that generates Delivery & Partner AI Copilot insights
 * for the Delivery Partner Portal and Tailor Partner Portal.
 */
export function buildDeliveryPartnerCopilotAdvice(params: {
  orders: TailorOrder[];
  tasks: DeliveryTask[];
  exceptions: Array<{ severity: 'warning' | 'critical'; message: string }>;
  orderSummaries: Record<
    string,
    {
      workflowStepLabel: string;
      activeAgent: any;
      nextRecommendedAction: string;
    }
  >;
}) {
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
      activeAgent: 'Dispatch Agent' as const,
      routeOptimizationTip:
        'Keep Online status active and Live GPS enabled to receive priority Zomato-style instant order offers within 15 km.',
      verificationChecklist: [
        'Online toggle enabled with fresh GPS coordinates',
        'Measurement kit & garment seal bags ready',
        'Instant offer ringtone & notification permissions active',
      ],
      nextRequiredEvent: 'Customer places an order or Tailor dispatches completed garment.',
      delayRiskLevel: 'low' as const,
      exceptionCount: exceptions.length,
    };
  }

  if (secondLegTasks.length > 0) {
    const t = secondLegTasks[0];
    return {
      partnerStatusSummary: `Partner AI tracking Stage 09/10 Return Delivery (#${t.orderNumber}): ${t.tailorShopName || 'Tailor Atelier'} → ${t.customerName}.`,
      activeStageTitle: topSummary?.workflowStepLabel || '10 · Verify final delivery',
      activeAgent: 'Delivery Monitoring Agent' as const,
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
      delayRiskLevel: (t.etaMinutes > 25 ? 'moderate' : 'low') as 'low' | 'moderate' | 'high',
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
      activeAgent: 'Delivery Monitoring Agent' as const,
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
      delayRiskLevel: (exceptions.length > 0 ? 'moderate' : 'low') as 'low' | 'moderate' | 'high',
      exceptionCount: exceptions.length,
    };
  }

  return {
    partnerStatusSummary: topSummary
      ? `Central Orchestrator tracking Order #${topOrder.orderNumber} at ${topSummary.workflowStepLabel}.`
      : 'Central Orchestrator monitoring active tailor & delivery workflows.',
    activeStageTitle: topSummary?.workflowStepLabel || '05 · Confirm tailor readiness',
    activeAgent: (topSummary?.activeAgent || 'Tailor Workflow Agent') as any,
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
    delayRiskLevel: (exceptions.some((e) => e.severity === 'critical') ? 'high' : 'low') as
      | 'low'
      | 'moderate'
      | 'high',
    exceptionCount: exceptions.length,
  };
}

