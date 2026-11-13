Status: closed
Type: task
Origin: Owner, 2026-11-12, orchestrating session for tickets 672/811/623/635
Blocks: none
Blocked by: none
Serves: none
Evidence: .scratch/agent-reports/2026-11-12-general-task-verify-run-cache.md

# Skip `pnpm verify` when the same inputs already passed

**Problem.** A branch's full test suite (`pnpm verify`, 1662 gates, about
5 minutes) runs 8-10 times between "fix done" and "dev pushed". 672 ran it
at least 8 times and 811 at least 10. In each, 3-5 of those runs tested
content that had already passed. Two per branch were in the same folder a
few minutes after the last run: merge-to-dev right after the review's push,
and the dev push right after a hand verify on dev. The repeats come from
the pre-push hook running verify on every push, and from docs, skills and
briefs that ask for a hand run just before a step that runs it again.
Evidence: `.scratch/agent-reports/2026-11-12-general-task-verify-run-cache.md`.

**Owner's words (2026-11-12, orchestrator session):**
- "that sounds like potentially too many repetitive tests am i crazy"
- "yeah there at least should be some kind of caching or pre-passing of
  tests that have already passed with all the same info"

**Recommended fix (Outline 1 in the report).** `scripts/run_verify.mjs`
keeps a pass stamp in `~/.cache/tbc-gear-prio/verify-pass/<key>.json`.
The key hashes the main working tree's content, the fork's commit, edits
and generated files, the installed-dependency records of both repos,
`vendor/wowsims`, `vendor/atlasloot` and the wowsimcli binary, the
node/pnpm/python/go versions, and the env flags verify can see. Only a
green, full run with no skips writes a stamp, and only when the key is the
same after the run as before it. Every verify (pre-push, merge-to-dev, hand
runs) checks for a stamp first. On a hit it prints `verify: cached -- ...`
and exits 0. Any doubt means a full run. `TBC_VERIFY_FRESH=1` forces one.
No hook or merge-script change is needed.

**Done when:**
- `scripts/verify_cache.test.mjs` shows that changing each key input on its
  own forces a run, and that skips, the opt-out, CI, or edits made during a
  run write no stamp.
- In a scratch pair, a second `pnpm verify` prints `verify: cached`, and
  each of a tracked edit, a fork edit and a changed `NODE_OPTIONS` forces a
  full run.
- The `docs/workflow.md` Gates table names the cache and the force flag.

**Review route:** product (`run_verify.mjs` is in `GATE_PATHS`), so the
branch gets `pre-merge-review`.

**Separate, needs the owner's OK of the text:** drop the hand runs that a
hook or merge-to-dev repeats (report § 4: P1-P4).

## Closing note

Closed 2026-11-12 on `feat/876-verify-cache`. The cache, its tests and the
Gates table row are on the branch; the review fixed three faults (A1-A3).
The last line above, dropping hand runs that a hook or merge-to-dev
repeats, moved to ticket 877.

Verified by: docs/reviews/feat-876-verify-cache.md
