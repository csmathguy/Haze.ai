import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80
      },
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["apps/**/src/**/*.{ts,tsx}", "packages/**/src/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.*", "**/*.spec.*"]
    },
    environment: "node",
    globals: true,
    include: ["**/*.{test,spec}.ts"],
    passWithNoTests: false,
    testTimeout: 15000
  }
});
