# Security And Privacy

## Baseline

This application is for sensitive personal tax data. Even though it is local-only, the design should treat privacy controls as mandatory, not optional.

## Rules

- Keep raw tax files, extracted text, and generated forms in ignored local directories.
- Redact or suppress personally identifying information in logs and test fixtures.
- Do not use telemetry, analytics, or hosted error reporting by default.
- Prefer libraries that can run fully offline.

## Upload And Storage Controls

- Validate extension, MIME type, and file size.
- Generate internal storage names.
- Separate raw uploads from derived artifacts and final outputs.
- Keep an audit trail of source file, extraction date, extractor version, and review status.

## Review And Export Controls

- Show confidence or review-needed indicators for uncertain extracted values.
- Require explicit user confirmation before a generated filing is considered final.
- Make it easy to trace each final field back to a source document or manual override.

## Future Hardening

- Optional encrypted local storage
- Optional database-at-rest encryption
- Optional network egress blocking or explicit offline mode checks
