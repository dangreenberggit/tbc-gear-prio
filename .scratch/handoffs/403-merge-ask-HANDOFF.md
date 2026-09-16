# Handoff — ticket 403 done, branch awaiting the owner's merge ask

Written 2026-09-16. Branch `feat/desktop-transport-gate` @ `2a5fbc09`, clean.
Fork `vendor/tbc-new-fork` @ `cfbd7fce`, clean, **not pushed**.

## The one remaining step

**Ask the owner whether to merge, then `pnpm merge-to-dev`.** Nothing else is
outstanding on this branch.

`pnpm merge-to-dev --check-only` exits **0** (`check-only: ok (not merging)`).
The pre-merge review is written and committed. Per AGENTS.md the merge needs a
**separate explicit ask** — the owner asking for the review is not permission to
merge. `pnpm merge-to-dev` is the only supported door; never a raw `git merge`,
never `TBC_ALLOW_DEV_MERGE=1`.

One advisory the check prints and does not block on: **24 open tickets name a
file this branch changed.** Most predate this work (they name shared scripts like
`assemble_universe.py`). Three are this branch's own review findings — 407, 408,
409 — and are deliberate defers, not oversights.

## What landed

Ticket 403: the upgrades tab stopped using the Go bulk-screening RPC on the
desktop transport and now uses the per-candidate loop the web tab already used.
**263 s to 19 s at cap 40**, rows byte-equal to the pre-fix screening-off twin.
No Go change, no proto change, no upstream divergence — the fork commit is two
TypeScript files.

The desktop gate's screened-vs-unscreened check was replaced by a **golden
readback** (`data/desktop-gate/golden-ret-p5-cap40.json`), compared on `rows`,
`aboveCutoffItems` and `baselineDps` with exact equality. Its determinism licence
was measured, not assumed: two cap-150 runs agreed exactly on all three fields.

Full-pool projection is **~149 s, band 86-211 s** against today's measured
3419 s — **hypothesis, untested**, and labelled that way everywhere it appears.
Constraint: do **not** run the full pool to check it.

## If you are picking up the review findings instead

- **407** — `--full --update-golden` writes a cap-0 golden that check (h) never
  reads; a developer can regenerate, commit, and believe the gate is refreshed
  while the real golden stays stale. Carries three minor same-file cleanups.
- **408** — the verify gate counter miscounts in both directions. Sharp because
  ticket 400 exists to make that count trustworthy.
- **409** — a fixture version guard compares a value to itself. It is a
  regression from ticket **390**'s own fix, so do not revert 390 wholesale, and
  do **not** "fix" the harmless sibling at `bulk-screen-driver.test.ts:35`.

## Two things worth knowing that are not defects

**398 moved without being touched.** The domain axis found that the two runs
differing by 159.3 DPS report **identical character stats** (AP 3895, Melee Crit
286, Expertise 73, Strength 632). Stats are downstream of gear, gems, enchants,
buffs and consumables, so that whole family is eliminated. What remains is
invisible on the sheet — fight length, target count, or encounter defaults.
Appended to 398; it stays open, cause unknown. It blocks nothing.

**404 now has a concrete instance.** Paired replication is a global top 8, so the
Neck slot's top two (ranks 9 and 10, 3.6 DPS apart against ~2.6 DPS combined SE,
about 1.4 sigma) are ordered on unreplicated values. Real, low-stakes, and
pre-existing on both transports — not introduced here.

## Environment traps that cost time this session

- **`cd X && <cmd>` breaks** — fnm kills the chain, including for git, grep, sed
  and python. Use `git -C <abs>` and absolute paths.
- **Bare `pnpm` fails**; `fnm exec --using=22 -- pnpm.cmd <script>` as its own
  command.
- **`docs/reviews/*.md` is prettier-formatted**, so review tables get padded
  columns and CRLF. String-matching a table row from memory will miss; read the
  line first.
- **The merge check parses the Disposition table.** Every `defer` row must carry
  a real `.scratch/carry-forward/issues/...` path — prose like "folded into 408"
  fails the gate. That is a real catch, not a nuisance.

## Do not

Push the fork, merge to `dev`, or merge to `main` without the owner's explicit
ask. `main` only receives `dev` on a checked PLAN.md §14 gate in
`docs/verification-log.md`.
