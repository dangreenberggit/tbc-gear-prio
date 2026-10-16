Status: open
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

- On `dev`: `sed -n '/^### Stage 3T/,/^### Stage 4/p' PLAN.md | grep -c '☐'` → 0.
- `grep -c 'Live tab from a pair (agents)' docs/agents/paired-worktrees.md` → 1 on `dev`.
- The `dev` -> `main` / `tab-1` question has been put to the owner.

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
