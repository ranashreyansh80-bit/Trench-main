import { AgentOrchestratorState, WorkflowRunRecord } from '../types.ts';

export interface PublishedWorkflowEvent {
  eventId: string;
  orderId: string;
  orderNumber: string;
  eventType: string;
  sourcePortal: 'customer' | 'tailor' | 'delivery' | 'system';
  timestamp: string;
}

const recentOrderEvents: PublishedWorkflowEvent[] = [];
const workflowRunsByOrder = new Map<string, WorkflowRunRecord>();

export function recordOrderEvent(event: PublishedWorkflowEvent): void {
  if (!recentOrderEvents.some((e) => e.eventId === event.eventId)) {
    recentOrderEvents.unshift(event);
    if (recentOrderEvents.length > 100) {
      recentOrderEvents.pop();
    }
  }
}

export function getRecentOrderEvents(orderId?: string): PublishedWorkflowEvent[] {
  if (!orderId) return recentOrderEvents;
  return recentOrderEvents.filter((e) => e.orderId === orderId);
}

export function saveWorkflowRunRecord(run: WorkflowRunRecord): void {
  workflowRunsByOrder.set(run.orderId, run);
}

export function getWorkflowRunRecord(orderId: string): WorkflowRunRecord | undefined {
  return workflowRunsByOrder.get(orderId);
}

export function getAllWorkflowRuns(): WorkflowRunRecord[] {
  return Array.from(workflowRunsByOrder.values());
}

export function broadcastAgentStateToSupabase(
  supabaseClient: any,
  agentState: AgentOrchestratorState
): void {
  if (!supabaseClient) return;
  try {
    const channel = supabaseClient.channel('trench-agentic-workflow');
    Promise.resolve(
      channel.send({
        type: 'broadcast',
        event: 'agent_state_updated',
        payload: {
          activeAgent: agentState.activeAgent,
          lastTriggerEvent: agentState.lastTriggerEvent,
          lastRunAt: agentState.lastRunAt,
          orderSummaries: agentState.orderSummaries,
          exceptionsCount: agentState.exceptions.length,
        },
      })
    ).catch(() => {});
  } catch {
    // Non-fatal if realtime channel is not active
  }
}
