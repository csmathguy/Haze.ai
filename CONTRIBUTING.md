# Contributing

## Principles

- Keep the repository local-first and privacy-preserving.
- Never commit raw tax documents, generated filings, or extracted personal data.
- Prefer small, reviewable changes with matching tests and docs updates.

## Local Setup

1. Install the Node.js version pinned in `.nvmrc`.
2. Install dependencies with `node tools/runtime/run-npm.cjs ci`.
3. Use the repo-local runtime shim for commands when your shell default Node version differs from `.nvmrc`.

## Development Workflow

1. Read the closest `AGENTS.md` and relevant docs in `docs/`.
2. Follow red-green-refactor when changing behavior.
3. Start an audited workflow for substantial changes:
   - `node tools/runtime/run-npm.cjs run workflow:start implementation "<summary>"`
4. Use focused validation while iterating:
   - `node tools/runtime/run-npm.cjs run quality:changed -- <files...>`
5. Before finishing, run the full guardrails:
   - `node tools/runtime/run-npm.cjs run quality:logged -- implementation`
6. End the workflow:
   - `node tools/runtime/run-npm.cjs run workflow:end implementation success`

## Pull Requests

- Keep pull requests narrow and explain the user-visible or architecture impact.
- Include the commands you ran and any relevant audit folder paths.
- Update documentation when workflows, toolchain, or architectural rules change.
