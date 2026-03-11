# API Instructions

- Keep routes and transport handlers thin.
- Put filesystem, OCR, conversion, and export logic behind adapters.
- Do not log raw document contents or tax identifiers.
- Prefer typed service interfaces and provenance-friendly return shapes.
- Keep backend-only dependencies out of `packages/shared`.
