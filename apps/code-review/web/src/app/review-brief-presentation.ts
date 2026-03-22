import type { CodeReviewPullRequestDetail } from "@taxes/shared";

import { formatPullRequestState } from "./index.js";

export interface ReviewBriefPresentation {
  readonly contextSummary: string[];
  readonly inspectFirst: string[];
  readonly missingEvidence: string[];
  readonly nextStepTitle: string;
  readonly startHere: string[];
  readonly statusLabel: string;
  readonly summary: string;
  readonly title: string;
  readonly whatThisPrDoes: string[];
}

export function buildReviewBriefPresentation(
  pullRequest: CodeReviewPullRequestDetail,
  currentStageTitle: string
): ReviewBriefPresentation {
  const statusLabel = formatPullRequestState(pullRequest.state, pullRequest.isDraft);
  const content = resolveReviewBriefContent(pullRequest, currentStageTitle);

  return {
    contextSummary: buildContextSummary(pullRequest),
    inspectFirst: content.inspectFirst,
    missingEvidence: content.missingEvidence,
    nextStepTitle: currentStageTitle,
    startHere: content.startHere,
    statusLabel,
    summary: content.summary,
    title: pullRequest.planningWorkItem?.title ?? pullRequest.title,
    whatThisPrDoes: content.whatThisPrDoes
  };
}

function buildContextSummary(pullRequest: CodeReviewPullRequestDetail): string[] {
  const items = [
    `PR ${pullRequest.number.toString()} is ${formatPullRequestState(pullRequest.state, pullRequest.isDraft).toLowerCase()}.`,
    ...(pullRequest.linkedPlan === undefined ? ["No linked planning work item yet."] : [`Linked work item: ${pullRequest.linkedPlan.workItemId}.`])
  ];

  if (pullRequest.planningWorkItem?.latestPlanRun?.currentStepTitle !== undefined) {
    items.push(`Current plan step: ${pullRequest.planningWorkItem.latestPlanRun.currentStepTitle}.`);
  }

  return items;
}

function fallbackInspectFirst(pullRequest: CodeReviewPullRequestDetail): string[] {
  return pullRequest.lanes
    .flatMap((lane) => lane.highlights.slice(0, 1))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);
}

function fallbackStartHere(pullRequest: CodeReviewPullRequestDetail, currentStageTitle: string): string[] {
  return [
    `Read the PR goal before reviewing code: ${pullRequest.narrative.valueSummary}`,
    `Finish the current step: ${currentStageTitle}.`,
    ...(pullRequest.linkedPlan === undefined ? ["Link the PR to a work item before final approval."] : [])
  ];
}

function fallbackWhatThisPrDoes(pullRequest: CodeReviewPullRequestDetail): string[] {
  return [
    ...pullRequest.narrative.summaryBullets.slice(0, 3),
    ...pullRequest.narrative.whatChangedSections.map((section) => `${section.title}: ${section.items.join(", ")}`).slice(0, 1)
  ].filter((value, index, values) => values.indexOf(value) === index);
}

function resolveReviewBriefContent(pullRequest: CodeReviewPullRequestDetail, currentStageTitle: string): {
  readonly inspectFirst: string[];
  readonly missingEvidence: string[];
  readonly startHere: string[];
  readonly summary: string;
  readonly whatThisPrDoes: string[];
} {
  const reviewBrief = pullRequest.reviewBrief;

  if (reviewBrief !== undefined) {
    return {
      inspectFirst: reviewBrief.inspectFirst,
      missingEvidence: reviewBrief.missingEvidence,
      startHere: reviewBrief.startHere,
      summary: reviewBrief.summary,
      whatThisPrDoes: reviewBrief.whatThisPrDoes
    };
  }

  return {
    inspectFirst: fallbackInspectFirst(pullRequest),
    missingEvidence: [],
    startHere: fallbackStartHere(pullRequest, currentStageTitle),
    summary: pullRequest.narrative.valueSummary,
    whatThisPrDoes: fallbackWhatThisPrDoes(pullRequest)
  };
}
