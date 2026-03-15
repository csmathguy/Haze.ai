# Context Minimization Strategy

> Sourced research — 2026-03-15. See `docs/research-sources.md` for citations.

## Overview

Agents perform best when given "the smallest set of high-signal tokens" rather than maximum available context. Empirical work shows **context rot**: accuracy degrades as token count grows, with some models showing severe drops beyond 1,000–2,000 tokens of context on specific tasks (arXiv 2509.21361, October 2025).

The goal is not to shrink context arbitrarily but to eliminate tokens the agent cannot use productively — redundant tool outputs, irrelevant history, unrelated files.

---

## Core Principle: Prefer Raw Over Compacted Over Summarized

When context grows too large, apply strategies in this order:

1. **Raw history** — keep it all if you fit within the window
2. **Observation masking / compaction** — strip recoverable or redundant content (tool outputs, file reads the agent can reload) without rewriting
3. **Summarization** — lossy LLM rewriting of history; use only when compaction alone is insufficient

**Why avoid summarization first?** JetBrains/NeurIPS (December 2025) found that LLM summarization led agents to run 15% longer than observation masking because summaries hide stop signals, causing agents to continue without solving problems better. For coding agents, exact file paths, line numbers, and error codes must survive context management — summarization risks losing them.

---

## Pattern A: File Discovery Pre-Pass

**Problem:** Agents load the entire codebase into context when they only need a few files.

**Solution:** A two-stage approach — cheap Haiku-tier model identifies relevant files first; main agent receives only those files.

### Implementation

```typescript
// tools/agent/file-discovery.ts
interface FileCandidate {
  path: string;
  relevanceScore: number; // 0–1
  reason: string;
}

async function discoverRelevantFiles(
  task: string,
  allFiles: string[]
): Promise<FileCandidate[]> {
  // Use Tier 1 (Haiku) for this pre-pass — cheap, fast, sufficient
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Given this task: "${task}"

Rank these files by relevance (score 0–1). Return JSON array of
{path, relevanceScore, reason}. Only include files likely needed.

Files:
${allFiles.join("\n")}`
    }]
  });

  return JSON.parse(response.content[0].text) as FileCandidate[];
}
```

**Routing notes:**
- Use **pointwise ranking** (query + single file → score) for first-pass efficiency
- Reserve pairwise/listwise ranking only for tie-breaking on top candidates
- Top 5–10 files is typically sufficient; pass file paths, not file contents, to the orchestrator

**Integration points:**
- `skills/implementation-workflow` — add as an optional pre-step
- `skills/parallel-work-implementer` — run before spawning implementer agents
- See PLAN-105 for the full file-discovery agent work item

---

## Pattern B: Observation Masking (Compaction)

**Problem:** Long agent runs accumulate verbose tool outputs (grep results, full file reads) that inflate context without adding value on subsequent turns.

**Solution:** Strip recoverable content from older turns, preserving action reasoning and decisions.

### What to strip

- Tool outputs longer than ~100 lines → truncate to first 50 lines + `[...truncated — re-read if needed]`
- File contents that have not been edited (agent can re-read via tool)
- Repeated identical tool outputs

### What to preserve

- All user messages
- All assistant reasoning and decisions
- Tool selections and their arguments (what the agent *chose* to do)
- Error messages and stack traces (exact text matters)
- File paths and line numbers

```typescript
// tools/context-management/compact-history.ts
export function compactMessageHistory(
  messages: Message[],
  maxTokens: number
): Message[] {
  if (estimateTokens(messages) <= maxTokens) return messages;

  return messages.map((msg) => {
    if (msg.role !== "tool" || !msg.content) return msg;
    const content = String(msg.content);
    if (content.length <= 2000) return msg;

    return {
      ...msg,
      content: content.slice(0, 2000) + "\n[...truncated — re-read if needed]"
    };
  });
}
```

**Never use LLM summarization** for this repository's agent workflows. Observation masking preserves determinism at a fraction of the cost.

---

## Pattern C: Just-in-Time Context Loading

**Problem:** Skills and workflows pre-load many files into the initial prompt "just in case."

**Solution:** Start with a lightweight task manifest; load files via tool calls only when needed.

### Task manifest format

```typescript
// Passed to agent at workflow start instead of full file contents
const taskManifest = {
  workItemId: "PLAN-123",
  taskDescription: "Add token telemetry to execution spans",
  primaryFiles: [
    "tools/agent/lib/audit.ts",
    "tools/agent/lib/audit-context.ts"
  ],
  relatedContext: [
    "docs/agent-observability.md"  // Read this for background, not injected
  ],
  excludePatterns: [
    "node_modules/**", "build/**", "dist/**", "coverage/**", "*.log"
  ]
};
```

The agent reads files on demand via tool calls rather than receiving all content upfront. Strategic file exclusion (node_modules, build artifacts) alone can reduce context consumption by 80%+.

---

## Pattern D: Structured Handoff Summaries

**Problem:** At agent-to-agent boundaries, agents either pass too much context (full conversation history) or too little (bare instructions).

**Solution:** Structured handoff document — approximately 500 tokens — written to a file and read by the receiving agent.

### Handoff schema

```typescript
// packages/shared/src/agent-handoff.ts
import { z } from "zod";

export const AgentHandoffSchema = z.object({
  sourceAgent: z.string(),
  targetAgent: z.string(),
  workItemId: z.string(),
  summary: z.string().max(2000),       // ~500 tokens — what was done and why
  filesPassed: z.array(z.string()),    // specific file paths to review
  decisionsMade: z.array(z.string()), // key choices the next agent should respect
  openQuestions: z.array(z.string()), // unresolved items for the next agent
  confidence: z.enum(["high", "medium", "low"]),
  nextSteps: z.array(z.string())
});

export type AgentHandoff = z.infer<typeof AgentHandoffSchema>;
```

### Usage pattern

```typescript
// In orchestrator — write handoff before invoking next agent
const handoff: AgentHandoff = {
  sourceAgent: "implementation-workflow",
  targetAgent: "code-reviewer",
  workItemId: "PLAN-101",
  summary: "Added inputTokens/outputTokens/modelId to execution-end events. " +
           "Used existing metadata JSON field — no schema migration. " +
           "Pricing constants added to tools/agent/lib/audit.ts.",
  filesPassed: ["tools/agent/lib/audit.ts", "docs/agent-observability.md"],
  decisionsMade: ["Used metadata field to avoid migration", "Pricing is approximate"],
  openQuestions: ["Should estimatedCostUsd be stored in cents to avoid float?"],
  confidence: "high",
  nextSteps: ["Review architecture boundary compliance", "Check privacy (no PII in token logs)"]
};

await fs.writeFile(`.agent-handoff.${workItemId}.json`, JSON.stringify(handoff, null, 2));
```

**Why file-based?** File handoffs create an audit trail, reduce context overhead, and simplify debugging vs. direct context passing. Each subagent receives a fresh 200K token window with only the required inputs.

---

## Pattern E: Context Profiles Per Skill

Define what goes in (and what stays out) per task type. Implemented as annotations in skill frontmatter and the model selection strategy doc.

| Task type | Files passed | History depth | Model tier |
|---|---|---|---|
| File search / triage | File list only | None | Tier 1 (Haiku) |
| Research / summarization | URLs / file paths | None | Tier 1 (Haiku) |
| Code review | Changed files + AGENTS.md | Last 5 turns | Tier 2 (Sonnet) |
| Bug fix | Failing test + stack trace + 2–3 relevant files | Last 10 turns | Tier 2 (Sonnet) |
| Feature implementation | Task manifest + discovered files | Last 10 turns | Tier 2 (Sonnet) |
| Orchestration / decomposition | Full task brief + work item list | Full session | Tier 3 (Opus) |

---

## Empirical Guidance

- **MECW (Maximum Effective Context Window)** differs drastically from the maximum context window and shifts by problem type. GPT-5 shows near-0% hallucinations under 500 tokens but 99% at 2,000 tokens on some tasks (arXiv 2509.21361).
- **Claude Code** uses 5.5x fewer tokens than Cursor for equivalent tasks, partly through better context management.
- **Hub-and-spoke topology**: parent-to-subagent communication flows exclusively through the Agent tool prompt string. Required file paths, decisions, and error messages must be included explicitly — subagents do not inherit parent context.
- **`context: fork`** in skill frontmatter isolates skill execution from the main agent context, preventing accumulation.

---

## What Not to Do

- Do not inject full file contents into system prompts "just in case"
- Do not use LLM summarization to compress coding agent history — use observation masking instead
- Do not pass full conversation history across agent boundaries — use the handoff schema
- Do not discover files inside the main agent when a Haiku pre-pass can do it cheaper

---

## Implementation Roadmap

| Work item | What | Status |
|---|---|---|
| PLAN-104 | This doc (research spike) | Done |
| PLAN-105 | File discovery pre-pass agent | Backlog |
| PLAN-106 | Model router + provider factory | Backlog |
| PLAN-101 | Token telemetry in audit spans | Backlog |

---

## Sources

- Anthropic engineering, "Effective context engineering for AI agents," 2025
- JetBrains Research / NeurIPS DL4Code workshop, "Cutting Through the Noise," December 2025
- arXiv 2509.21361, "Context Is What You Need: The Maximum Effective Context Window," October 2025
- Skywork AI, "Best Practices for Multi-Agent Orchestration and Reliable Handoffs," 2025
- Morph LLM, "Compaction vs Summarization: Agent Context Management Compared," 2025

Full citations in `docs/research-sources.md`.
