import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    // Several tests replay a full ranking sweep and take ~2-3 s on an idle
    // machine, which fits vitest's 5 s default with almost no room. Once
    // apps/web joined the suite the added parallel load pushed
    // synthetic-fixtures over that line intermittently — green on its own,
    // red inside `pnpm verify`. The budget is generous on purpose: it is
    // here to stop machine load being reported as a test failure, not to
    // accommodate a slow test, and a genuine hang still fails the run.
    testTimeout: 30_000,
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
