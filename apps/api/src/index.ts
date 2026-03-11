import type { DocumentKind } from "@taxes/shared";

export interface ExtractionJobSummary {
  readonly receivedKind: DocumentKind;
  readonly requiresManualReview: boolean;
}

export function planExtractionJob(receivedKind: DocumentKind): ExtractionJobSummary {
  return {
    receivedKind,
    requiresManualReview: receivedKind === "unknown"
  };
}
