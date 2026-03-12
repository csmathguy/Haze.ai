import type { AuditSummary, WorkflowStatus } from "./audit.js";
import type { PullRequestArea, PullRequestDraft } from "./pull-request-draft.js";

export interface CompletionRequirements {
  requiresCleanWorktree: boolean;
  requiresPullRequest: boolean;
}

export interface PullRequestBodyInput {
  draft: PullRequestDraft;
  privacyConfirmed: boolean;
  summary: string;
  validationCommands: string[];
  value: string;
}

export function buildPullRequestBody(input: PullRequestBodyInput): string {
  const affectedAreas = input.draft.areas.map(renderArea).join("\n");
  const reviewOrder = input.draft.reviewOrder.map((item, index) => `${String(index + 1)}. ${item}`).join("\n");
  const reviewFocus = input.draft.reviewFocus.map((item) => `- ${item}`).join("\n");
  const risks = input.draft.risks.map((item) => `- ${item}`).join("\n");
  const validationChecklist = renderValidationChecklist(input.validationCommands);
  const commandsRun = renderCommandsRun(input.validationCommands);
  const privacyMark = input.privacyConfirmed ? "x" : " ";

  return [
    "## Summary",
    "",
    `- ${input.summary}`,
    `- ${input.value}`,
    "",
    "## What Changed",
    "",
    affectedAreas,
    "",
    "## Review Order",
    "",
    reviewOrder,
    "",
    "## Review Focus",
    "",
    reviewFocus,
    "",
    "## Risks",
    "",
    risks,
    "",
    "## Validation",
    "",
    validationChecklist,
    "",
    "Commands run:",
    "",
    commandsRun,
    "",
    "## Privacy",
    "",
    `- [${privacyMark}] No private tax documents, extracted data, or generated filings were added to the repository`,
    `- [${privacyMark}] Any screenshots or logs avoid SSNs, EINs, bank numbers, addresses, and full document contents`
  ].join("\n");
}

export function collectValidationCommands(summary: Pick<AuditSummary, "steps"> | null): string[] {
  return collectValidationCommandsFromSummaries(summary === null ? [] : [summary]);
}

export function collectValidationCommandsFromSummaries(summaries: Pick<AuditSummary, "steps">[]): string[] {
  const seen = new Set<string>();
  const commands: string[] = [];

  for (const summary of summaries) {
    appendUniqueValidationCommands(summary, seen, commands);
  }

  return commands;
}

function appendUniqueValidationCommands(
  summary: Pick<AuditSummary, "steps">,
  seen: Set<string>,
  commands: string[]
): void {
  for (const step of summary.steps) {
    const command = step.command.join(" ").trim();

    if (command.length === 0 || seen.has(command)) {
      continue;
    }

    seen.add(command);
    commands.push(command);
  }
}

export function getCompletionRequirements(input: {
  commitsAhead: number;
  status: WorkflowStatus;
  workflow: string;
  worktreeDirty: boolean;
}): CompletionRequirements {
  const isSuccessfulImplementation = input.workflow === "implementation" && input.status === "success";

  if (!isSuccessfulImplementation) {
    return {
      requiresCleanWorktree: false,
      requiresPullRequest: false
    };
  }

  return {
    requiresCleanWorktree: true,
    requiresPullRequest: input.commitsAhead > 0
  };
}

export function createMissingPullRequestMessage(): string {
  return "Create or update the branch pull request with `node tools/runtime/run-npm.cjs run pr:sync -- --summary \"...\" --value \"...\" --privacy-confirmed` before closing the workflow.";
}

export function createDirtyWorktreeMessage(): string {
  return "Successful implementation workflows require a clean worktree. Create atomic commits before closing the workflow.";
}

function renderArea(area: PullRequestArea): string {
  const details = renderAreaDetails(area);
  const files = area.files.map((file) => `  - \`${file}\``).join("\n");

  return details === undefined ? `### ${area.title}\n${files}` : `### ${area.title}\n${details}\n${files}`;
}

function renderValidationChecklist(commands: string[]): string {
  if (commands.length === 0) {
    return "- [ ] Validation commands could not be inferred automatically. Add the exact commands before merging.";
  }

  return commands.map((command) => `- [x] \`${command}\``).join("\n");
}

function renderCommandsRun(commands: string[]): string {
  if (commands.length === 0) {
    return "- No audited validation commands were found for the selected workflow.";
  }

  return commands.map((command) => `- \`${command}\``).join("\n");
}

function renderAreaDetails(area: PullRequestArea): string | undefined {
  const details = area.details;

  if (details === undefined) {
    return undefined;
  }

  return details.map((detail) => `  - ${detail}`).join("\n");
}
