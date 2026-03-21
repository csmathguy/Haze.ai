import { describe, expect, it } from "vitest";

import { buildChangedQualityCommands } from "./changed-quality-commands.js";

const npmCommand = {
  command: "npm",
  prefixArgs: []
};

describe("buildChangedQualityCommands", () => {
  it("runs lint-only preflight before related tests and includes arch test for app code changes", () => {
    const commands = buildChangedQualityCommands(["apps/code-review/web/src/app/api.ts"], npmCommand, "forks");

    expect(commands.map((command) => command.step)).toEqual(["lint-preflight", "test-arch", "test-related"]);
    expect(commands[0]?.args).toEqual(["run", "quality:lint-only", "--", "apps/code-review/web/src/app/api.ts"]);
    expect(commands[1]?.args).toEqual(["run", "test:arch"]);
    expect(commands[2]?.args).toEqual([
      "exec",
      "vitest",
      "--",
      "related",
      "--run",
      "--pool",
      "forks",
      "apps/code-review/web/src/app/api.ts"
    ]);
  });

  it("keeps stylelint after the lint-only preflight for stylesheet changes", () => {
    const commands = buildChangedQualityCommands(["apps/code-review/web/src/app/index.css"], npmCommand);

    expect(commands.map((command) => command.step)).toEqual(["lint-preflight", "stylelint-changed"]);
    expect(commands[1]?.args).toEqual([
      "exec",
      "stylelint",
      "--",
      "--allow-empty-input",
      "apps/code-review/web/src/app/index.css"
    ]);
  });

  it("runs only architecture tests when the change is architecture-only", () => {
    const commands = buildChangedQualityCommands(["tools/quality/architecture/architecture.spec.ts"], npmCommand);

    expect(commands.map((command) => command.step)).toEqual(["lint-preflight", "test-arch"]);
  });

  it("includes test-arch step when application files change", () => {
    const commands = buildChangedQualityCommands(["apps/plan/api/src/service/foo.ts"], npmCommand);

    expect(commands.map((command) => command.step)).toContain("test-arch");
    const archCmd = commands.find((cmd) => cmd.step === "test-arch");
    expect(archCmd?.args).toEqual(["run", "test:arch"]);
  });

  it("includes test-arch step when shared files change", () => {
    const commands = buildChangedQualityCommands(["packages/shared/src/types.ts"], npmCommand);

    expect(commands.map((command) => command.step)).toContain("test-arch");
  });

  it("skips test-arch step when only test files change", () => {
    const commands = buildChangedQualityCommands(["apps/plan/api/src/service/foo.test.ts"], npmCommand);

    expect(commands.map((command) => command.step)).not.toContain("test-arch");
  });

  it("skips test-arch step when only style files change", () => {
    const commands = buildChangedQualityCommands(["apps/plan/web/src/styles.css"], npmCommand);

    expect(commands.map((command) => command.step)).not.toContain("test-arch");
  });
});
