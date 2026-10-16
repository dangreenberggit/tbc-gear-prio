Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-blocking rows)
Type: task
Origin: .scratch/stage-gate/tab-blocking-finish/decomposition.md (deferred part P2)
Blocks: none
Blocked by: none

# Re-run Stage 3T on the final dev, record it, and ask about dev -> main

## The words it serves

- Owner, 2026-10-12T17:51Z (session 55df607d, quoted in
  `.scratch/handoffs/upgrades-tab-blocking-rows-HANDOFF.md` § Owner rulings):
  "Stage 3T boxes 1, 3, 4 and 5 are met but not recorded in
  docs/verification-log.md, so record them on a branch as well."
- Owner, 2026-10-15, on the paired-worktrees bullet (handoff § Proposal),
  verbatim: "sure".
- Session decision told to the owner 2026-10-15T19:42Z (handoff § Session
  decisions): `docs/stage-3t-boxes` merges last, after boxes 1, 3 and 4 are
  re-run on the final `dev`.

## Goal

1. In pair `C:\Users\dgree\Code\lulz\tbc-wt\stage-3t-boxes` (branch
   `docs/stage-3t-boxes`, tip `14068730` when this was written), merge the
   final `dev` and re-run Stage 3T boxes 1, 3 and 4, and box 5 (the fork pin
   moved four times in P1), with the commands in PLAN.md `### Stage 3T`.
   Tick box 2 too: after P1 the Tab-blocking count on `dev` is 0.
2. Record the results in `docs/verification-log.md` § Stage 3T and the boxes
   in PLAN.md on that branch.
3. Add the approved bullet (text in the handoff § Proposal, verbatim) after
   the **Live tab** bullet of `docs/agents/paired-worktrees.md` § Work in it,
   on the same branch.
4. Run `pre-merge-review` on the new commits, ask the owner to merge, merge
   with `pnpm merge-to-dev docs/stage-3t-boxes`.
5. Ask the owner about `dev` -> `main` with tag `tab-1` (PLAN.md
   `### Stage 3T`, last paragraph), including whether to push `dev` and the
   fork's `feat/upgrades-tab-react`. Do not act on it without a yes.

## Done means

- On `docs/stage-3t-boxes`, which reaches `dev` only through
  `pnpm merge-to-dev docs/stage-3t-boxes`:
  `sed -n '/^### Stage 3T/,/^### Stage 4/p' PLAN.md | grep -c '☐'` → 0.
- `grep -c 'Live tab from a pair (agents)' docs/agents/paired-worktrees.md` → 1
  on the same branch.

Narrowed on 2026-10-16 by the pre-merge review of `docs/stage-3t-boxes`
(findings B3, S3). The first two lines said "On `dev`", which no branch
commit can make true, and a third line required the `dev` -> `main` /
`tab-1` question to be put to the owner. Steps 4 and 5 above are the
session's: the merge ask, and the `main` question, which PLAN.md
`### Stage 3T` (last paragraph) keeps open until the merge to `main`. The
session relayed that the owner said on 2026-10-16 there is no rush to
`tab-1`; the pre-merge review did not see the owner's words.

## Seam contract (what P1 gives this part)

- `dev` holds the merges of `feat/tab-small-fixes`, `feat/tab-view-filter`,
  `feat/tab-set-bonus` and `feat/tab-item-lists`; the Tab-blocking count is 0
  and both scope-doc loops print nothing.
- `data/wowsims-fork.lock.json` `commit` on `dev` names the item-lists fork
  tip; the main checkout's fork clone is on `feat/upgrades-tab-react` at that
  commit; nothing is pushed (`"pushed": false`).
- `data/desktop-gate/` pins and golden and the six `data/tab-fixtures/`
  were re-measured on that fork commit in P1 chunk K4.

## What P1 learned that this part needs

- `docs/stage-3t-boxes` changes `scripts/check_desktop_tab.py` (ticket 627:
  a byte mismatch now fails the gate). `feat/tab-item-lists` also changes it
  (`EXPECTED_ELIGIBLE` and the other pins); `git merge-tree` reported no
  conflict between the two. After the merge, box 4 runs the stricter gate for
  the first time on the new pins: a byte-mismatch failure there is a finding,
  not a reason to loosen the check.
- Merging `dev` into `docs/stage-3t-boxes` conflicts only in
  `.scratch/carry-forward/issues/NEXT` (take the larger number) and
  `.scratch/carry-forward/map.md` (keep both sides' lines)
  (simulation with `git merge-tree --write-tree`, 2026-10-15).
- Box 3 serves the fork's `dist/` with `http-server`; rebuild `dist/` in the
  pair (`make -C <pair>/vendor/tbc-new-fork dist/tbc/.dirstamp`) after the
  merge, so the WASM engine matches the final fork commit (review
  `docs/reviews/docs-stage-3t-boxes.md` R2).
- The box 3 and box 4 `CAPPED_ROWS` value is the one P1 K4 measured (40).
- One live backend on port 3333 at a time; check that no other folder's
  backend holds it first (`docs/agents/paired-worktrees.md` § Work in it,
  **Live tab**).

## Comments

2026-10-16, closed on `docs/stage-3t-boxes`. Before the re-run, both pins
moved to upstream `master` `e804c29e8d615fcc6dcc632a1b0c782605e27d46`
(release v0.0.150): the engine lock, and the fork through merge commit
`bc96d0a03` on `wt/stage-3t-boxes` with `branchedFrom` set to that commit.
Boxes 1 to 5 were then run on fork `bc96d0a03` and recorded in
`docs/verification-log.md` § Stage 3T (the 2026-10-16 entry), and ticked in
PLAN.md `### Stage 3T`. Box 3's expected row count is now 40
(`data/desktop-gate/README.md:34`). Ret figures did not move: the desktop
gate's check (h) and the WASM run both match
`data/desktop-gate/golden-ret-p4-cap40.json` exactly. The ticket's goal steps
4 and 5 (the merge ask and the `dev` -> `main` / `tab-1` question) are the
session's to put to the owner; they need no further work on this branch.

Verified by: `sed -n '/^### Stage 3T/,/^### Stage 4/p' PLAN.md | grep -c '☐'`
prints 0, and `docs/verification-log.md` § Stage 3T, 2026-10-16 entry, quotes
each box's command and output.
