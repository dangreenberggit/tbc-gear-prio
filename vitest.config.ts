import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Reported, not thresholded — a global percentage gate manufactures
      // tautological tests to hit the number. See docs/workflow.md.
    },
  },
});
