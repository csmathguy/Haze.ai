# Source Selection

## Source Order

Use the highest-authority source that can answer the question:

1. Statutes, regulations, official specifications, or vendor primary docs
2. Official implementation guides, manuals, or bulletins
3. Maintainer-authored examples and release notes
4. Reputable secondary analysis only when primary sources are incomplete

For high-stakes areas such as tax, legal, security, privacy, or financial advice, stay in tiers 1 and 2 whenever possible.

## Research Setup

Capture these before searching:

- research question
- audience
- jurisdiction
- tax year or version
- date reviewed
- knowledge namespace or subject, when the topic should live in long-term memory
- required output shape

Before web search, inspect the local knowledge base for prior reports on the same topic so the new run can improve existing knowledge instead of duplicating it.

## Research Output Shape

Every research note should leave behind:

- a one-paragraph answer
- the sources used
- the exact dates or versions that matter
- what changed from prior knowledge, if the topic was already researched
- any source conflicts
- what remains unresolved
- a consolidated `research-report` knowledge entry when the result is durable

## Escalation Heuristics

- If a source is time-sensitive, re-check it even if you think you know the answer.
- If two official sources appear to conflict, record both and narrow by date, scope, or authority level.
- If the research will drive code or workflow changes, turn the conclusion into documentation or a skill update.
- If the topic already exists in knowledge, update the existing report unless the new work is intentionally a separate report lineage.
