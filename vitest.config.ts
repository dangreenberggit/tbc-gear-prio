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
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Reported, not thresholded — a global percentage gate manufactures
      // tautological tests to hit the number. See docs/workflow.md.
    },
  },
});
