# Handoff — three follow-up tickets from the round-6 Upgrades review (332, 333, 334)

Written 2026-08-29 for the next agent (or session) to **oversee via the
orchestration system** and finish. You are the delegator: plan → review the plan
→ execute → review, judging the gates; do not hand-implement what a worker
should do. Read this whole file first — it carries facts that vanished with the
prior session's context.

Before you start, read the new **`## Orchestrator conduct`** section in
`.claude/skills/stage-gate/SKILL.md` and the new **`## Interacting with the
user`** section in `AGENTS.md` — they were written this session from the prior
orchestrator's mistakes and are exactly the conduct this job needs. In short: act
on standing instructions without re-confirming; carry derivable decisions
yourself but hand back the user's own calls; do not offer merge while open
tickets say the work isn't done; present decisions as reasoned prose, never a
picklist.

## Branch / state at handoff

- Branch: `feat/upgrades-dedup-wowsims` (main checkout), tip `542651d`. Clean.
- Fork: gitignored repo at `vendor/tbc-new-fork` on `feat/upgrades-tab`, tip
  `2f992cc299002dada13064b17603d7571e02b3e1`, pinned in
  `data/wowsims-fork.lock.json`. Clean.
- **Nothing is merged to `dev`.** The round-6 pre-merge review is written
  (`docs/reviews/feat-upgrades-dedup-wowsims.md`, Round 6 section) with
  **no blocking or material findings**; `pnpm merge-to-dev --check-only` was green.
- **Do NOT offer to merge until these three tickets are resolved (or the owner
  explicitly defers them).** They are the open work this review surfaced; merging
  over them is the exact mistake the new conduct guidance was written to prevent.
  When the work is done, ask the owner — never merge without a separate explicit
  ask after they have seen the summary.

## What already landed this session (do not redo)

- **331** (set-bonus noise-floor ranking gate): executed, reviewed, green.
  Core `packages/core/src/{view.ts,cutoff.ts}` + byte-identical fork twin +
  drift cycle. `SET_BONUS_NOISE_FLOOR_DPS = 10` shared constant.
- **327/328/329/330** (CSS/controls/copy batch): executed, reviewed, green.
- The **three copy strings** were reworded this session (fork `2f992cc`) to the
  independent writing review's picks and re-pinned — that work is DONE, not a
  ticket. Do not reopen it.
- Stage-gate artifacts: `.scratch/stage-gate/upgrades-331-noise-rank/` and
  `.scratch/stage-gate/upgrades-css-controls-copy/`. Round-6 review plan:
  `.scratch/review-plans/round-6-plan.md`.

## The three open tickets (this handoff's work)

All three came out of the round-6 review. Read each ticket file in full; the
summaries below are orientation, not a substitute.

### 334 — adopt the native BooleanPicker idiom for the two view checkboxes
`.scratch/carry-forward/issues/334-adopt-booleanpicker-idiom-for-upgrades-view-checkboxes.md`

This is the **least done** of the three and the one most clearly "328 isn't fully
delivered." Ticket 328 asked for native-styled controls. The executor met the
**visible** goal (checkboxes render 28×28 at all widths) the low-risk way — by
deleting the 40px inflation SCSS rule — but the **idiom** half was deferred: the
checkboxes are still hand-rolled `<label><input class="form-check-input">` in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(~609-626), not native `BooleanPicker(inline: true)` components (precedent
`log_runner.tsx:79-89`). The deferral was judged plan-sanctioned at Gate C and
confirmed honest by the round-6 spec axis, but it IS unfinished work.
- **Why it was deferred (real risk, not laziness):** the rewrite reworks
  imperative pane-driven visibility (4 `setVisible` sites), the `.checked` reads
  (4 sites), the qualifier `setText`, and the `render()` wiring — a view-state
  machine with no test coverage. Plan for that: it is not a one-liner.
- **Verify by browser observation** at 375/653/768/1280 that the checkboxes stay
  28×28 and behave identically. The `resize_window`/headless path works this
  session (see the fork's `test-layout.mjs` and the css-controls execution report
  for how the run is driven; Node ≥ 22 required — the default shell Node 20.18.1
  fails vite/build).
- Fork-only, **non-ported** — no drift cycle. Fork commit + re-pin.

### 333 — pin the noise-floor VALUE with a near-boundary test
`.scratch/carry-forward/issues/333-noise-floor-value-not-pinned-by-a-near-boundary-test.md`

Cheap and self-contained. The 331 unit tests in
`packages/core/test/view.test.ts` pin the strict `>` operator (an "exactly 10 → 0"
test) and test passthrough at 18.039 — but nothing pins the floor VALUE near the
boundary, so a change `10 → 15` slips the suite silently. Add a just-above
passthrough (`10.001 → passes through`) and a just-below (`9.999 → 0`) assertion,
pure-function tests alongside the existing ones. **Core repo only, no fork, no
drift cycle.** This one is a good candidate to do FIRST — it is small, it makes
332's eventual value change safe, and 332's ticket depends on it conceptually.

### 332 — per-spec ranking floor (the flat-10 could zero a real 10–15 DPS bonus)
`.scratch/carry-forward/issues/332-ranking-noise-floor-may-zero-a-real-10-15-dps-bonus.md`

The judgement-heaviest. The domain axis judged the flat `10` defensible **today**
because every committed `prospectiveBonusDps` is either sub-floor noise or ≥17 DPS
— the 10–15 band is EMPTY in observed data. But a real set bonus is quantized, so
a true 10–15 DPS 4pc is physically possible on a spec not yet measured, and for a
RANKING floor (unlike the display floor) a false-negative is a genuinely missed
upgrade. `cutoff.ts:32-33` already names a per-spec/CUTOFF-derived floor as the
documented follow-up (√2-scaled ≈4.75 ret / 5.02 feral vs the round-number-high
10). **This is `Type: enhancement`, not a defect** — treat it as such. It may be
the one the owner chooses to DEFER rather than do now; surface that as a genuine
fork (per the conduct guidance, this is a priorities call that is the owner's, not
yours). If it does get done: land 333 first so the value change is test-visible.
Core `packages/core/src/{cutoff.ts,view.ts}` + the byte-identical fork twin →
**drift cycle applies** (parity green first → identical Edit-tool edits both
copies → PROVENANCE sha256 → fork commit → re-pin → `pnpm sim-implemented-effects:generate`
→ `pnpm verify`). See `docs/agents/known-traps.md` § "Before editing a ported
engine file".

## Suggested sequence (yours to judge, not fixed)

333 first (cheap, unblocks 332's safety) → then 334 (finishes 328) →
then 332 (or defer to the owner). But confirm the owner's priorities rather than
assume — 332 in particular may be a deliberate defer.

## Environment traps (cost the prior session real time)

- **Node version:** the fork needs Node ≥ 22. The default shell Node (20.18.1)
  fails vite/build. The fork dir has an fnm hook (`.node-version`) that fires on
  `cd` into it and can BREAK compound bash commands mid-chain (a `git commit -F`
  lost its message-file arg this way). Set up fnm FIRST in the same command:
  `eval "$(fnm env)"; fnm use 22 >/dev/null 2>&1; cd vendor/tbc-new-fork && ...`,
  and write commit messages to a file (Write tool), don't heredoc them inline.
- **`pnpm verify` runs a skill-mirror gate:** `.claude/skills/` and
  `.agents/skills/` must be byte-identical. If you edit a SKILL.md, copy it to the
  other tree or `mirrors:check` fails. (This session hit it.)
- **The effects gate compares stamp-to-PIN:** any re-pin of
  `data/wowsims-fork.lock.json` requires `python scripts/generate_sim_implemented_effects.py`
  or `pnpm verify` reds on `forkCommit`. Confirm the regen diff is stamp-only.
- **lint-staged runs on ALL staged files** (`--no-stash`), so `git status` must be
  clean of work you did not do before each commit.
- **Fork checkout is gitignored, exists only in the main checkout** — do not use a
  worktree for these (it would not have the fork). Shared checkout only.

## Files to read first (in order)
1. This handoff.
2. The three ticket files `.scratch/carry-forward/issues/{332,333,334}-*.md`.
3. `docs/reviews/feat-upgrades-dedup-wowsims.md` Round 6 section (the findings
   these tickets came from, and the Disposition table).
4. `.claude/skills/stage-gate/SKILL.md` § Orchestrator conduct + `AGENTS.md`
   § Interacting with the user (how to run this).
5. `docs/agents/known-traps.md` (drift cycle for 332; Node/fnm; cwd-persists).
