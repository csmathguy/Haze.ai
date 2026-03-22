import { mkdtemp, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import type { CodeReviewPullRequestDetail } from "@taxes/shared";

import { createFileCodeReviewCacheStore } from "./pull-request-cache.js";

const cacheDirectories: string[] = [];

describe("createFileCodeReviewCacheStore", () => {
  afterEach(async () => {
    await Promise.all(cacheDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
  });

  it("stores pull request detail under both a head-sha file and a latest pointer", async () => {
    const cacheRoot = await createCacheRoot();
    const store = createFileCodeReviewCacheStore(cacheRoot, () => new Date("2026-03-22T03:30:00.000Z"));
    const detail = createPullRequestDetail();

    await store.writePullRequestDetail(detail.number, detail);

    const versionedContents = await readFile(path.join(cacheRoot, "pull-requests", "239", `${detail.headSha}.json`), "utf8");
    const latest = await store.readPullRequestDetail(detail.number);
    const versioned = JSON.parse(versionedContents) as { value: { headSha: string; number: number } };

    expect(versioned.value.headSha).toBe(detail.headSha);
    expect(versioned.value.number).toBe(239);
    expect(latest?.value.headSha).toBe(detail.headSha);
    expect(latest?.value.reviewBrief?.sourceHeadSha).toBe(detail.headSha);
  });
});

async function createCacheRoot(): Promise<string> {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), "code-review-cache-"));
  cacheDirectories.push(cacheRoot);

  return cacheRoot;
}

function createPullRequestDetail(): CodeReviewPullRequestDetail {
  return {
    author: {
      isBot: false,
      login: "codex"
    },
    baseRefName: "main",
    body: "## Summary\n- Add durable review brief cache support",
    checks: [],
    headRefName: "feature/plan-239",
    headSha: "abcdef1234567890",
    isDraft: false,
    lanes: [
      {
        evidence: [],
        files: [],
        highlights: [],
        id: "context",
        questions: ["What changed?"],
        reviewerGoal: "Orient the reviewer.",
        summary: "Context lane",
        title: "Context"
      }
    ],
    mergeStateStatus: "CLEAN",
    narrative: {
      reviewFocus: [],
      reviewOrder: ["Context"],
      risks: [],
      summaryBullets: ["Add review brief cache support"],
      validationCommands: [],
      valueSummary: "Add review brief cache support.",
      whatChangedSections: []
    },
    number: 239,
    reviewBrief: {
      followUpCandidates: [],
      generatedAt: "2026-03-22T03:30:00.000Z",
      inspectFirst: [],
      missingEvidence: [],
      sourceHeadSha: "abcdef1234567890",
      startHere: ["Start with the work item."],
      summary: "Cache the generated review brief by head SHA.",
      whatThisPrDoes: ["Stores durable review briefing output."]
    },
    reviewDecision: "",
    state: "OPEN",
    stats: {
      commentCount: 0,
      fileCount: 1,
      reviewCount: 0,
      totalAdditions: 10,
      totalDeletions: 2
    },
    title: "Persist review brief",
    trustStatement: "Human review remains the final gate.",
    updatedAt: "2026-03-22T03:30:00.000Z",
    url: "https://github.com/csmathguy/Haze.ai/pull/239"
  };
}
