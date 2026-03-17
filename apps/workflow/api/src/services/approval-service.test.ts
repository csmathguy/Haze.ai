import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@taxes/db";
import { getWorkflowPrismaClient, disconnectWorkflowPrismaClient } from "../db/client.js";
import {
  createApproval,
  getApproval,
  listPendingApprovals,
  listPendingApprovalsByRun,
  respondToApproval
} from "./approval-service.js";

describe("approval-service", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await getWorkflowPrismaClient();
  });

  afterAll(async () => {
    await disconnectWorkflowPrismaClient();
  });

  it("creates an approval", async () => {
    const approval = await createApproval(db, {
      runId: "run_test_001",
      stepId: "step_approval_001",
      prompt: "Please approve the workflow"
    });

    expect(approval.id).toBeDefined();
    expect(approval.runId).toBe("run_test_001");
    expect(approval.stepId).toBe("step_approval_001");
    expect(approval.status).toBe("pending");
    expect(approval.prompt).toBe("Please approve the workflow");
    expect(approval.requestedAt).toBeDefined();
  });

  it("lists pending approvals", async () => {
    // Create a few test approvals
    await createApproval(db, {
      runId: "run_test_002",
      stepId: "step_approval_002",
      prompt: "Approval 1"
    });

    await createApproval(db, {
      runId: "run_test_003",
      stepId: "step_approval_003",
      prompt: "Approval 2"
    });

    const pending = await listPendingApprovals(db);

    expect(pending.length).toBeGreaterThanOrEqual(2);
    expect(pending.every((a) => a.status === "pending")).toBe(true);
  });

  it("lists pending approvals by run", async () => {
    const runId = "run_test_004";

    // Create multiple approvals for the same run
    const approval1 = await createApproval(db, {
      runId,
      stepId: "step_approval_004a",
      prompt: "Approval A"
    });

    const approval2 = await createApproval(db, {
      runId,
      stepId: "step_approval_004b",
      prompt: "Approval B"
    });

    const pending = await listPendingApprovalsByRun(db, runId);

    expect(pending.length).toBeGreaterThanOrEqual(2);
    expect(pending.some((a) => a.id === approval1.id)).toBe(true);
    expect(pending.some((a) => a.id === approval2.id)).toBe(true);
  });

  it("gets a single approval", async () => {
    const created = await createApproval(db, {
      runId: "run_test_005",
      stepId: "step_approval_005",
      prompt: "Get this approval"
    });

    const fetched = await getApproval(db, created.id);

    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.runId).toBe("run_test_005");
  });

  it("responds to an approval", async () => {
    const created = await createApproval(db, {
      runId: "run_test_006",
      stepId: "step_approval_006",
      prompt: "Respond to this approval"
    });

    const response = await respondToApproval(db, created.id, {
      decision: "approved",
      respondedBy: "user@example.com",
      notes: "Looks good"
    });

    expect(response.id).toBe(created.id);
    expect(response.status).toBe("responded");
    expect(response.respondedAt).toBeDefined();

    const responseJson = JSON.parse(response.responseJson ?? "{}") as Record<string, unknown>;
    expect(responseJson.decision).toBe("approved");
    expect(responseJson.respondedBy).toBe("user@example.com");
    expect(responseJson.notes).toBe("Looks good");
  });

  it("emits a WorkflowEvent when approval is responded", async () => {
    const created = await createApproval(db, {
      runId: "run_test_007",
      stepId: "step_approval_007",
      prompt: "Event emission test"
    });

    await respondToApproval(db, created.id, {
      decision: "rejected",
      respondedBy: "reviewer@example.com"
    });

    // Check that an event was created - get the most recent one
    const events = await db.workflowEvent.findMany({
      where: {
        type: "approval.responded",
        correlationId: "run_test_007"
      },
      orderBy: {
        occurredAt: "desc"
      },
      take: 1
    });

    expect(events.length).toBe(1);

    const event = events[0]!;
    expect(event.type).toBe("approval.responded");
    expect(event.correlationId).toBe("run_test_007");

    const payload = JSON.parse(event.payload) as Record<string, unknown>;
    expect(payload.approvalId).toBe(created.id);
    expect(payload.decision).toBe("rejected");
  });

  it("filters out responded approvals from pending list", async () => {
    const runId = "run_test_008";

    // Create an approval and respond to it
    const approval = await createApproval(db, {
      runId,
      stepId: "step_approval_008",
      prompt: "This will be responded"
    });

    await respondToApproval(db, approval.id, {
      decision: "approved",
      respondedBy: "user@example.com"
    });

    // List pending approvals for this run
    const pending = await listPendingApprovalsByRun(db, runId);

    // The responded approval should not be in the pending list
    expect(pending.every((a) => a.id !== approval.id)).toBe(true);
  });
});
