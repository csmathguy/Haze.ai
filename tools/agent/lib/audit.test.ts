import { describe, expect, it } from "vitest";

import { createRunId, getAuditDateSegment, slugify } from "./audit.js";

describe("slugify", () => {
  it("normalizes workflow labels into stable path segments", () => {
    expect(slugify("Implementation Workflow")).toBe("implementation-workflow");
  });
});

describe("createRunId", () => {
  it("includes the workflow slug in the run id", () => {
    const runId = createRunId("Quality Gates", new Date(2026, 2, 10, 12, 0, 0, 0));

    expect(runId).toContain("quality-gates");
    expect(runId.startsWith("2026-03-10T120000-000")).toBe(true);
  });
});

describe("getAuditDateSegment", () => {
  it("extracts the date prefix from the run id", () => {
    expect(getAuditDateSegment("2026-03-11T120000-000Z-quality-gates-deadbeef")).toBe("2026-03-11");
  });
});
