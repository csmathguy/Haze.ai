import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("workflow app", () => {
  it("returns 200 from the health endpoint", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/workflow/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: "workflow", status: "ok" });

    await app.close();
  });
});
