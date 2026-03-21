---
name: implementation-workflow
description: Use this skill when implementing, refactoring, testing, or restructuring code in this repository. Apply it for changes in apps/*/web, apps/*/api, packages/shared, tooling, tests, or architecture docs.
---

# Implementation Workflow

<!-- Recommended model tier: T2 (Sonnet) — code changes require reasoning about design and edge cases -->

## Overview

This skill keeps code changes aligned with the repository's local-only privacy requirements, architecture boundaries, and quality gates. Use it whenever a task affects behavior, tests, build tooling, or project structure.

## Workflow

1. **Create a feature branch immediately** — before touching any code, create and check out a branch:
   ```bash
   git checkout -b feature/<work-item-id>
   ```
   Never commit or push directly to `main`. All work must land via a PR.
2. Read `AGENTS.md`, then the closest docs in `docs/`.
   **File discovery pre-pass** — when the task scope is unclear or spans many files, run this
   before reading code to limit context to what matters:
   ```bash
   npm run agent:discover-files -- --task "<task description>" --max 10
   ```
   Read only the returned file paths first. Skip this step when the task already names exact files.
3. Read `references/checklist.md` if the change is more than trivial.
4. For substantial work, start an audited workflow with `npm run workflow:start implementation "<summary>"`.
5. For nested agent phases such as skill execution, tool invocation, or custom validation passes, use `npm run execution:start` and `npm run execution:end` inside the active workflow.
6. Identify the boundary being changed: `apps/*/web`, `apps/*/api`, `packages/shared`, or `tools`.
7. For behavior changes, write or update a failing test first.
8. Implement the smallest change that makes the test pass.
9. Refactor only after behavior is green.
10. Run the strongest available validation for the touched scope.
11. Commit the finished work in atomic commits, then push the feature branch and create a PR:
    ```bash
    git push --no-verify -u origin feature/<work-item-id>
    gh pr create --title "<title> (<PLAN-ID>)" --body "Closes <PLAN-ID>..."
    ```
    Alternatively use `node tools/runtime/run-npm.cjs run pr:sync -- --summary "<what changed>" --value "<why it matters>" --privacy-confirmed`.
12. Stop at PR publication. Do not merge the pull request from the implementation workflow.
13. Close the workflow with `npm run workflow:end implementation success` or `failed`.

## Key Rules

- **Never push to main directly.** All changes must be on a feature branch and merged via PR after human review. This is enforced by the workflow engine once PLAN-144 is complete; until then it is a manual discipline rule.
- **Every task must end with an open PR.** An open PR is the definition of done for implementation work. If no PR exists, the work is not done.
- Do not let frontend code parse raw tax documents.
- Keep extraction, OCR, and conversion tools behind backend adapters.
- Keep shared packages free of React and backend transport concerns.
- Prefer `npm run quality:logged -- implementation` over hand-running the whole guardrail stack.
- Use `npm run typecheck`, `npm run lint`, and targeted tests as the minimum completion bar when those commands exist.
- Treat merge approval as human-only and outside the implementation agent's authority.
- If the repo lacks a needed script or guardrail, document the gap and move the scaffold toward that standard.

## When To Pull More Context

- Read `docs/testing-and-quality.md` when the task changes behavior or test strategy.
- Read `docs/architecture-enforcement.md` when imports, packages, or layering are affected.
- Read the frontend or backend guide when the task is stack-specific.
