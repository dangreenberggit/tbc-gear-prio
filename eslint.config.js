// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// PLAN.md §4: packages/core's implementation is pure — no filesystem, no
// network, no process.env, no React, no console. Everything I/O crosses one
// of the three seams. "Enforced by lint rule, not by good intentions."
const PURITY_RESTRICTED_IMPORTS = [
  "fs",
  "node:fs",
  "fs/promises",
  "node:fs/promises",
  "http",
  "node:http",
  "https",
  "node:https",
  "net",
  "node:net",
  "child_process",
  "node:child_process",
  "react",
  "react-dom",
];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // .agents/ and .claude/ hold vendored skill content (Matt Pocock's
    // skills, mirrored per repo convention) — not our source, not ours to lint.
    // packages/core/src/proto/ is `buf generate` output (PLAN.md §8.1) — linting
    // it as hand-written code produces noise on every regen for no benefit.
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "vendor/**",
      ".agents/**",
      ".claude/**",
      // Scratch holds retros, handoffs, and leftover nested checkouts — not source.
      ".scratch/**",
      "packages/core/src/proto/**",
    ],
  },
  {
    // Compile-time assertions (`type _Foo = Assert<...>`) exist only for the
    // error they raise when an invariant breaks, so they are unused by
    // construction. Leading underscore marks that intent; the rule still
    // catches ordinary dead code, which is what it is for.
    files: ["packages/core/src/**/*.ts", "packages/core/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // scripts/ is build-time tooling, the opposite of packages/core's purity
    // rule below: reading files and printing to stdout is its whole job.
    // The wowsims-tab experiment scripts are the same kind of one-shot Node
    // tooling (e-w4-diff.mjs, copied verbatim from
    // docs/plans/wowsims-tab/experiments/e-w4-method.md's reference script),
    // so they share the override rather than getting their own.
    files: ["scripts/**/*.mjs", "docs/plans/wowsims-tab/experiments/**/*.mjs"],
    languageOptions: {
      // Timers are here for the E-W5 harnesses, which sample a child
      // process's RSS on an interval while a sim runs.
      globals: {
        process: "readonly",
        console: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
  {
    files: ["packages/core/src/**/*.ts"],
    ignores: ["packages/core/src/seams/**", "packages/core/src/cli.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: PURITY_RESTRICTED_IMPORTS }],
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message:
            "packages/core is pure — inject config via Deps instead (PLAN.md §4).",
        },
        {
          name: "console",
          message:
            "packages/core is pure — return data, let the caller log it (PLAN.md §4).",
        },
      ],
    },
  }
);
