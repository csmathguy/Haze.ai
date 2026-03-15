---
name: ui-design-workflow
description: Use this skill when designing or refining the frontend for this repository, including React components, forms, review screens, charts, tables, MUI theming, and accessibility decisions.
---

# Ui Design Workflow

<!-- Recommended model tier: T2 (Sonnet) — design reasoning needed for layout, accessibility, and theming tradeoffs -->

## Overview

This skill keeps frontend work aligned with the repo's tax-focused UX priorities: reviewability, clarity, accessibility, and consistent Material UI usage. Use it for new screens, layout refactors, charting decisions, and component-system work.

## Workflow

1. Read `docs/frontend-react-typescript.md`.
2. Read `references/ui-principles.md` for the detailed checklist.
3. Start from the user task and the data that must be reviewed or corrected.
4. Favor MUI theme tokens, variants, and reusable primitives over ad hoc styling.
5. Keep exact values, validation state, and provenance visible.
6. Verify accessibility and responsive behavior before closing the task.

## Key Rules

- Do not optimize for decoration over auditability.
- Every chart must have an exact-value fallback.
- Keep forms keyboard accessible and error states explicit.
- Prefer dense but readable layouts for tax review workflows.
- Reuse MUI components and theme primitives before creating custom widgets.

## External Skill References

- The curated skill catalog currently includes `figma` and `figma-implement-design`.
- Those are useful future references if the project adopts a Figma-based workflow.
- Until then, keep this skill focused on repo-local design rules and implementation guidance.
