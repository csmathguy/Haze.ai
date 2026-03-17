import type { FastifyInstance } from "fastify";

export interface WorkflowPersistenceOptions {
  readonly databaseUrl?: string;
}

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
  app.get("/api/workflow/approvals", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
  app.post("/api/workflow/approvals/:id/respond", async (_request, reply) => {
    reply.code(501);
    return notImplemented();
  });
}
