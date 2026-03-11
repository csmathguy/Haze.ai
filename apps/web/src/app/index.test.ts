import { describe, expect, it } from "vitest";

import { buildReviewBanner } from "./index.js";

describe("buildReviewBanner", () => {
  it("uses a warning banner when document trust is unknown", () => {
    expect(buildReviewBanner("unknown")).toEqual({
      emphasis: "warning",
      message: "Review needed before the imported values can be trusted."
    });
  });

  it("uses an informational banner for supported documents", () => {
    expect(buildReviewBanner("bank-interest")).toEqual({
      emphasis: "info",
      message: "Imported values are ready for field-by-field review."
    });
  });
});
