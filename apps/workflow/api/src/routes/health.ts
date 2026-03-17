import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/api/workflow/health", () => ({
    service: "workflow",
    status: "ok"
  }));
}
