# Handoff — ledger consolidation and merge train

Written 2026-09-12 at the end of a session. **Phase A is complete and verified.
Nothing is merged. The next action is the owner's merge ask.**

Read this first, then `merge-order.md`. Everything else is detail you only need
if something disagrees with what is written here.

## Re-verify before you act

State measured 2026-09-12. Branch tips and the fork clone can move; confirm
before trusting any of it. **Use PowerShell for git** — the Bash tool emits an
fnm stderr line that corrupts output and breaks `&&` chains, and it has already
produced one false "empty range" reading in this work.

```powershell
cd C:\Users\dgree\Code\lulz\tbc-gear-prio
git rev-parse --short dev                                  # a2a4295
git -C vendor\tbc-new-fork rev-parse --short HEAD          # bbad1b8a4, detached, clean
git status --porcelain                                     # clean
foreach ($b in @('docs/fork-upstream-touchpoints','feat/spec-registry','fix/sim-header-null-assertion')) {
  "$b -> $(git rev-parse --short $b)  NEXT=$(git show ${b}:.scratch/carry-forward/issues/NEXT)"
}
# docs/fork-upstream-touchpoints -> 26de42e  NEXT=381
# feat/spec-registry             -> ce74605  NEXT=379
# fix/sim-header-null-assertion  -> f90fe88  NEXT=381
```

## What this stage did

Two agent sessions ran concurrently on this repo. Both independently answered
ticket 369, producing **two tracked ledgers for one ticket**, and both allocated
overlapping ticket numbers. Session B merged first (`a2a4295`). This stage
consolidated the result.

Phase A, all verified by the orchestrator rather than taken from the executor's
report:

- **One ledger.** `docs/fork-upstream-divergence.md` (session B's) is deleted;
  its merge-conflict framing, the `sim_header.tsx` conflict history from merge
  `ab59127d9`, the `test-layout.mjs` non-divergence row and the resolved
  `ui/core/sim.ts` row are folded into `docs/fork-upstream-touchpoints.md`.
  **Zero** markdown links to the deleted file remain.
- **The 13-vs-15 dispute is settled and recorded.** Session B claimed session
  A's 13 was an undercount. It was not: B's 15 includes `test-layout.mjs` (an
  added file, which B's own table marked as not divergence) and
  `ui/core/sim.ts` (reverted to zero diff). 15 − 2 = 13, confirmed as a genuine
  set comparison, path for path — see `reconciliation.txt`.
- **Ticket collision resolved.** 371/372/373 on `feat/spec-registry` → 376/377/378;
  371/373 on `fix/sim-header-null-assertion` → 379/380. **Zero** stale
  `/371-`/`/372-`/`/373-` paths remain on either branch.
- **Ticket 377 closed** (formerly 372). Its diagnosis was inverted and
  dangerous — it instructed a reader to reset the fork clone back to the pin,
  which today would silently delete a committed crash fix while `pnpm verify`
  stayed green. Ancestry is linear `f90b12a7b` → `bbad1b8a4` → `5e9013b78`; the
  clone was *ahead*, and bumping the pin forward was correct.

## The next action: three merges, in this order

Each needs an explicit owner ask. `pnpm merge-to-dev` is the only supported
door — never `git merge` into `dev`, never `TBC_ALLOW_DEV_MERGE=1`.

1. `docs/fork-upstream-touchpoints` — **must go first.** It carries `NEXT`=381
   and the `map.md` reservation line, which is what stops a `dev`-based session
   from allocating a colliding ticket number.
2. `feat/spec-registry`
3. `fix/sim-header-null-assertion` — **after this one, move the fork clone
   forward**: `git -C vendor/tbc-new-fork checkout feat/upgrades-tab`
   (→ HEAD `5e9013b78`). This branch is the only one that moves the fork pin.

`NEXT` will conflict on merges 2 and 3. **Resolution rule: the larger value
wins.** Ordering is otherwise free with respect to the fork pin —
`feat/spec-registry` does not touch `data/wowsims-fork.lock.json` at all, which
was measured and which refuted this stage's original premise of a "forced"
order.

### Standing warning until the first merge lands

> **until `docs/fork-upstream-touchpoints` is merged, `dev`'s `NEXT` is 376 and
> any ticket filed from `dev` collides with the reservation — file nothing from
> `dev` in that window, or merge the touchpoints branch first**

## Phase B — only after each named merge

`plan.md` § Phase B has the detail. In short: after merge 1, re-merge `dev` into
`feat/spec-registry` and re-check; after merge 2, close tickets 379 and 380 on
the sim-header branch and flip its review rows A4/D1 from `defer` to `fixed`;
after merge 3, confirm `check_equip_eligibility.py` is rc 0 with the clone at
`5e9013b78`.

## Carried forward — not defects in this work

- **`dev:map.md:181` says `feat/reforge-catchup-leftovers` is "NOT merged."** It
  **is** an ancestor of `dev`. The stage flagged rather than fixed it: the file
  is on `dev` and outside this stage's Paths manifest. Correct it on `dev`.
- **Commit bodies on both renumbered branches keep the old ticket numbers**
  (e.g. `a9f1cc1` says "This also clears ticket 372"). Knowingly left stale —
  rewriting them means rebasing reviewed ranges and invalidating two review
  files. Decoder ring: `merge-order.md` § Ticket renumber map.
- **The fork branch `5e9013b78` is not on the remote** and
  `data/wowsims-fork.lock.json` has `pushed: false`. Pushing is an owner
  decision (ticket 355 precedent), out of this stage's scope.

## Environment traps that cost time here

- **`SendMessage` is unavailable** — Claude Code is **2.0.47**, below the
  documented **2.1.234** floor for native Windows. No deny rule and no managed
  settings exist; this was checked. Consequence: **a spawned subagent cannot be
  resumed or asked a follow-up.** Its in-context work dies when it stops, so
  every agent must persist long deliverables to disk. This is why `logs/` exists
  — see `logs/README.md`. Full detail in
  `logs/sendmessage-disabled-research.md`. Caveat: the version floor is the best
  available explanation, not a confirmed one — the floor is documented for
  *cross-session* messaging specifically, and subagent resumption predates it.
  After updating, test with a throwaway agent before assuming it is fixed.
- **The fork clone is ONE shared checkout**, gitignored, not a worktree. Never
  two writers. Pre-commit runs `lint-staged` against `*` with `--no-stash`, so
  any commit sweeps in whatever else is dirty.
- **CRLF.** PowerShell `Set-Content -Encoding utf8` writes CRLF, and the
  `sim-implemented-effects` generator rewrote its artifact with CRLF while the
  content was byte-identical. Both fired during Phase A and were caught before a
  commit. Check `git diff --stat` is content-sized before committing.
- **`pnpm merge-to-dev --check-only` runs `pnpm verify` itself**
  (`scripts/merge_to_dev.py:137-141`). Do not run a standalone `pnpm verify`
  first — it doubles a 171s-cold suite for nothing.
- `pnpm` needs Node ≥ 22.13; the tool shell defaults to Node 20.

## Where everything lives

All under `.scratch/stage-gate/ledger-consolidation-and-merge-train/`:

| File | What it is |
| --- | --- |
| `HANDOFF.md` | this file |
| `merge-order.md` | the merge sequence, pin state per step, ticket renumber map |
| `plan.md` | revision 2 — the executed plan, Phase A and Phase B |
| `decision-log.md` | every gate outcome and disposition, dated |
| `execution-report.md` | what Phase A actually did, with the deviation ledger |
| `reconciliation.txt` | the 13/14/15 set comparison, with commands |
| `state-at-exec.txt` | measured state at execution time |
| `plan-review.md` | round-1 adversarial review (F1–F12) |
| `logs/` | per-agent work logs — read these to resume interrupted work |

The three branch review files are at `docs/reviews/`:
`docs-fork-upstream-touchpoints.md`, `feat-spec-registry.md`,
`fix-sim-header-null-assertion.md`.
