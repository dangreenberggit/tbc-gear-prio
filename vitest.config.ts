import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Sibling agent worktrees under .scratch must not join the suite.
      "**/.scratch/**",
      "**/.claude/worktrees/**",
      // The fork clone ships no vitest. Any test file in there uses
      // `node:test`, which vitest collects, finds nothing in, and reports as
      // a passing file with zero tests — a green tick asserting nothing
      // (ticket 166). E-W3 exercises the fork's engine from this side.
      "**/vendor/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Reported, not thresholded — a global percentage gate manufactures
      // tautological tests to hit the number. See docs/workflow.md.
    },
  },
});
