import type { CodeReviewChangedFile, CodeReviewPullRequestDetail, ReviewLane, ReviewLaneId } from "@taxes/shared";

export type ReviewCheckpointStatus = "confirmed" | "in-progress" | "needs-follow-up" | "not-started";
export type TrustCheckpointStatus = "attention" | "complete" | "pending";

export interface ReviewNotebookEntry {
  readonly concerns: string;
  readonly confirmations: string;
  readonly notes: string;
  readonly selectedFilePath?: string;
  readonly selectedSectionTitle?: string;
  readonly status: ReviewCheckpointStatus;
}

export type ReviewNotebook = Record<ReviewLaneId, ReviewNotebookEntry>;

export interface ReviewLaneSection {
  readonly files: CodeReviewChangedFile[];
  readonly title: string;
}

export interface TrustSummary {
  readonly confirmedLaneCount: number;
  readonly evidenceCheckpoints: {
    readonly detail: string;
    readonly label: string;
    readonly status: TrustCheckpointStatus;
  }[];
  readonly followUpQueue: string[];
  readonly statusLabel: "Gather more evidence" | "Hold before decision" | "Ready for human decision";
  readonly statusTone: "secondary" | "success" | "warning";
  readonly valueSummary: string[];
}

interface CheckSummary {
  readonly failedCount: number;
  readonly pendingCount: number;
  readonly totalCount: number;
}

interface LaneReviewSummary {
  readonly blockingFollowUps: string[];
  readonly confirmedLaneCount: number;
  readonly hasReviewAttention: boolean;
  readonly laneCount: number;
  readonly laneFollowUps: string[];
}

const REVIEW_LANE_ORDER: readonly ReviewLaneId[] = ["context", "risks", "tests", "implementation", "validation", "docs"];

export function orderWalkthroughLanes(lanes: ReviewLane[]): ReviewLane[] {
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));

  return REVIEW_LANE_ORDER.flatMap((laneId) => {
    const lane = laneById.get(laneId);
    return lane === undefined ? [] : [lane];
  });
}

export function createReviewNotebook(lanes: ReviewLane[]): ReviewNotebook {
  const laneMap = new Map(orderWalkthroughLanes(lanes).map((lane) => [lane.id, lane]));

  return Object.fromEntries(
    REVIEW_LANE_ORDER.map((laneId) => {
      const lane = laneMap.get(laneId);
      const sections = lane === undefined ? [] : buildLaneSections(lane);

      return [
        laneId,
        {
          concerns: "",
          confirmations: "",
          notes: "",
          ...(lane?.files[0] === undefined ? {} : { selectedFilePath: lane.files[0].path }),
          ...(sections[0] === undefined ? {} : { selectedSectionTitle: sections[0].title }),
          status: "not-started" as const
        }
      ];
    })
  ) as ReviewNotebook;
}

export function buildLaneSections(lane: ReviewLane): ReviewLaneSection[] {
  if (lane.id !== "tests") {
    return [{ files: lane.files, title: lane.title }];
  }

  const sections: ReviewLaneSection[] = [
    createTagSection("End-to-end", lane.files, "e2e"),
    createTagSection("Integration", lane.files, "integration"),
    createTagSection("Unit", lane.files, "unit")
  ].filter((section) => section.files.length > 0);

  return sections.length === 0 ? [{ files: lane.files, title: lane.title }] : sections;
}

export function getSelectedSection(lane: ReviewLane, notebook: ReviewNotebook): ReviewLaneSection {
  const sections = buildLaneSections(lane);
  const selectedTitle = notebook[lane.id].selectedSectionTitle;

  return sections.find((section) => section.title === selectedTitle) ?? sections[0] ?? { files: [], title: lane.title };
}

export function getSelectedFile(lane: ReviewLane, notebook: ReviewNotebook): CodeReviewChangedFile | undefined {
  const selectedSection = getSelectedSection(lane, notebook);
  const selectedPath = notebook[lane.id].selectedFilePath;

  return selectedSection.files.find((file) => file.path === selectedPath) ?? selectedSection.files[0];
}

export function buildTrustSummary(pullRequest: CodeReviewPullRequestDetail, notebook: ReviewNotebook): TrustSummary {
  const laneSummary = summarizeLaneReview(pullRequest, notebook);
  const checkSummary = summarizeChecks(pullRequest);
  const followUpQueue = buildFollowUpQueue(pullRequest, laneSummary, checkSummary);
  const statusLabel = determineStatusLabel(pullRequest, laneSummary, checkSummary);

  return {
    confirmedLaneCount: laneSummary.confirmedLaneCount,
    evidenceCheckpoints: buildEvidenceCheckpoints(pullRequest, laneSummary, checkSummary),
    followUpQueue,
    statusLabel,
    statusTone: toStatusTone(statusLabel),
    valueSummary: pullRequest.narrative.summaryBullets.slice(0, 3)
  };
}

function summarizeLaneReview(pullRequest: CodeReviewPullRequestDetail, notebook: ReviewNotebook): LaneReviewSummary {
  const orderedLanes = orderWalkthroughLanes(pullRequest.lanes);
  const laneFollowUps = orderedLanes.flatMap((lane) => summarizeLaneEntry(lane, notebook[lane.id]));

  return {
    blockingFollowUps: dedupe(laneFollowUps.filter((value) => !value.endsWith("checkpoint not confirmed yet"))),
    confirmedLaneCount: orderedLanes.filter((lane) => notebook[lane.id].status === "confirmed").length,
    hasReviewAttention: orderedLanes.some((lane) => {
      const entry = notebook[lane.id];
      return entry.status === "needs-follow-up" || entry.concerns.trim().length > 0;
    }),
    laneCount: orderedLanes.length,
    laneFollowUps
  };
}

function summarizeLaneEntry(lane: ReviewLane, entry: ReviewNotebookEntry): string[] {
  if (entry.status === "needs-follow-up") {
    return [`${lane.title}: follow-up requested`];
  }

  if (entry.concerns.trim().length > 0) {
    return [`${lane.title}: ${entry.concerns.trim()}`];
  }

  if (entry.status !== "confirmed") {
    return [`${lane.title}: checkpoint not confirmed yet`];
  }

  return [];
}

function summarizeChecks(pullRequest: CodeReviewPullRequestDetail): CheckSummary {
  return pullRequest.checks.reduce(
    (summary, check) => {
      if (isFailedCheck(check)) {
        return {
          ...summary,
          failedCount: summary.failedCount + 1
        };
      }

      if (isPendingCheck(check)) {
        return {
          ...summary,
          pendingCount: summary.pendingCount + 1
        };
      }

      return summary;
    },
    {
      failedCount: 0,
      pendingCount: 0,
      totalCount: pullRequest.checks.length
    }
  );
}

function buildFollowUpQueue(
  pullRequest: CodeReviewPullRequestDetail,
  laneSummary: LaneReviewSummary,
  checkSummary: CheckSummary
): string[] {
  return dedupe([
    ...laneSummary.laneFollowUps,
    ...buildContextFollowUps(pullRequest),
    ...buildCheckFollowUps(checkSummary),
    ...(pullRequest.evidenceWarnings ?? []),
    ...(pullRequest.auditEvidence !== undefined && pullRequest.auditEvidence.failureCount > 0
      ? [`Audit lineage includes ${formatCount(pullRequest.auditEvidence.failureCount, "recorded failure")}.`]
      : [])
  ]);
}

function buildContextFollowUps(pullRequest: CodeReviewPullRequestDetail): string[] {
  if (pullRequest.linkedPlan === undefined) {
    return ["Link this pull request to a planning work item so review, audit, and downstream closure stay connected."];
  }

  return [
    ...(pullRequest.isDraft ? ["Pull request is still marked as draft on GitHub."] : []),
    ...(pullRequest.planningWorkItem === undefined && !hasPlanningWarning(pullRequest)
      ? [`Planning context for ${pullRequest.linkedPlan.workItemId} has not been materialized in the review workspace yet.`]
      : []),
    ...(pullRequest.auditEvidence === undefined && !hasAuditWarning(pullRequest)
      ? [`Audit lineage for ${pullRequest.linkedPlan.workItemId} is not available in the review workspace yet.`]
      : [])
  ];
}

function buildCheckFollowUps(checkSummary: CheckSummary): string[] {
  if (checkSummary.totalCount === 0) {
    return ["No reported checks were attached to this pull request."];
  }

  return [
    ...(checkSummary.failedCount > 0 ? [`${formatCount(checkSummary.failedCount, "reported check")} still need attention.`] : []),
    ...(checkSummary.pendingCount > 0 ? [`${formatCount(checkSummary.pendingCount, "check")} are still pending.`] : [])
  ];
}

function buildEvidenceCheckpoints(
  pullRequest: CodeReviewPullRequestDetail,
  laneSummary: LaneReviewSummary,
  checkSummary: CheckSummary
): TrustSummary["evidenceCheckpoints"] {
  return [
    buildReviewCoverageCheckpoint(laneSummary),
    buildPlanningCheckpoint(pullRequest),
    buildAuditCheckpoint(pullRequest),
    buildValidationCheckpoint(checkSummary),
    buildMergeCheckpoint(pullRequest)
  ];
}

function buildReviewCoverageCheckpoint(laneSummary: LaneReviewSummary): TrustSummary["evidenceCheckpoints"][number] {
  return {
    detail: `${laneSummary.confirmedLaneCount.toString()} of ${laneSummary.laneCount.toString()} walkthrough checkpoints confirmed`,
    label: "Review coverage",
    status: resolveReviewCoverageStatus(laneSummary)
  };
}

function buildPlanningCheckpoint(pullRequest: CodeReviewPullRequestDetail): TrustSummary["evidenceCheckpoints"][number] {
  if (pullRequest.planningWorkItem !== undefined) {
    return {
      detail: `${pullRequest.planningWorkItem.workItemId} is ${pullRequest.planningWorkItem.status}`,
      label: "Planning context",
      status: "complete"
    };
  }

  if (pullRequest.linkedPlan === undefined) {
    return {
      detail: "No linked work item yet",
      label: "Planning context",
      status: "pending"
    };
  }

  return {
    detail: `Waiting on ${pullRequest.linkedPlan.workItemId}`,
    label: "Planning context",
    status: "attention"
  };
}

function buildAuditCheckpoint(pullRequest: CodeReviewPullRequestDetail): TrustSummary["evidenceCheckpoints"][number] {
  if (pullRequest.auditEvidence !== undefined) {
    return {
      detail: formatCount(pullRequest.auditEvidence.runCount, "linked run"),
      label: "Audit lineage",
      status: pullRequest.auditEvidence.failureCount > 0 ? "attention" : "complete"
    };
  }

  if (pullRequest.linkedPlan === undefined) {
    return {
      detail: "No work item means no lineage",
      label: "Audit lineage",
      status: "pending"
    };
  }

  return {
    detail: `No linked audit timeline for ${pullRequest.linkedPlan.workItemId}`,
    label: "Audit lineage",
    status: "attention"
  };
}

function buildValidationCheckpoint(checkSummary: CheckSummary): TrustSummary["evidenceCheckpoints"][number] {
  if (checkSummary.failedCount > 0) {
    return {
      detail: `${checkSummary.failedCount.toString()} failed`,
      label: "Validation signals",
      status: "attention"
    };
  }

  if (checkSummary.pendingCount > 0) {
    return {
      detail: `${checkSummary.pendingCount.toString()} pending`,
      label: "Validation signals",
      status: "pending"
    };
  }

  if (checkSummary.totalCount === 0) {
    return {
      detail: "No reported checks",
      label: "Validation signals",
      status: "pending"
    };
  }

  return {
    detail: `${checkSummary.totalCount.toString()} passing`,
    label: "Validation signals",
    status: "complete"
  };
}

function buildMergeCheckpoint(pullRequest: CodeReviewPullRequestDetail): TrustSummary["evidenceCheckpoints"][number] {
  return {
    detail: formatMergePosture(pullRequest),
    label: "Merge posture",
    status: pullRequest.isDraft ? "attention" : "complete"
  };
}

function determineStatusLabel(
  pullRequest: CodeReviewPullRequestDetail,
  laneSummary: LaneReviewSummary,
  checkSummary: CheckSummary
): TrustSummary["statusLabel"] {
  if (isDecisionBlocked(pullRequest, laneSummary, checkSummary)) {
    return "Hold before decision";
  }

  if (
    laneSummary.laneCount > 0 &&
    laneSummary.confirmedLaneCount === laneSummary.laneCount &&
    pullRequest.planningWorkItem !== undefined &&
    pullRequest.auditEvidence !== undefined &&
    checkSummary.pendingCount === 0 &&
    checkSummary.failedCount === 0
  ) {
    return "Ready for human decision";
  }

  return "Gather more evidence";
}

function isDecisionBlocked(
  pullRequest: CodeReviewPullRequestDetail,
  laneSummary: LaneReviewSummary,
  checkSummary: CheckSummary
): boolean {
  return (
    pullRequest.isDraft ||
    checkSummary.failedCount > 0 ||
    laneSummary.blockingFollowUps.length > 0 ||
    (pullRequest.auditEvidence?.failureCount ?? 0) > 0 ||
    (pullRequest.evidenceWarnings ?? []).some((warning) => warning.includes("could not be loaded") || warning.includes("was not found"))
  );
}

function hasPlanningWarning(pullRequest: CodeReviewPullRequestDetail): boolean {
  return (pullRequest.evidenceWarnings ?? []).some((warning) => warning.toLowerCase().includes("planning"));
}

function hasAuditWarning(pullRequest: CodeReviewPullRequestDetail): boolean {
  return (pullRequest.evidenceWarnings ?? []).some((warning) => warning.toLowerCase().includes("audit"));
}

function isFailedCheck(check: CodeReviewPullRequestDetail["checks"][number]): boolean {
  const conclusion = check.conclusion?.toUpperCase();

  return check.status.toUpperCase() === "COMPLETED" && conclusion !== undefined && !["NEUTRAL", "SKIPPED", "SUCCESS"].includes(conclusion);
}

function isPendingCheck(check: CodeReviewPullRequestDetail["checks"][number]): boolean {
  if (check.status.toUpperCase() !== "COMPLETED") {
    return true;
  }

  return check.conclusion === undefined;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function resolveReviewCoverageStatus(laneSummary: LaneReviewSummary): TrustCheckpointStatus {
  if (laneSummary.confirmedLaneCount === laneSummary.laneCount && laneSummary.laneCount > 0) {
    return "complete";
  }

  if (laneSummary.hasReviewAttention) {
    return "attention";
  }

  return "pending";
}

function toStatusTone(statusLabel: TrustSummary["statusLabel"]): TrustSummary["statusTone"] {
  switch (statusLabel) {
    case "Ready for human decision":
      return "success";
    case "Hold before decision":
      return "warning";
    case "Gather more evidence":
      return "secondary";
  }
}

function formatMergePosture(pullRequest: CodeReviewPullRequestDetail): string {
  return pullRequest.isDraft ? `Draft PR with merge state ${pullRequest.mergeStateStatus.toLowerCase()}` : pullRequest.mergeStateStatus.toLowerCase();
}

function formatCount(count: number, label: string): string {
  return `${count.toString()} ${label}${count === 1 ? "" : "s"}`;
}

function createTagSection(title: string, files: CodeReviewChangedFile[], tag: string): ReviewLaneSection {
  return {
    files: files.filter((file) => file.tags.includes(tag)),
    title
  };
}
