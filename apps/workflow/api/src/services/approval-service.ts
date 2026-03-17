import type { PrismaClient, WorkflowApproval } from "@taxes/db";
import { EventBus } from "../event-bus/event-bus.js";

export interface CreateApprovalInput {
  runId: string;
  stepId: string;
  prompt: string;
}

export interface RespondToApprovalInput {
  decision: "approved" | "rejected";
  respondedBy: string;
  notes?: string;
}

/**
 * Lists all pending approvals.
 */
export async function listPendingApprovals(db: PrismaClient): Promise<WorkflowApproval[]> {
  return db.workflowApproval.findMany({
    where: {
      status: "pending"
    },
    orderBy: {
      requestedAt: "asc"
    }
  });
}

/**
 * Filters pending approvals by runId.
 */
export async function listPendingApprovalsByRun(db: PrismaClient, runId: string): Promise<WorkflowApproval[]> {
  return db.workflowApproval.findMany({
    where: {
      runId,
      status: "pending"
    },
    orderBy: {
      requestedAt: "asc"
    }
  });
}

/**
 * Gets a single approval by ID.
 */
export async function getApproval(db: PrismaClient, id: string): Promise<WorkflowApproval | null> {
  return db.workflowApproval.findUnique({
    where: { id }
  });
}

/**
 * Creates a new approval record.
 */
export async function createApproval(db: PrismaClient, data: CreateApprovalInput): Promise<WorkflowApproval> {
  return db.workflowApproval.create({
    data: {
      runId: data.runId,
      stepId: data.stepId,
      prompt: data.prompt,
      status: "pending"
    }
  });
}

/**
 * Responds to an approval (approve or reject).
 * Updates the WorkflowApproval record and emits a WorkflowEvent.
 */
export async function respondToApproval(
  db: PrismaClient,
  id: string,
  input: RespondToApprovalInput
): Promise<WorkflowApproval> {
  // Update the approval record
  const updated = await db.workflowApproval.update({
    where: { id },
    data: {
      status: "responded",
      responseJson: JSON.stringify({
        decision: input.decision,
        respondedBy: input.respondedBy,
        respondedAt: new Date().toISOString(),
        notes: input.notes ?? null
      }),
      respondedAt: new Date()
    }
  });

  // Emit a WorkflowEvent for the engine to consume
  const eventBus = new EventBus(db);
  await eventBus.emit({
    workflowRunId: updated.runId,
    eventType: "approval.responded",
    payload: {
      approvalId: id,
      decision: input.decision
    }
  });

  return updated;
}
