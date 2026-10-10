/**
 * Refuses `pnpm verify` in a local checkout with no fork clone.
 *
 * Each fork gate skips with exit 0 when `vendor/tbc-new-fork` is absent
 * (`vendor/` is gitignored), and `.github/workflows/verify.yml` never
 * restores the fork, so CI needs that skip. Locally the same skip let a
 * plain worktree report green while it checked none of the tab's code.
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

/**
 * @param {{forkPresent: boolean, env: Record<string, string | undefined>}} input
 * @returns {string | null} the refusal to print, or null when verify may run
 */
export function forkGuard({ forkPresent, env }) {
  if (forkPresent || env.GITHUB_ACTIONS === "true" || env[OPT_OUT] === "1") {
    return null;
  }
  return [
    "verify: refused -- vendor/tbc-new-fork is absent, so every fork gate would skip and verify would pass without checking the Upgrades tab.",
    "  Tab or fork work: make a pair with `pnpm wt:pair <name> <main-branch> <fork-branch>` (docs/agents/paired-worktrees.md).",
    `  Work that never reads the fork: set ${OPT_OUT}=1 (Git Bash: \`${OPT_OUT}=1 pnpm verify\`; PowerShell: \`$env:${OPT_OUT}='1'; pnpm verify\`; prefix \`git push\` or \`pnpm merge-to-dev\` the same way).`,
  ].join("\n");
}
