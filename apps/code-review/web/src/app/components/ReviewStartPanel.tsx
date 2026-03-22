import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import type { ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import type { CodeReviewPullRequestDetail } from "@taxes/shared";

import { buildReviewBriefPresentation } from "../review-brief-presentation.js";

interface ReviewStartPanelProps {
  readonly pullRequest: CodeReviewPullRequestDetail;
  readonly stageTitle: string;
}

export function ReviewStartPanel({ pullRequest, stageTitle }: ReviewStartPanelProps) {
  const presentation = buildReviewBriefPresentation(pullRequest, stageTitle);

  return (
    <Paper
      sx={(theme) => ({
        background: `linear-gradient(180deg, ${alpha(theme.palette.secondary.main, 0.06)}, ${theme.palette.background.paper})`,
        p: 2.5
      })}
      variant="outlined"
    >
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="subtitle2">Start here</Typography>
          <Typography variant="h3">{presentation.title}</Typography>
          <Typography color="text.secondary" variant="body2">
            {presentation.summary}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Status: {presentation.statusLabel}
          </Typography>
        </Stack>

        <Paper
          sx={(theme) => ({
            backgroundColor: alpha(theme.palette.background.default, 0.7),
            p: 1.75
          })}
          variant="outlined"
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2">Do this next</Typography>
            {presentation.startHere.map((item, index) => (
              <Typography key={item} variant="body2">
                {(index + 1).toString()}. {item}
              </Typography>
            ))}
            <Typography color="text.secondary" variant="body2">
              Current checkpoint: {presentation.nextStepTitle}
            </Typography>
          </Stack>
        </Paper>

        <Stack direction={{ sm: "row", xs: "column" }} spacing={1}>
          <Button component="a" endIcon={<OpenInNewOutlinedIcon />} href={pullRequest.url} rel="noreferrer" target="_blank" variant="contained">
            Open PR on GitHub
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

        {pullRequest.linkedPlan === undefined ? (
          <Alert severity="warning">Link this PR to a planning work item before final approval so the reviewer can verify intent.</Alert>
        ) : null}

        <OptionalSection
          description="Only open this if you need more context before moving into the walkthrough."
          title="Need more context?"
        >
          <Stack spacing={1.5}>
            <BulletSection items={presentation.whatThisPrDoes} title="What this PR does" />
            <BulletSection items={presentation.inspectFirst} title="Inspect first" />
            {presentation.missingEvidence.length > 0 ? <BulletSection items={presentation.missingEvidence} title="Missing evidence" /> : null}
            <BulletSection items={presentation.contextSummary} title="Review context" />
          </Stack>
        </OptionalSection>
      </Stack>
    </Paper>
  );
}

function OptionalSection({
  children,
  description,
  title
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <Accordion disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography color="text.secondary" variant="body2">
            {description}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

function BulletSection({ items, title }: { readonly items: string[]; readonly title: string }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2">{title}</Typography>
      {items.map((item) => (
        <Typography key={`${title}-${item}`} variant="body2">
          {item}
        </Typography>
      ))}
    </Stack>
  );
}
