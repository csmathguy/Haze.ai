# Architecture

## Recommended Structure

```text
apps/
  api/
    src/
      modules/
      services/
      adapters/
  web/
    src/
      app/
      features/
      components/
      hooks/
packages/
  shared/
    src/
      domain/
      schemas/
      utils/
tools/
  arch/
```

## Initial Stack Direction

- Frontend: Vite + React + TypeScript
- UI library: Material UI for components and icons
- Charts: MUI X Charts first, then reevaluate only if reporting needs exceed it
- Backend: Node.js + TypeScript
- Testing: Vitest for unit tests, React Testing Library for UI behavior, Playwright later for end-to-end flows
- Validation: schema-driven DTO validation in shared contracts
- Architecture enforcement: ArchUnitTS plus ESLint import restrictions

## Boundary Model

- `apps/web`
  - renders views, owns UI state, calls backend APIs
  - must not read private document files directly from the filesystem
- `apps/api`
  - owns file intake, extraction orchestration, storage, validation, and output generation
  - should expose application services, not raw library details
- `packages/shared`
  - contains domain vocabulary, schemas, typed contracts, and pure helpers
  - must not depend on React, browser APIs, Express-style request objects, or storage adapters

## Backend Processing Shape

1. Intake uploaded file into a local staging area outside committed source.
2. Detect document type and select an extractor strategy.
3. Convert raw content into normalized intermediate text or structured fields.
4. Run tax-domain mappers that translate extraction output into domain entities.
5. Persist reviewable results plus provenance metadata.
6. Surface uncertain fields in the frontend for manual confirmation.

## Extraction Guidance

- Keep document extraction behind an interface such as `DocumentExtractor`.
- Treat tools like MarkItDown as adapters, not domain dependencies.
- Because MarkItDown is Python-based, prefer invoking it as a local process boundary if it is selected later.
- Keep OCR, PDF parsing, and spreadsheet parsing swappable by document type.

## Local-Only Design Rules

- Prefer localhost APIs between `web` and `api`.
- Store raw documents, extracted artifacts, and generated outputs in ignored local folders.
- Default to no outbound network calls during runtime.
