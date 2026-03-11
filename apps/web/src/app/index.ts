import type { DocumentKind } from "@taxes/shared";

export interface ReviewBannerState {
  readonly emphasis: "info" | "warning";
  readonly message: string;
}

export function buildReviewBanner(kind: DocumentKind): ReviewBannerState {
  if (kind === "unknown") {
    return {
      emphasis: "warning",
      message: "Review needed before the imported values can be trusted."
    };
  }

  return {
    emphasis: "info",
    message: "Imported values are ready for field-by-field review."
  };
}
