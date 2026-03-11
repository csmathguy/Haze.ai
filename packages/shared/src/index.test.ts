import { describe, expect, it } from "vitest";

import { isSupportedDocumentKind, normalizeImportedText } from "./index.js";

describe("normalizeImportedText", () => {
  it("collapses repeated whitespace into single spaces", () => {
    expect(normalizeImportedText("  form\t1099 \n int  ")).toBe("form 1099 int");
  });
});

describe("isSupportedDocumentKind", () => {
  it("accepts document kinds that the first extraction pass can map", () => {
    expect(isSupportedDocumentKind("bank-interest")).toBe(true);
    expect(isSupportedDocumentKind("unknown")).toBe(false);
  });
});
