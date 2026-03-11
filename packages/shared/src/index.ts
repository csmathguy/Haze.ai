export type DocumentKind =
  | "bank-interest"
  | "charitable-donation"
  | "income-summary"
  | "property-tax"
  | "retirement-distribution"
  | "unknown";

const SUPPORTED_DOCUMENT_KINDS: readonly DocumentKind[] = [
  "bank-interest",
  "charitable-donation",
  "income-summary",
  "property-tax",
  "retirement-distribution"
];

export function isSupportedDocumentKind(value: string): value is DocumentKind {
  return SUPPORTED_DOCUMENT_KINDS.includes(value as DocumentKind);
}

export function normalizeImportedText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}
