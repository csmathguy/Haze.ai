# Taxes Repository Instructions

## Scope
- This repository is for a local-only tax workflow application.
- Treat all tax documents, extracted fields, and generated filings as sensitive data.
- Do not introduce runtime dependencies that send tax data to third-party hosted services.

## Project Skills
- Use `skills/implementation-workflow` for code changes, refactors, tests, build tooling, or architecture work.
- Use `skills/ui-design-workflow` for frontend UX, component design, charting, layout, accessibility, or MUI theming work.
- Use `skills/workflow-audit` when a task needs explicit workflow start/end logging, audited command execution, or a reviewable command trail.

## Required Workflow
1. Read the relevant docs in `docs/` before making non-trivial changes.
2. Work in red-green-refactor order for behavior changes whenever practical.
3. For substantial implementation work, start an audited workflow with `npm run workflow:start implementation "<summary>"`.
4. Before finishing, run the strongest available validation for the touched area:
   - Fast iteration: `npm run quality:changed -- <files...>` or let the git `pre-commit` hook run `npm run quality:changed:staged`
   - Full compile checks with `npm run typecheck`
   - Full ESLint with `npm run lint`
   - Full tests with `npm test` or architecture-only tests with `npm run test:arch`
   - Use `npm run quality:logged -- implementation` when you want a single audited full guardrail run
5. Close audited work with `npm run workflow:end implementation success` or `failed`.
6. If a command is not available yet, note the gap and update the nearest documentation or scaffold so the repo moves toward that standard.

## Architecture Rules
- Keep a strict separation between `apps/web`, `apps/api`, and `packages/shared`.
- `packages/shared` must stay framework-light and hold reusable domain types, schemas, and pure helpers.
- UI components should not parse raw tax documents directly. Extraction belongs behind backend application services.
- External document conversion or OCR tools must sit behind adapters so they can be swapped without rewriting business logic.
- Prefer composition over inheritance. Apply SOLID, DRY, and KISS without adding abstractions before there is a second real use case.

## Privacy And Security
- Never commit raw tax documents, generated filings, or local extracted data.
- Redact or avoid logging SSNs, EINs, bank numbers, addresses, or full document contents.
- Default to offline-capable libraries and local storage paths outside the repository for private files.

## Documentation
- Keep `docs/research-sources.md` current when adding or replacing major stack guidance.
- Update the closest architecture or workflow doc when implementation decisions change.
- Keep `.nvmrc` and `package.json` engine versions aligned with the validated local toolchain.
