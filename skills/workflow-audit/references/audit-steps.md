# Audit Steps

## Start

- `npm run workflow:start implementation "<summary>"`

## During Work

- `npm run workflow:note implementation "<note>"`
- use audited wrappers for repeatable validation runs instead of ad hoc shell commands when practical

## Validation

- `npm run quality:logged -- implementation`
- `npm run quality:logged:coverage -- implementation` when coverage output matters

## Finish

- `npm run workflow:end implementation success`
- `npm run workflow:end implementation failed`
