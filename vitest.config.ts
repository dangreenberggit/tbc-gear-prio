import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The fork's own path aliases, so a test here can import the ported engine
// under `ui/features/upgrades/model/` and the upstream modules it reaches. The
// source of truth is `UI_ALIASES` in vendor/tbc-new-fork/vite.config.mts (also
// its tsconfig.json `paths`); add an entry here when upstream adds one there.
const forkUi = (dir: string): string =>
  fileURLToPath(new URL(`./vendor/tbc-new-fork/ui/${dir}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@sim": forkUi("sim"),
      "@generated": forkUi("generated"),
      "@worker": forkUi("worker"),
      "@ui-kit": forkUi("ui-kit"),
      "@features": forkUi("features"),
      "@app": forkUi("app"),
      "@specs": forkUi("specs"),
      "@i18n": forkUi("i18n"),
      // Not a file — the fork's Vite build materialises this specifier with
      // `vite-plugin-i18next-loader`, which vitest does not run. A test that
      // imports the fork's engine reaches it transitively (rank.ts -> items.ts
      // -> ui/sim/proto/database.ts -> i18n config) and the module graph dies
      // before the test body. The stub is empty on purpose; see its own header.
      // Scoped to a specifier nothing outside the vendored fork imports.
      "virtual:i18next-loader": fileURLToPath(
        new URL(
          "./packages/core/test/fork-virtual-i18next-loader.ts",
          import.meta.url
        )
      ),
    },
  },
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
