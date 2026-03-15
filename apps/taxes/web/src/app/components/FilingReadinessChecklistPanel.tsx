import { Alert, Chip, Stack, Typography } from "@mui/material";
import type { WorkspaceSnapshot } from "@taxes/shared";

import { PanelCard } from "./PanelCard.js";

interface FilingReadinessChecklistPanelProps {
  readonly checklist: WorkspaceSnapshot["filingChecklist"];
}

export function FilingReadinessChecklistPanel({ checklist }: FilingReadinessChecklistPanelProps) {
  return (
    <PanelCard>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="h5">Filing readiness checklist</Typography>
          <Typography color="text.secondary" variant="body2">
            {`Tax year ${checklist.taxYear.toString()} for ${checklist.stateResidence}. Track required records before detailed review.`}
          </Typography>
        </Stack>
        {checklist.differsByJurisdiction ? (
          <Alert severity="warning">Federal and state readiness currently differ. Resolve missing state-specific records before filing.</Alert>
        ) : null}
        <Stack direction={{ lg: "row", xs: "column" }} spacing={2.5}>
          <ChecklistSection section={checklist.federal} />
          <ChecklistSection section={checklist.state} />
        </Stack>
      </Stack>
    </PanelCard>
  );
}

interface ChecklistSectionProps {
  readonly section: WorkspaceSnapshot["filingChecklist"]["federal"];
}

function ChecklistSection({ section }: ChecklistSectionProps) {
  return (
    <Stack flex={1} spacing={1.5}>
      <Stack alignItems="center" direction="row" justifyContent="space-between">
        <Typography sx={{ textTransform: "capitalize" }} variant="h6">
          {section.jurisdiction}
        </Typography>
        <Chip color={getReadinessColor(section.readiness)} label={formatReadinessLabel(section.readiness)} size="small" />
      </Stack>
      {section.items.map((item) => (
        <Stack key={item.id} spacing={0.8}>
          <Stack alignItems="center" direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">{item.label}</Typography>
            <Chip color={getItemStatusColor(item.status)} label={item.status} size="small" sx={{ textTransform: "capitalize" }} />
          </Stack>
          <Stack alignItems="center" direction="row" spacing={1}>
            <Chip
              color={item.blocker ? "warning" : "default"}
              label={item.blocker ? "blocking item" : "optional item"}
              size="small"
              variant="outlined"
            />
            <Typography color="text.secondary" variant="caption">
              {item.presentDocumentIds.length === 0
                ? "No matching records uploaded"
                : `${item.presentDocumentIds.length.toString()} matching record(s) uploaded`}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function getReadinessColor(
  readiness: WorkspaceSnapshot["filingChecklist"]["federal"]["readiness"]
): "error" | "success" | "warning" {
  if (readiness === "ready") {
    return "success";
  }

  if (readiness === "needs-review") {
    return "warning";
  }

  return "error";
}

function getItemStatusColor(
  status: WorkspaceSnapshot["filingChecklist"]["federal"]["items"][number]["status"]
): "error" | "success" | "warning" {
  if (status === "present") {
    return "success";
  }

  if (status === "incomplete") {
    return "warning";
  }

  return "error";
}

function formatReadinessLabel(readiness: WorkspaceSnapshot["filingChecklist"]["federal"]["readiness"]): string {
  if (readiness === "ready") {
    return "Ready";
  }

  if (readiness === "needs-review") {
    return "Needs review";
  }

  return "Needs documents";
}
