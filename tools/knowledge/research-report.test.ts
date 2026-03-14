import { describe, expect, it } from "vitest";

import type { KnowledgeEntry } from "@taxes/shared";

import { findKnowledgeEntries, resolveResearchReportUpsert } from "./research-report.js";

describe("findKnowledgeEntries", () => {
  it("filters entries by search text, kind, and namespace", () => {
    const entries = [
      buildKnowledgeEntry({
        abstract: "Mermaid and Graphviz comparison for local diagrams.",
        kind: "research-report",
        namespace: "workflow:research",
        tags: ["visualization", "mermaid"],
        title: "Visualization research report"
      }),
      buildKnowledgeEntry({
        abstract: "Personal preference note.",
        kind: "agent-memory",
        namespace: "human:primary",
        tags: ["preference"],
        title: "Owner preference"
      })
    ];

    const result = findKnowledgeEntries(entries, {
      kind: "research-report",
      limit: 5,
      namespace: "workflow:research",
      search: "graphviz mermaid"
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Visualization research report");
  });
});

describe("resolveResearchReportUpsert", () => {
  it("creates a new research-report entry when no existing report matches", () => {
    const mutation = resolveResearchReportUpsert(
      [],
      {
        content: {
          abstract: "Research summary",
          format: "hybrid",
          json: {
            topic: "visualization"
          },
          markdown: "New findings.",
          sections: [],
          sources: []
        },
        createdByName: "codex",
        namespace: "workflow:research",
        tags: ["visualization"],
        title: "Visualization workflow report"
      },
      "2026-03-14T18:00:00.000Z"
    );

    expect(mutation).toEqual({
      action: "create",
      input: {
        content: {
          abstract: "Research summary",
          format: "hybrid",
          json: {
            topic: "visualization"
          },
          markdown: "New findings.",
          sections: [],
          sources: []
        },
        createdByKind: "agent",
        createdByName: "codex",
        importance: "medium",
        kind: "research-report",
        namespace: "workflow:research",
        origin: "research-agent",
        status: "active",
        tags: ["visualization"],
        title: "Visualization workflow report",
        visibility: "shared"
      }
    });
  });

  it("updates an existing research-report when the source uri matches", () => {
    const existing = buildKnowledgeEntry({
      abstract: "Older summary",
      kind: "research-report",
      namespace: "workflow:research",
      sourceUri: "docs/visualization.md",
      tags: ["old"],
      title: "Visualization workflow report"
    });

    const mutation = resolveResearchReportUpsert(
      [existing],
      {
        content: {
          abstract: "Improved summary",
          format: "markdown",
          markdown: "Consolidated findings.",
          sections: [],
          sources: []
        },
        namespace: "workflow:research",
        sourceUri: "docs/visualization.md",
        tags: ["visualization", "consolidated"],
        title: "Visualization workflow report",
        visibility: "shared"
      },
      "2026-03-14T18:00:00.000Z"
    );

    expect(mutation).toEqual({
      action: "update",
      entryId: existing.id,
      input: {
        content: {
          abstract: "Improved summary",
          format: "markdown",
          markdown: "Consolidated findings.",
          sections: [],
          sources: []
        },
        importance: "medium",
        lastReviewedAt: "2026-03-14T18:00:00.000Z",
        namespace: "workflow:research",
        sourceUri: "docs/visualization.md",
        status: "active",
        tags: ["visualization", "consolidated"],
        title: "Visualization workflow report",
        visibility: "shared"
      }
    });
  });
});

function buildKnowledgeEntry(input: {
  abstract: string;
  kind: KnowledgeEntry["kind"];
  namespace: string;
  sourceUri?: string;
  tags: string[];
  title: string;
}): KnowledgeEntry {
  return {
    content: {
      abstract: input.abstract,
      format: "markdown",
      markdown: input.abstract,
      sections: [],
      sources: []
    },
    createdAt: "2026-03-14T17:00:00.000Z",
    createdByKind: "agent",
    createdByName: "codex",
    id: `${input.title}-id`,
    importance: "medium",
    kind: input.kind,
    namespace: input.namespace,
    origin: "research-agent",
    slug: input.title.toLowerCase().replaceAll(" ", "-"),
    sourceTitle: undefined,
    sourceUri: input.sourceUri,
    status: "active",
    subjectId: undefined,
    tags: input.tags,
    title: input.title,
    updatedAt: "2026-03-14T17:00:00.000Z",
    visibility: "shared"
  };
}
