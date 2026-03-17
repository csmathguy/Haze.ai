import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { getWorkflowPrismaClient } from "../db/client.js";
import * as approvalService from "../services/approval-service.js";

export interface WorkflowPersistenceOptions {
  readonly databaseUrl?: string;
}

// ============================================================================
// Zod Schemas for Approval Response
// ============================================================================

const RespondApprovalBodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  respondedBy: z.string().min(1, "respondedBy is required"),
  notes: z.string().optional()
});

function notImplemented() {
  return { error: "not implemented" };
}

export function registerWorkflowRoutes(app: FastifyInstance): void {
  // Workflow Definitions
  app.post("/api/workflow/definitions", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/definitions", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/definitions/:name", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });

  // Workflow Runs
  app.post("/api/workflow/runs", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/runs", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/runs/:id", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.post("/api/workflow/runs/:id/signal", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.delete("/api/workflow/runs/:id", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });

  // Workflow Events
  app.get("/api/workflow/events", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });

  // Agents
  app.get("/api/workflow/agents", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.post("/api/workflow/agents", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/agents/:id", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });

  // Skills
  app.get("/api/workflow/skills", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.post("/api/workflow/skills", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.get("/api/workflow/skills/:id", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });

  // Approvals
  app.get("/api/workflow/approvals", async (request: FastifyRequest, reply: FastifyReply) => {
    return registerApprovalsListRoute(app, request, reply);
  });
  app.post("/api/workflow/approvals/:id/respond", async (request: FastifyRequest, reply: FastifyReply) => {
    return registerApprovalRespondRoute(app, request, reply);
  });
}

// ============================================================================
// Approval Route Handlers
// ============================================================================

async function registerApprovalsListRoute(
  _app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const queryParams = z
      .object({
        runId: z.string().optional()
      })
      .parse(request.query);

    const prisma = await getWorkflowPrismaClient();
    try {
      let approvals;
      if (queryParams.runId !== undefined) {
        approvals = await approvalService.listPendingApprovalsByRun(prisma, queryParams.runId);
      } else {
        approvals = await approvalService.listPendingApprovals(prisma);
      }

      return {
        approvals
      };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400);
      return { error: "Invalid query parameters", details: error.errors };
    }
    throw error;
  }
}

async function registerApprovalRespondRoute(_app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  try {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = RespondApprovalBodySchema.parse(request.body);

    const prisma = await getWorkflowPrismaClient();
    try {
      const approval = await approvalService.respondToApproval(prisma, params.id, {
        decision: body.decision,
        respondedBy: body.respondedBy,
        notes: body.notes
      });

      reply.code(200);
      return { approval };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.code(400);
      return { error: "Invalid request", details: error.errors };
    }
    throw error;
  }
}
