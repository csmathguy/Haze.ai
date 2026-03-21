import { describe, expect, it } from "vitest";

import { hasPendingCheckoutChanges } from "./refresh-workspace.js";

describe("hasPendingCheckoutChanges", () => {
  it("returns false when git status output is empty", () => {
    expect(hasPendingCheckoutChanges("")).toBe(false);
  });

  it("returns true when git status output contains staged or unstaged entries", () => {
    expect(hasPendingCheckoutChanges("M  tools/agent/refresh-workspace.ts\n")).toBe(true);
    expect(hasPendingCheckoutChanges("?? apps/gateway/api/src/db/migrations.test.ts\n")).toBe(true);
  });
});
