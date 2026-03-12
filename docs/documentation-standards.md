# Documentation Standards

## Purpose

Use these rules when writing or restructuring long-lived documentation in this repository. They are meant to keep tax-domain guidance scannable, dated, and traceable back to sources instead of relying on agent memory.

## Choose The Right Document Type

Organize docs around one primary purpose:

- tutorial: teach a newcomer by example
- how-to: help a reader complete a task
- reference: provide facts, fields, commands, or rules
- explanation: clarify why the system works a certain way

Prefer one dominant type per document. If a page starts mixing all four, split it.

## Start With Scope

Front-load the context that changes the answer:

- intended audience
- system area or workflow
- jurisdiction, tax year, or form family when relevant
- exact review date when the topic is time-sensitive

Use exact dates such as March 11, 2026 instead of relative wording.

## Write For Scanning

- Use specific headings that help a reader decide whether to keep reading.
- Keep paragraphs focused on one idea.
- Use numbered lists for procedures and ordered decisions.
- Use bullets for unordered facts, constraints, or checklists.
- Keep list items parallel in structure.
- Use tables only when readers need to compare multiple attributes.

## Preserve Source Quality

- Prefer primary sources for tax law, regulations, standards, and product behavior.
- Distinguish sourced facts from inference.
- Record the authority level when it matters, especially for tax guidance.
- Add or update `docs/research-sources.md` when a document depends on new major sources.

For tax content, include the jurisdiction, tax year, and authority family near the claim. Example: Internal Revenue Code, Treasury regulations, Internal Revenue Bulletin guidance, or IRS instructions/publications.

## Keep Terminology Stable

- Reuse repository terms consistently across docs, code, and skills.
- Define overloaded tax terms when they have multiple meanings.
- Prefer the user-facing term unless the legal term is required for precision.

## Treat Docs As Maintained Artifacts

- Update the closest existing document before creating a new one with overlapping scope.
- Remove or rewrite stale statements instead of layering corrections below them.
- When research reveals a repeated workflow, capture it in a skill or reference file.
- Keep `SKILL.md` files lean and move detailed checklists into `references/`.
