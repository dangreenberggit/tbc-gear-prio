/**
 * Refuses `pnpm verify` in a local checkout with no fork clone, or one whose
 * gates skip.
 *
 * Each fork gate skips with exit 0 when `vendor/tbc-new-fork` is absent
 * (`vendor/` is gitignored), and `.github/workflows/verify.yml` never
 * restores the fork, so CI needs that skip. Locally the same skip let a
 * plain worktree report green while it checked none of the tab's code.
 * A fork folder that `pnpm wt:pair` did not finish building (no `make proto`
 * output, no `node_modules`) passes the folder test but still skips the
 * fork suites, so a local run also fails when any gate skipped.
 *
 * CI is recognised by GITHUB_ACTIONS, which GitHub sets to "true". GitHub's
 * "Default environment variables" table
 * (https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables)
 * says "You can't overwrite the value of the default environment variables
 * named `GITHUB_*`" but "Currently you can overwrite the value of the `CI`
 * variable", and some local tools set CI to turn off prompts (hypothesis,
 * untested), so CI alone would switch the guard off on a laptop.
 */

export const OPT_OUT = "TBC_VERIFY_WITHOUT_FORK";

const OPT_OUT_HINT = `  Work that never reads the fork: run \`pnpm run sync:wowsims:restore\` and \`pnpm run sync:atlasloot:restore\`, then set ${OPT_OUT}=1 (Git Bash: \`${OPT_OUT}=1 pnpm verify\`; PowerShell: \`$env:${OPT_OUT}='1'; pnpm verify\`), and set it the same way before \`git push\` or \`pnpm merge-to-dev\`, which run verify.`;

/** @param {Record<string, string | undefined>} env */
function isExempt(env) {
  return env.GITHUB_ACTIONS === "true" || env[OPT_OUT] === "1";
}

/**
 * @param {{forkPresent: boolean, env: Record<string, string | undefined>}} input
 * @returns {string | null} the refusal to print, or null when verify may run
 */
export function forkGuard({ forkPresent, env }) {
  if (forkPresent || isExempt(env)) {
    return null;
  }
  return [
    "verify: refused -- vendor/tbc-new-fork is absent, so every fork gate would skip and verify would pass without checking the Upgrades tab.",
    "  Tab or fork work: as a worker, stop and report this to whoever sent you; otherwise make a pair with `pnpm wt:pair <name> <main-branch> <fork-branch>` (docs/agents/paired-worktrees.md).",
    OPT_OUT_HINT,
  ].join("\n");
}

/**
 * A half-built fork skips only vitest suites
 * (packages/core/test/fork-engine-harness.ts), so the vitest count is its
 * own argument and has its own test.
 *
 * @param {{
 *   pythonSkipCount: number,
 *   vitestSkipCount: number,
 *   env: Record<string, string | undefined>,
 * }} input
 * @returns {string | null} the failure to print, or null when the run passes
 */
export function skipGuard({ pythonSkipCount, vitestSkipCount, env }) {
  const skipped = pythonSkipCount + vitestSkipCount;
  if (skipped === 0 || isExempt(env)) {
    return null;
  }
  return [
    `verify: failed -- ${skipped} gate(s) or test(s) skipped (reasons above). Outside CI every gate must run; a skip means a missing vendor/ input, such as a fork that \`pnpm wt:pair\` did not finish building.`,
    "  Restore what the skip reasons name and run verify again until it reports no skips; in a pair whose build did not finish, run `pnpm wt:unpair <name>` and make it again.",
    OPT_OUT_HINT,
  ].join("\n");
}
