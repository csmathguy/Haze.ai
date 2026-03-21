import { buildChangedFilePlan } from "./changed-files.js";
import type { LoggedCommand, ResolvedCommand } from "./process.js";
import { shouldRunLintOnly } from "./lint-only.js";

export function buildChangedQualityCommands(files: string[], npmCommand: ResolvedCommand, pool?: string): LoggedCommand[] {
  const normalizedFiles = [...new Set(files.map((file) => file.replaceAll("\\", "/")))];
  const plan = buildChangedFilePlan(normalizedFiles);
  const commands: LoggedCommand[] = [];

  if (shouldRunLintOnly(normalizedFiles)) {
    commands.push({
      args: ["run", "quality:lint-only", "--", ...normalizedFiles],
      command: npmCommand,
      step: "lint-preflight"
    });
  }

  if (plan.stylelintTargets.length > 0) {
    commands.push({
      args: ["exec", "stylelint", "--", "--allow-empty-input", ...plan.stylelintTargets],
      command: npmCommand,
      step: "stylelint-changed"
    });
  }

  commands.push(...buildTestCommands(normalizedFiles, npmCommand, plan, pool));

  return commands;
}

function buildTestCommands(
  normalizedFiles: string[],
  npmCommand: ResolvedCommand,
  plan: ReturnType<typeof buildChangedFilePlan>,
  pool?: string
): LoggedCommand[] {
  const commands: LoggedCommand[] = [];

  // Check if any app or shared code files were changed (excluding tests and architecture rules)
  const hasAppOrSharedCode = normalizedFiles.some((file) => {
    // Skip non-TypeScript files (CSS, etc)
    if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(file)) return false;
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(file)) return false; // Skip test files
    if (file.startsWith("tools/quality/architecture/")) return false; // Skip architecture rule files
    return (
      /^apps\/[^/]+\/(?:api|web)\//.test(file) || // App code
      file.startsWith("packages/shared/") // Shared code
    );
  });

  // Run ArchUnit checks if app or shared code changed
  if (hasAppOrSharedCode && !plan.testCommand.targets.includes("arch-skip")) {
    commands.push({
      args: ["run", "test:arch"],
      command: npmCommand,
      step: "test-arch"
    });
  }

  switch (plan.testCommand.kind) {
    case "arch":
      if (!hasAppOrSharedCode) {
        // Only architecture files changed, run arch tests
        commands.push({
          args: ["run", "test:arch"],
          command: npmCommand,
          step: "test-arch"
        });
      }
      break;
    case "full":
      commands.push({
        args: ["run", "test"],
        command: npmCommand,
        step: "test"
      });
      break;
    case "related":
      commands.push({
        args: ["exec", "vitest", "--", "related", "--run", ...(pool === undefined ? [] : ["--pool", pool]), ...plan.testCommand.targets],
        command: npmCommand,
        step: "test-related"
      });
      break;
    case "none":
      // If we have app/shared code changes but no other tests, run arch checks
      if (hasAppOrSharedCode) {
        // arch command already added above
      }
      break;
  }

  return commands;
}
