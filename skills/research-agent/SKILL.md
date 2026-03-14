---
name: research-agent
description: Use this skill when researching a topic, comparing sources, verifying dated claims, or turning external guidance into repository documentation, workflows, or new agent skills. Apply it for tax-law questions, documentation best-practice research, standards reviews, vendor/tool evaluation, and any task where source quality, recency, and citation discipline matter.
---

# Research Agent

## Overview

This skill turns ad hoc web searching into a dated, source-ranked workflow that another agent can repeat. Use it when the output needs to stand up as documentation, design input, implementation guidance, or tax-law research notes.

## Workflow

1. Define the research target in one sentence.
2. Capture the constraints that change the answer: jurisdiction, tax year, product version, audience, and review date.
3. Read `references/source-selection.md` before gathering material.
4. Build a source plan that starts with primary sources and only uses secondary commentary to fill gaps.
5. Read multiple sources and separate direct facts from your own inference.
6. Record exact dates for any time-sensitive claim.
7. If the output will become repository documentation, read `references/documentation-output.md`.
8. If the topic touches tax law, IRS guidance, or filing rules, read `references/tax-law-research.md`.
9. Produce a result with:
   - a short answer or decision
   - the key facts with dated citations
   - open questions or ambiguity
   - follow-up docs, code, or skills to update
10. If the research surfaces future work, deferred implementation, or a later-phase product idea, create or refine a planning work item before closing the task.
11. If the same friction appears twice, improve this skill instead of relying on memory.

## Key Rules

- Prefer primary sources for legal, tax, security, standards, and product-behavior claims.
- State exact dates instead of relative phrases such as "recently" or "current".
- Mark inference explicitly when the sources do not state the conclusion verbatim.
- Do not collapse source authority levels. A statute, regulation, or official bulletin carries different weight than a FAQ or blog post.
- Keep the output scoped to the user's question. Research breadth is not a substitute for a clear answer.
- Update `docs/research-sources.md` when the research changes repository guidance or adds a major source family.
- Follow-up recommendations are not durable unless they also exist in planning as backlog items or updates to existing work items.

## When To Pull More Context

- Read `docs/agent-guidelines.md` when the output will change repo skills or agent process.
- Read `docs/documentation-standards.md` when the result will become long-lived documentation.
- Read `docs/security-and-privacy.md` before storing any notes that might include sensitive tax information.
