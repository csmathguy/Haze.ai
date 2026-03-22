import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import { Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";

import type { ReviewEvidenceArtifactCard, ReviewEvidencePresentation, ReviewEvidenceSummary } from "../review-evidence.js";

interface ReviewEvidencePanelProps {
  readonly presentation: ReviewEvidencePresentation;
}

export function ReviewEvidencePanel({ presentation }: ReviewEvidencePanelProps) {
  return (
    <Stack spacing={2} sx={{ p: 0.5 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Proof at a glance</Typography>
        <Stack direction={{ sm: "row", xs: "column" }} flexWrap="wrap" gap={1}>
          {presentation.summaries.map((summary) => (
            <EvidenceSummaryChip key={summary.label} summary={summary} />
          ))}
        </Stack>
      </Stack>
      {presentation.heroArtifacts.length === 0 ? null : (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Review these browser artifacts first</Typography>
          <Stack direction={{ sm: "row", xs: "column" }} gap={1.25}>
            {presentation.heroArtifacts.map((artifact) => (
              <ArtifactCard icon={<PreviewOutlinedIcon fontSize="small" />} key={`hero-${artifact.label}`} artifact={artifact} />
            ))}
          </Stack>
        </Stack>
      )}
      {presentation.screenshotCards.length === 0 ? null : (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Visual confirmation</Typography>
          <Stack direction={{ sm: "row", xs: "column" }} gap={1.25}>
            {presentation.screenshotCards.map((artifact) => (
              <ArtifactCard icon={<ImageOutlinedIcon fontSize="small" />} key={`shot-${artifact.label}`} artifact={artifact} />
            ))}
          </Stack>
        </Stack>
      )}
      {presentation.sections.map((section, index) => (
        <Stack key={section.title} spacing={1.25}>
          {index === 0 && presentation.heroArtifacts.length === 0 && presentation.screenshotCards.length === 0 ? null : <Divider />}
          <Typography variant="subtitle2">{section.title}</Typography>
          {section.items.map((item) => (
            <Typography color="text.secondary" key={`${section.title}-${item}`} variant="body2">
              {item}
            </Typography>
          ))}
          {section.links?.map((link) => (
            <Button
              component="a"
              endIcon={<OpenInNewOutlinedIcon />}
              href={link.href}
              key={`${section.title}-${link.href}`}
              rel="noreferrer"
              size="small"
              sx={{ alignSelf: "flex-start" }}
              target="_blank"
              variant="outlined"
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function ArtifactCard({
  artifact,
  icon
}: {
  readonly artifact: ReviewEvidenceArtifactCard;
  readonly icon: React.ReactNode;
}) {
  return (
    <Paper sx={{ minWidth: 0, p: 1.5 }} variant="outlined">
      <Stack spacing={1}>
        <Stack alignItems="center" direction="row" gap={0.75}>
          {icon}
          <Typography variant="subtitle2">{artifact.label}</Typography>
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {artifact.caption}
        </Typography>
        {artifact.location === undefined ? null : (
          <Typography color="text.secondary" variant="caption">
            {artifact.location}
          </Typography>
        )}
        {artifact.href === undefined ? null : (
          <Button
            component="a"
            endIcon={<OpenInNewOutlinedIcon />}
            href={artifact.href}
            rel="noreferrer"
            size="small"
            sx={{ alignSelf: "flex-start" }}
            target="_blank"
            variant="outlined"
          >
            Open artifact
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function EvidenceSummaryChip({ summary }: { readonly summary: ReviewEvidenceSummary }) {
  return (
    <Chip
      color={getChipColor(summary.status)}
      label={`${summary.label}: ${summary.detail}`}
      sx={{ justifyContent: "flex-start", maxWidth: "100%", px: 0.5 }}
      variant={summary.status === "available" ? "filled" : "outlined"}
    />
  );
}

function getChipColor(status: ReviewEvidenceSummary["status"]): "default" | "error" | "info" | "success" | "warning" {
  switch (status) {
    case "available":
      return "success";
    case "missing":
      return "warning";
    case "partial":
      return "info";
  }
}
