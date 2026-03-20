import type { KnowledgeEntry } from "@taxes/shared";

export function summarizeEntryPresentation(entry: KnowledgeEntry): { title: string } {
  return {
    title: entry.title
  };
}
