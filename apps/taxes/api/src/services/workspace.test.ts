import { Readable } from "node:stream";

import type { MultipartFile } from "@fastify/multipart";
import { afterEach, describe, expect, it } from "vitest";

import type { TestWorkspaceContext } from "../test/database.js";
import { createTestWorkspaceContext } from "../test/database.js";
import { saveUploadedDocument } from "./document-store.js";
import { saveQuestionnaireResponse } from "./questionnaire.js";
import { getWorkspaceSnapshot } from "./workspace.js";

describe("getWorkspaceSnapshot", () => {
  const workspaces: TestWorkspaceContext[] = [];

  afterEach(async () => {
    await Promise.all(workspaces.splice(0, workspaces.length).map(async (workspace) => workspace.cleanup()));
  });

  it("starts with a local-only empty workspace when no documents exist", async () => {
    const workspace = await createTestWorkspaceContext("taxes-workspace-empty");
    workspaces.push(workspace);
    const snapshot = await getWorkspaceSnapshot(workspace);

    expect(snapshot.localOnly).toBe(true);
    expect(snapshot.dataGaps).toEqual([]);
    expect(snapshot.documents).toEqual([]);
    expect(snapshot.extractions).toEqual([]);
    expect(snapshot.questionnaire.length).toBeGreaterThan(0);
    expect(snapshot.reviewQueue).toEqual([]);
    expect(snapshot.draft.requiredForms).toEqual(["1040"]);
    expect(snapshot.filingChecklist.taxYear).toBe(snapshot.household.taxYear);
    expect(snapshot.filingChecklist.federal.readiness).toBe("needs-documents");
    expect(snapshot.filingChecklist.state.readiness).toBe("needs-documents");
    expect(snapshot.filingChecklist.federal.items.find((item) => item.id === "income-records")?.status).toBe("missing");
    expect(snapshot.filingChecklist.federal.items.find((item) => item.id === "prior-year-reference")?.status).toBe("missing");
  });

  it("elevates digital-asset forms and review tasks when crypto exports are present", async () => {
    const workspace = await createTestWorkspaceContext("taxes-workspace-digital-asset");
    workspaces.push(workspace);

    await saveUploadedDocument(createMultipartFile("coinbase-wallet-export.csv"), 2025, workspace);
    await saveQuestionnaireResponse(
      {
        promptKey: "optimization-lot-selection-preference",
        taxYear: 2025,
        value: "highest-basis"
      },
      workspace
    );

    const snapshot = await getWorkspaceSnapshot(workspace);

    expect(snapshot.household.hasDigitalAssets).toBe(true);
    expect(snapshot.dataGaps.length).toBeGreaterThan(0);
    expect(snapshot.draft.requiredForms).toEqual(["1040", "schedule-d", "form-8949"]);
    expect(snapshot.extractions).toEqual([
      expect.objectContaining({
        documentId: snapshot.documents[0]?.id,
        extractorKey: "intake/crypto-wallet-export",
        status: "pending"
      })
    ]);
    expect(snapshot.questionnaire.find((prompt) => prompt.key === "optimization-lot-selection-preference")?.currentValue).toBe(
      "highest-basis"
    );
    expect(snapshot.reviewQueue.length).toBeGreaterThan(0);
    expect(snapshot.filingChecklist.federal.items.find((item) => item.id === "capital-activity-records")?.blocker).toBe(true);
    expect(snapshot.filingChecklist.federal.items.find((item) => item.id === "capital-activity-records")?.status).toBe(
      "incomplete"
    );
    expect(snapshot.filingChecklist.federal.readiness).toBe("needs-documents");
  });

  it("flags when federal and state readiness differ", async () => {
    const workspace = await createTestWorkspaceContext("taxes-workspace-readiness-diff");
    workspaces.push(workspace);

    await saveUploadedDocument(createMultipartFile("2025-W2-employer.pdf"), 2025, workspace);
    await saveUploadedDocument(createMultipartFile("2024-1040-federal-reference.pdf"), 2025, workspace);

    const snapshot = await getWorkspaceSnapshot(workspace);

    expect(snapshot.filingChecklist.federal.readiness).toBe("needs-review");
    expect(snapshot.filingChecklist.state.readiness).toBe("needs-documents");
    expect(snapshot.filingChecklist.differsByJurisdiction).toBe(true);
  });
});

function createMultipartFile(fileName: string): MultipartFile {
  return {
    file: Readable.from(["test file contents"]),
    filename: fileName,
    mimetype: "text/csv"
  } as MultipartFile;
}
