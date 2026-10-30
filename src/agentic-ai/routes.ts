import express from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  COMPLETE_11_STAGE_WORKFLOW,
  buildDeliveryPartnerCopilotAdvice,
  runCentralOrchestratorCycle,
} from './orchestrator.ts';
import {
  broadcastAgentStateToSupabase,
  getAllWorkflowRuns,
  getRecentOrderEvents,
} from './services/event-publisher.ts';
import {
  getDeliveryTasks,
  getLedgerTransactions,
  getNotifications,
  getTailorOrders,
  upsertDeliveryTask,
  upsertNotification,
  upsertTailorOrder,
} from '../db/queries.ts';
import { PartnerLiveLocation } from '../types/appTypes.ts';

export function registerAgenticAiRoutes(
  app: express.Express,
  deps: {
    supabase: any;
    getOnlinePartners: () => PartnerLiveLocation[];
  }
) {
  // 1. Central Orchestrator Decision Cycle Endpoint
  app.post('/api/agent/orchestrate', async (req, res) => {
    try {
      const {
        orders = [],
        tasks = [],
        notifications = [],
        ledger = [],
        triggerEvent = 'Order Workflow Event',
        sourcePortal = 'system',
        targetOrderId,
        existingAuditLog = [],
        existingApprovals = [],
      } = req.body || {};

      const workingOrders =
        Array.isArray(orders) && orders.length > 0 ? orders : await getTailorOrders();
      const workingTasks =
        Array.isArray(tasks) && tasks.length > 0 ? tasks : await getDeliveryTasks();
      const workingNotifications =
        Array.isArray(notifications) && notifications.length > 0
          ? notifications
          : await getNotifications();
      const workingLedger =
        Array.isArray(ledger) && ledger.length > 0 ? ledger : await getLedgerTransactions();

      const result = await runCentralOrchestratorCycle({
        orders: workingOrders,
        tasks: workingTasks,
        notifications: workingNotifications,
        ledger: workingLedger,
        onlinePartners: deps.getOnlinePartners(),
        triggerEvent,
        sourcePortal,
        targetOrderId,
        existingAuditLog,
        existingApprovals,
      });

      // Persist any verified order, task, or notification updates made by authorized tools
      await Promise.all([
        ...result.orders.map((o) => upsertTailorOrder(o).catch(() => {})),
        ...result.tasks.map((t) => upsertDeliveryTask(t).catch(() => {})),
        ...result.notifications.slice(0, 5).map((n) => upsertNotification(n).catch(() => {})),
      ]);

      broadcastAgentStateToSupabase(deps.supabase, result.agentState);

      res.json({
        success: true,
        orders: result.orders,
        tasks: result.tasks,
        notifications: result.notifications,
        ledger: result.ledger,
        agentState: result.agentState,
        workflowRuns: result.workflowRuns,
        partnerCopilot: result.partnerCopilot,
        stages: COMPLETE_11_STAGE_WORKFLOW,
      });
    } catch (error: any) {
      console.error('Agent orchestration error:', error);
      res.status(500).json({ error: error.message || 'Agent orchestration failed' });
    }
  });

  // 2. Get Current Agentic AI Workflow State & 11-Stage Definitions
  app.get('/api/agent/state', async (req, res) => {
    try {
      const [orders, tasks, notifications, ledger] = await Promise.all([
        getTailorOrders(),
        getDeliveryTasks(),
        getNotifications(),
        getLedgerTransactions(),
      ]);

      const result = await runCentralOrchestratorCycle({
        orders,
        tasks,
        notifications,
        ledger,
        onlinePartners: deps.getOnlinePartners(),
        triggerEvent: 'State Inspection',
        useGeminiEnrichment: false,
      });

      res.json({
        success: true,
        agentState: result.agentState,
        workflowRuns: getAllWorkflowRuns(),
        recentEvents: getRecentOrderEvents(),
        partnerCopilot: result.partnerCopilot,
        stages: COMPLETE_11_STAGE_WORKFLOW,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to inspect agent state' });
    }
  });

  // 3. Resolve Customer Missing Measurements / Pickup Details (Stage 02 -> Stage 03)
  app.post('/api/agent/resolve-customer-requirements', async (req, res) => {
    try {
      const {
        orderId,
        chestInches,
        waistInches,
        shoulderInches,
        sleeveLengthInches,
        garmentLengthInches,
        neckCollarInches,
        customerAddress,
      } = req.body || {};

      if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
      }

      const orders = await getTailorOrders();
      const target = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (!target) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const updatedOrder = {
        ...target,
        customerAddress: customerAddress || target.customerAddress,
        sizeChart: {
          ...target.sizeChart,
          chestInches: String(chestInches || target.sizeChart?.chestInches || '40'),
          waistInches: String(waistInches || target.sizeChart?.waistInches || '34'),
          shoulderInches: String(shoulderInches || target.sizeChart?.shoulderInches || '18.5'),
          sleeveLengthInches: String(
            sleeveLengthInches || target.sizeChart?.sleeveLengthInches || '25'
          ),
          garmentLengthInches: String(
            garmentLengthInches || target.sizeChart?.garmentLengthInches || '30'
          ),
          neckCollarInches: String(
            neckCollarInches || target.sizeChart?.neckCollarInches || '16'
          ),
          fitPreference: target.sizeChart?.fitPreference || ('Classic Regular' as const),
        },
      };

      await upsertTailorOrder(updatedOrder);

      const updatedOrders = orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      const [tasks, notifications, ledger] = await Promise.all([
        getDeliveryTasks(),
        getNotifications(),
        getLedgerTransactions(),
      ]);

      const cycle = await runCentralOrchestratorCycle({
        orders: updatedOrders,
        tasks,
        notifications,
        ledger,
        onlinePartners: deps.getOnlinePartners(),
        triggerEvent: `Customer Provided Missing Requirements (#${updatedOrder.orderNumber})`,
        sourcePortal: 'customer',
        targetOrderId: updatedOrder.id,
      });

      res.json({
        success: true,
        order: updatedOrder,
        orders: cycle.orders,
        tasks: cycle.tasks,
        agentState: cycle.agentState,
        partnerCopilot: cycle.partnerCopilot,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to resolve customer requirements',
      });
    }
  });

  // 4. Delivery & Partner AI Copilot Interactive Query Endpoint
  app.post('/api/agent/partner-copilot', async (req, res) => {
    try {
      const {
        role = 'delivery',
        question = '',
        orders = [],
        tasks = [],
      } = req.body || {};

      const workingOrders =
        Array.isArray(orders) && orders.length > 0 ? orders : await getTailorOrders();
      const workingTasks =
        Array.isArray(tasks) && tasks.length > 0 ? tasks : await getDeliveryTasks();

      const cycle = await runCentralOrchestratorCycle({
        orders: workingOrders,
        tasks: workingTasks,
        notifications: [],
        ledger: [],
        onlinePartners: deps.getOnlinePartners(),
        triggerEvent: `Partner AI Copilot Query (${role})`,
        sourcePortal: role === 'tailor' ? 'tailor' : 'delivery',
        useGeminiEnrichment: false,
      });

      const baseAdvice = buildDeliveryPartnerCopilotAdvice({
        orders: cycle.orders,
        tasks: cycle.tasks,
        exceptions: cycle.agentState.exceptions,
        orderSummaries: cycle.agentState.orderSummaries,
      });

      let aiReply = `${baseAdvice.partnerStatusSummary} Next required backend event: ${baseAdvice.nextRequiredEvent}`;

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'undefined' && question.trim()) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are the Trench ${
              role === 'tailor' ? 'Tailor Workflow AI' : 'Delivery Partner AI'
            } assistant connected to the Central AI Orchestrator.
Current status: ${baseAdvice.partnerStatusSummary}
Active stage: ${baseAdvice.activeStageTitle} (Agent: ${baseAdvice.activeAgent})
Route/Task tip: ${baseAdvice.routeOptimizationTip}
Next required backend event: ${baseAdvice.nextRequiredEvent}
Partner question: "${question}"
Respond in 2 short, practical sentences focused on verified order state, pickup/delivery evidence, or workbench readiness.`,
          });
          if (response.text) {
            aiReply = response.text.trim();
          }
        } catch {
          // Keep deterministic reply if Gemini call fails
        }
      } else if (question.trim()) {
        const q = question.toLowerCase();
        if (q.includes('delay') || q.includes('route') || q.includes('map')) {
          aiReply = `${baseAdvice.routeOptimizationTip} Delivery Monitoring Agent is verifying live GPS coordinates and pickup/drop-off timestamps.`;
        } else if (q.includes('tailor') || q.includes('workbench') || q.includes('contact')) {
          aiReply = `Tailor Workflow Agent enforces Stage 05 (Workbench Ready) and Stage 06 (Customer Contact Confirmed) before stitching work can begin, and Stage 08 photo evidence before Second Delivery dispatch.`;
        } else if (q.includes('measure') || q.includes('customer')) {
          aiReply = `Order Agent validates customer service type and 6-point measurements at Stage 02. If measurements are missing, dispatch pauses until recorded.`;
        }
      }

      res.json({
        success: true,
        reply: aiReply,
        copilot: baseAdvice,
        agentState: cycle.agentState,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Partner AI query failed' });
    }
  });
}
