import { describe, expect, it } from "vitest";

import { CodeReviewPullRequestDetailSchema } from "./code-review.js";

describe("CodeReviewPullRequestDetailSchema", () => {
  it("parses a pull request detail with a durable review brief payload", () => {
    const parsed = CodeReviewPullRequestDetailSchema.parse({
      author: {
        isBot: false,
        login: "codex"
      },
      baseRefName: "main",
      body: "## Summary\n- Improve the review flow",
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
          questions: ["Why does this exist?"],
          reviewerGoal: "Understand the work item.",
          summary: "Context lane",
          title: "Context"
        }
      ],
      mergeStateStatus: "CLEAN",
      narrative: {
        reviewFocus: [],
        reviewOrder: ["Context"],
        risks: [],
        summaryBullets: ["Improve the review flow"],
        validationCommands: [],
        valueSummary: "Improve the review flow.",
        whatChangedSections: []
      },
      number: 239,
      reviewBrief: {
        followUpCandidates: ["Capture a persistent review decision model."],
        generatedAt: "2026-03-22T03:10:00.000Z",
        inspectFirst: ["Read the work-item context and first risky seam before scanning files."],
        missingEvidence: ["No browser-level validation evidence is attached yet."],
        sourceHeadSha: "abcdef1234567890",
        startHere: ["Confirm the linked work item and claimed value before opening the diff."],
        summary: "This PR adds a stronger guided starting point for human review.",
        whatThisPrDoes: ["Creates a durable review brief model for PR walkthroughs."]
      },
      reviewDecision: "",
      state: "OPEN",
      stats: {
        commentCount: 0,
        fileCount: 1,
        reviewCount: 0,
        totalAdditions: 5,
        totalDeletions: 1
      },
      title: "Add review brief contract",
      trustStatement: "Human review remains the final gate.",
      updatedAt: "2026-03-22T03:10:00.000Z",
      url: "https://github.com/csmathguy/Haze.ai/pull/239"
    });

    expect(parsed.headSha).toBe("abcdef1234567890");
    expect(parsed.reviewBrief?.sourceHeadSha).toBe(parsed.headSha);
    expect(parsed.reviewBrief?.whatThisPrDoes[0]).toContain("durable review brief");
  });
});
