import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { Alert, Button, Chip, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import type { CodeReviewPullRequestDetail } from "@taxes/shared";

import { formatPullRequestState } from "../index.js";

interface PullRequestOverviewPanelProps {
  readonly pullRequest: CodeReviewPullRequestDetail;
}

export function PullRequestOverviewPanel({ pullRequest }: PullRequestOverviewPanelProps) {
  const overviewWarnings = buildOverviewWarnings(pullRequest);

  return (
    <Paper sx={{ p: 3 }} variant="outlined">
      <Stack spacing={2}>
        <OverviewHeader pullRequest={pullRequest} />
        <OverviewStats pullRequest={pullRequest} />
        <Typography color="text.secondary" variant="body1">
          {pullRequest.trustStatement}
        </Typography>
        <OverviewWarnings warnings={overviewWarnings} />
        <Divider />
        <OverviewGrid pullRequest={pullRequest} />
      </Stack>
    </Paper>
  );
}

function OverviewHeader({ pullRequest }: PullRequestOverviewPanelProps) {
  return (
    <Stack direction={{ md: "row", xs: "column" }} justifyContent="space-between" spacing={2}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">PR #{pullRequest.number.toString()} | {formatPullRequestState(pullRequest.state, pullRequest.isDraft)}</Typography>
        <Typography variant="h2">{pullRequest.title}</Typography>
        <Typography color="text.secondary" variant="body2">
          {pullRequest.author.name ?? pullRequest.author.login} | {pullRequest.headRefName} -&gt; {pullRequest.baseRefName}
        </Typography>
      </Stack>
      <Stack alignItems={{ md: "flex-end", xs: "flex-start" }} spacing={1}>
        <Button component="a" endIcon={<OpenInNewOutlinedIcon />} href={pullRequest.url} rel="noreferrer" target="_blank" variant="outlined">
          Open on GitHub
        </Button>
        {pullRequest.linkedPlan === undefined ? null : (
          <Button
            component="a"
            endIcon={<OpenInNewOutlinedIcon />}
            href={pullRequest.linkedPlan.url}
            rel="noreferrer"
            target="_blank"
            variant="outlined"
          >
            Open {pullRequest.linkedPlan.workItemId}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function OverviewStats({ pullRequest }: PullRequestOverviewPanelProps) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      <Chip label={`${pullRequest.stats.fileCount.toString()} files`} size="small" variant="outlined" />
      <Chip label={`+${pullRequest.stats.totalAdditions.toString()} / -${pullRequest.stats.totalDeletions.toString()}`} size="small" variant="outlined" />
      <Chip label={`${pullRequest.checks.length.toString()} checks`} size="small" variant="outlined" />
      <Chip label={`merge state: ${pullRequest.mergeStateStatus.toLowerCase()}`} size="small" variant="outlined" />
    </Stack>
  );
}

function OverviewWarnings({ warnings }: { readonly warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Alert severity="warning">
      <Stack spacing={0.5}>
        {warnings.map((warning) => (
          <Typography key={warning} variant="body2">
            {warning}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}

function OverviewGrid({ pullRequest }: PullRequestOverviewPanelProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ md: 6, xs: 12 }}>
        <NarrativeBlock items={pullRequest.narrative.summaryBullets} title="Purpose and value" />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <NarrativeBlock items={pullRequest.narrative.reviewFocus} title="Review focus" />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <NarrativeBlock items={pullRequest.narrative.risks} title="Risks" />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <NarrativeBlock
          items={pullRequest.narrative.validationCommands.length > 0 ? pullRequest.narrative.validationCommands : ["No explicit commands were listed in the PR body."]}
          title="Validation commands"
        />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <EvidenceCard chips={buildPlanningChips(pullRequest)} details={buildPlanningDetails(pullRequest)} title="Planning context" />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <EvidenceCard chips={buildAuditChips(pullRequest)} details={buildAuditDetails(pullRequest)} title="Audit evidence" />
      </Grid>
    </Grid>
  );
}

function buildOverviewWarnings(pullRequest: CodeReviewPullRequestDetail): string[] {
  return [
    ...(pullRequest.linkedPlan === undefined
      ? ["Add a PLAN reference in the branch name or PR body so the review can anchor to planning and audit lineage."]
      : []),
    ...(pullRequest.evidenceWarnings ?? [])
  ];
}

function buildPlanningChips(pullRequest: CodeReviewPullRequestDetail): string[] {
  if (pullRequest.planningWorkItem === undefined) {
    return [pullRequest.linkedPlan === undefined ? "No linked work item" : `Waiting on ${pullRequest.linkedPlan.workItemId}`];
  }

  return [
    pullRequest.planningWorkItem.workItemId,
    pullRequest.planningWorkItem.status,
    `${pullRequest.planningWorkItem.tasks.completeCount.toString()}/${pullRequest.planningWorkItem.tasks.totalCount.toString()} tasks`,
    `${pullRequest.planningWorkItem.acceptanceCriteria.completeCount.toString()}/${pullRequest.planningWorkItem.acceptanceCriteria.totalCount.toString()} criteria`
  ];
}

function buildPlanningDetails(pullRequest: CodeReviewPullRequestDetail): string[] {
  if (pullRequest.planningWorkItem === undefined) {
    return [
      pullRequest.linkedPlan === undefined
        ? "This pull request is not linked to a planning work item yet."
        : `The review knows about ${pullRequest.linkedPlan.workItemId}, but the richer planning context is not available in the workspace.`
    ];
  }

  return [
    pullRequest.planningWorkItem.title,
    pullRequest.planningWorkItem.summary,
    ...(pullRequest.planningWorkItem.owner === undefined ? [] : [`Owner: ${pullRequest.planningWorkItem.owner}`]),
    ...buildPlanRunDetails(pullRequest)
  ];
}

function buildPlanRunDetails(pullRequest: CodeReviewPullRequestDetail): string[] {
  const latestPlanRun = pullRequest.planningWorkItem?.latestPlanRun;

  if (latestPlanRun === undefined) {
    return [];
  }

  return [
    `Plan run: ${latestPlanRun.completedStepCount.toString()}/${latestPlanRun.totalStepCount.toString()} steps complete`,
    ...(latestPlanRun.currentStepTitle === undefined ? [] : [`Current step: ${latestPlanRun.currentStepTitle}`])
  ];
}

function buildAuditChips(pullRequest: CodeReviewPullRequestDetail): string[] {
  if (pullRequest.auditEvidence === undefined) {
    return [pullRequest.linkedPlan === undefined ? "No linked lineage" : "Audit timeline missing"];
  }

  return [
    `${pullRequest.auditEvidence.runCount.toString()} runs`,
    `${pullRequest.auditEvidence.failureCount.toString()} failures`,
    `${pullRequest.auditEvidence.handoffCount.toString()} handoffs`
  ];
}

function buildAuditDetails(pullRequest: CodeReviewPullRequestDetail): string[] {
  if (pullRequest.auditEvidence === undefined) {
    return [
      pullRequest.linkedPlan === undefined
        ? "Audit lineage appears after the pull request is tied back to a planning work item."
        : `No audit evidence is currently materialized for ${pullRequest.linkedPlan.workItemId}.`
    ];
  }

  return [
    `Active agents: ${pullRequest.auditEvidence.activeAgents.join(", ") || "none recorded"}`,
    `Workflows: ${pullRequest.auditEvidence.workflows.join(", ") || "none recorded"}`,
    ...buildRecentRunDetails(pullRequest)
  ];
}

function buildRecentRunDetails(pullRequest: CodeReviewPullRequestDetail): string[] {
  const recentRun = pullRequest.auditEvidence?.recentRuns[0];

  return recentRun === undefined ? [] : [`Latest run: ${recentRun.workflow} (${recentRun.status})`];
}

function NarrativeBlock({ items, title }: { readonly items: string[]; readonly title: string }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>
      {items.map((item) => (
        <Typography key={item} variant="body2">
          {item}
        </Typography>
      ))}
    </Stack>
  );
}

function EvidenceCard({ chips, details, title }: { readonly chips: string[]; readonly details: string[]; readonly title: string }) {
  return (
    <Paper
      sx={(theme) => ({
        background: `linear-gradient(180deg, ${alpha(theme.palette.secondary.main, 0.06)}, ${alpha(theme.palette.background.paper, 0.92)})`,
        p: 2
      })}
      variant="outlined"
    >
      <Stack spacing={1.25}>
        <Typography variant="subtitle2">{title}</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {chips.map((chip) => (
            <Chip key={`${title}-${chip}`} label={chip} size="small" variant="outlined" />
          ))}
        </Stack>
        {details.map((detail) => (
          <Typography key={`${title}-${detail}`} variant="body2">
            {detail}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}
