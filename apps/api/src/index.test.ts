import { describe, expect, it } from "vitest";

import { planExtractionJob } from "./index.js";

describe("planExtractionJob", () => {
  it("flags unknown documents for manual review", () => {
    expect(planExtractionJob("unknown")).toEqual({
      receivedKind: "unknown",
      requiresManualReview: true
    });
  });

  it("accepts supported documents without manual review", () => {
    expect(planExtractionJob("income-summary")).toEqual({
      receivedKind: "income-summary",
      requiresManualReview: false
    });
  });
});
