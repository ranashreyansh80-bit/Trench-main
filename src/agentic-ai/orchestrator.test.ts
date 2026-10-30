import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPLETE_11_STAGE_WORKFLOW,
  runCentralOrchestratorCycle,
} from './orchestrator.ts';
import { resetIdempotencyKeysForTesting } from './services/action-executor.ts';
import { TailorOrder, DeliveryTask } from '../types/appTypes.ts';

function buildBaseOrder(overrides: Partial<TailorOrder> = {}): TailorOrder {
  return {
    id: 'ord-test-9001',
    orderNumber: 'TRN-9001',
    customerName: 'Vikramaditya Rao',
    customerPhone: '+91 98450 77889',
    customerAddress: '12th Main Road, Indiranagar, Bengaluru',
    clothToBeAltered: 'Bespoke Italian Wool Blazer',
    clothDescription: 'Sleeve tapering and waist suppression',
    sizeChart: {
      chestInches: '40',
      waistInches: '34',
      shoulderInches: '18.5',
      sleeveLengthInches: '25',
      garmentLengthInches: '30',
      neckCollarInches: '16',
      fitPreference: 'Slim Tailored',
    },
    colorGrade: {
      shadeName: 'Midnight Navy',
      hexCode: '#000080',
      pantoneRef: '19-3832 TCX',
      fabricFinish: 'Super 120s Wool',
    },
    noteToTailor: 'Keep lapel roll natural',
    stage: 'incoming',
    tailorPayoutINR: 450,
    deliveryPayoutINR: 95,
    tailorShopName: 'Savile Row Atelier Bengaluru',
    tailorShopAddress: '80 Feet Road, Koramangala 4th Block, Bengaluru',
    placedAt: 'Today · 10:00 AM',
    selectedService: 'measurement_cloth_pickup_only',
    ...overrides,
  };
}

test('11-stage workflow definition contains all 11 required stages in order', () => {
  assert.equal(COMPLETE_11_STAGE_WORKFLOW.length, 11);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[0].stageNumber, 1);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[0].responsibleAgent, 'Order Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[2].stageNumber, 3);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[2].responsibleAgent, 'Dispatch Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[3].stageNumber, 4);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[3].responsibleAgent, 'Delivery Monitoring Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[4].stageNumber, 5);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[4].responsibleAgent, 'Tailor Workflow Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[7].stageNumber, 8);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[7].responsibleAgent, 'Exception Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[8].stageNumber, 9);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[8].responsibleAgent, 'Dispatch Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[9].stageNumber, 10);
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[9].responsibleAgent, 'Delivery Monitoring Agent');
  assert.equal(COMPLETE_11_STAGE_WORKFLOW[10].stageNumber, 11);
});

test('Stage 02: Order Agent pauses workflow and raises exception when required measurements are missing', async () => {
  resetIdempotencyKeysForTesting();
  const incompleteOrder = buildBaseOrder({
    id: 'ord-missing-meas',
    orderNumber: 'TRN-9002',
    selectedService: 'measurement_cloth_pickup_only',
    sizeChart: {
      chestInches: '',
      waistInches: '',
      shoulderInches: '',
      sleeveLengthInches: '',
      garmentLengthInches: '',
      neckCollarInches: '',
      fitPreference: 'Classic Regular',
    },
  });

  const cycle = await runCentralOrchestratorCycle({
    orders: [incompleteOrder],
    tasks: [],
    notifications: [],
    ledger: [],
    triggerEvent: 'Customer Placed Order',
    useGeminiEnrichment: false,
  });

  const summary = cycle.agentState.orderSummaries['ord-missing-meas'];
  assert.ok(summary);
  assert.equal(summary.workflowStepIndex, 2);
  assert.equal(summary.activeAgent, 'Order Agent');
  assert.equal(summary.safetyGateStatus, 'awaiting_measurements');
});

test('Stage 03 -> Stage 04: Dispatch Agent assigns First Delivery and waits for real backend delivery event', async () => {
  resetIdempotencyKeysForTesting();
  const validOrder = buildBaseOrder({
    id: 'ord-stage3',
    orderNumber: 'TRN-9003',
  });

  const cycle = await runCentralOrchestratorCycle({
    orders: [validOrder],
    tasks: [],
    notifications: [],
    ledger: [],
    triggerEvent: 'Customer Placed Valid Order',
    useGeminiEnrichment: false,
  });

  // Dispatch Agent creates first delivery task and transitions order to Stage 04 waiting for pickup
  assert.equal(cycle.tasks.length, 1);
  assert.equal(cycle.tasks[0].deliveryStage, 'first_delivery');
  const summary = cycle.agentState.orderSummaries['ord-stage3'];
  assert.equal(summary.workflowStepIndex, 4);
  assert.equal(summary.activeAgent, 'Delivery Monitoring Agent');
});

test('Stage 05 -> Stage 06: Tailor Workflow Agent requires Workbench Readiness and Customer Contact before starting work', async () => {
  resetIdempotencyKeysForTesting();
  const orderAtTailor = buildBaseOrder({
    id: 'ord-stage5',
    orderNumber: 'TRN-9005',
    stage: 'accepted',
    firstDeliveryStatus: 'delivered_to_tailor',
    workbench: {
      statusLabel: 'Waiting for Prep',
      readyToBegin: false,
      notes: '',
      updatedAt: 'Today',
      updatedBy: 'Tailor',
    },
    customerContacted: false,
  });

  const cycleStage5 = await runCentralOrchestratorCycle({
    orders: [orderAtTailor],
    tasks: [],
    notifications: [],
    ledger: [],
    triggerEvent: 'Cloth Delivered to Tailor',
    useGeminiEnrichment: false,
  });

  assert.equal(cycleStage5.agentState.orderSummaries['ord-stage5'].workflowStepIndex, 5);
  assert.equal(
    cycleStage5.agentState.orderSummaries['ord-stage5'].safetyGateStatus,
    'awaiting_tailor_confirmation'
  );

  // Now mark workbench ready -> moves to Stage 06 waiting for customer contact
  const orderWorkbenchReady: TailorOrder = {
    ...orderAtTailor,
    workbench: {
      statusLabel: 'Cutting Table Ready',
      readyToBegin: true,
      notes: 'Ready',
      updatedAt: 'Today',
      updatedBy: 'Tailor',
    },
  };

  const cycleStage6 = await runCentralOrchestratorCycle({
    orders: [orderWorkbenchReady],
    tasks: [],
    notifications: [],
    ledger: [],
    triggerEvent: 'Workbench Confirmed Ready',
    useGeminiEnrichment: false,
  });

  assert.equal(cycleStage6.agentState.orderSummaries['ord-stage5'].workflowStepIndex, 6);
  assert.equal(
    cycleStage6.agentState.exceptions.some(
      (e) => e.issueType === 'unconfirmed_customer_contact'
    ),
    true
  );
});

test('Stage 08 -> Stage 09 -> Stage 10 -> Stage 11: Exception Agent verifies completion evidence, Dispatch Agent assigns Leg 2, and Orchestrator closes lifecycle after final delivery', async () => {
  resetIdempotencyKeysForTesting();
  const completedTailorOrder = buildBaseOrder({
    id: 'ord-stage9',
    orderNumber: 'TRN-9009',
    stage: 'completed',
    firstDeliveryStatus: 'delivered_to_tailor',
    workbench: {
      statusLabel: 'Steam Press Ready',
      readyToBegin: true,
      notes: 'Done',
      updatedAt: 'Today',
      updatedBy: 'Tailor',
    },
    customerContacted: true,
    progressUpdates: [
      {
        id: 'prog-1',
        orderId: 'ord-stage9',
        photoUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2',
        description: 'Completed sleeve tapering and steam press',
        uploadedAt: 'Today · 11:15 AM',
        workStatus: 'Final Steam Press & Quality Verification',
      },
    ],
    completedAt: 'Today · 11:20 AM',
  });

  // Cycle 1: Stage 09 Dispatch Agent creates Second Delivery assignment -> advances to Stage 10 waiting for final delivery
  const cycleLeg2 = await runCentralOrchestratorCycle({
    orders: [completedTailorOrder],
    tasks: [],
    notifications: [],
    ledger: [],
    triggerEvent: 'Tailor Submitted Completion',
    useGeminiEnrichment: false,
  });

  const secondTask = cycleLeg2.tasks.find((t) => t.deliveryStage === 'second_delivery');
  assert.ok(secondTask);
  assert.equal(cycleLeg2.agentState.orderSummaries['ord-stage9'].workflowStepIndex, 10);
  assert.equal(
    cycleLeg2.agentState.orderSummaries['ord-stage9'].activeAgent,
    'Delivery Monitoring Agent'
  );

  // Cycle 2: Backend confirms final delivery to customer -> Stage 11 Close Order Lifecycle
  const deliveredSecondTask: DeliveryTask = {
    ...secondTask!,
    status: 'delivered_to_customer',
    deliveredAt: 'Today · 12:05 PM',
  };
  const deliveredOrder: TailorOrder = {
    ...cycleLeg2.orders[0],
    secondDeliveryStatus: 'delivered_to_customer',
    orderStatus: 'Delivered to Customer',
  };

  const cycleClosed = await runCentralOrchestratorCycle({
    orders: [deliveredOrder],
    tasks: [deliveredSecondTask],
    notifications: cycleLeg2.notifications,
    ledger: [],
    triggerEvent: 'Delivery Partner Confirmed Final Drop-off',
    useGeminiEnrichment: false,
  });

  assert.equal(cycleClosed.agentState.orderSummaries['ord-stage9'].workflowStepIndex, 11);
  assert.equal(cycleClosed.orders[0].orderStatus, 'Order Completed');
});
