Status: closed
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# Net set-bonus minor follow-ups (bundle)

Four smaller findings from round 6, bundled because each is small on its
own.

- **A3** — the `bonusDpsNet` loop only corrects break keys present in the
  4pc package's own `breaks`; a 2pc package breaking `(Y,t)` in a slot the
  4pc package did not use leaves `+B` uncorrected. Also
  `candidateSlotIndex` keeps only the first pool slot per item, so
  ring/trinket members get counted in the wrong slot.
- **A4/D3** — the `advancesPieceCount` guard was removed, so a same-set
  piece replacing a worn same-set piece
  (`piecesAfterSwap == piecesWornBefore`) still gets full future credit,
  and `piecesNeeded` is low by one.
- **A5** — `fork-set-net.test.ts` is `describe.skipIf(!forkPresent)` and
  the fork is gitignored, so CI never runs it. Add fixtures for 476/477/A3
  and note the CI gap in docs.
- **D2** — document (ADR or the 467 ticket) that with 'full' credit, row
  values are NOT additive across a shortlist — each Thunderheart piece
  carries the whole 2pc+4pc.

## What would close this

Each item fixed or explicitly wontfixed with reason recorded in a comment
on this ticket.

## Comments

2026-09-24 (round 2, closed): every item fixed or wontfixed. Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb` (engine: set-value.ts,
rank.ts, view.ts, PROVENANCE rows); main red fixtures `43634fb9`, re-pin
`7f4b98af`. Checks: `npx vitest run packages/core/test/fork-set-net.test.ts
packages/core/test/wowsims-fork-parity.test.ts` rc=1 before the engine edit
(exactly 476-A, 476-B, 477-P, 477-T, A3-U, A4 red) and rc=0 after; fork
`node node_modules/typescript/bin/tsc --noEmit` rc=0, `npx oxlint ./ui` rc=0;
`pnpm verify` rc=0; layout gate `{"outcome":"measured","passed":53,"failed":0,"a11yFailed":0}`.
These suites skip in CI (fork gitignored), so the local rc above is the evidence.

- **A3, sign:** fixed. The correction is now `set-value.ts` `netInflation`,
  `Σ (membersPkg − members2pc − pkgEnd + twoPcEnd)·B`; the old code
  subtracted `twoPcEnd`. It was hidden at worn 4, where
  `members2pc − twoPcEnd = 1 = twoPcEnd`. Pinned by 476-B (net4 80; red 180).
- **A3, key union:** unreachable today, not fixed as a live bug. rank.ts now
  passes the union of package breaks, 2pc-package breaks and member-single
  breaks, but the 2pc package is a prefix of the 4pc package and a member
  single never breaks what its package keeps, so the union equals the
  package's own breaks. Unit-tested only (A3-U: raw 100, twoPcEnd-only key,
  B 40, net 60).
- **A3, ring/trinket slot:** wontfix. No member of an implemented set
  (626/629/640/641/676/680) is type 11 or 12, so `candidateSlotIndex` keeping
  the first pool slot cannot miscount a set piece. Pinned by A3-R.
- **A4/D3:** fixed. Fixture A4 (worn Thunderheart hands + legs, the pool holds
  the worn hands) showed the owned row with futures `[{4, piecesNeeded 2,
  dps 80}]` and credit 80 for a swap that changes nothing. `applySetContext`
  builds `futureBonuses` only when `piecesAfterSwap > piecesWornBefore`; the
  owned row now has none and credit 0, the head row keeps 80. Because each
  implemented set has at most one piece per slot, the only same-set piece that
  replaces a worn same-set piece is the worn item itself (owned), so the
  guard covers the "piecesNeeded low by one" case too.
- **A5:** fixed. `docs/agents/known-traps.md` § Before running node / pnpm /
  test commands now says the fork-gated suites never run in CI and asks for
  the local command and rc (main `9d0a8575`).
- **D2:** fixed. `docs/adr/0034-set-bonus-row-values-are-not-additive.md`
  (main `9d0a8575`): full 4 × 90 = 360, split 4 × 5 = 20, package net 90;
  pinned by 476-A.

2026-09-25 (targeted engine review, finding P6;
`docs/reviews/feat-tab-signoff-followups.md`): the A4/D3 item above says
each implemented set has at most one piece per slot. A re-runnable check,
from the repo root with the fork clone present:

```sh
node -e "const d=require('./vendor/tbc-new-fork/assets/database/db.json');const ids=new Set([626,629,640,641,676,680]);const n=new Map();for(const i of d.items){if(ids.has(i.setId)===false)continue;const k=i.setId+':'+i.type;n.set(k,(n.get(k)||0)+1)}const dup=[...n].filter(([,v])=>v>1);console.log('pairs',n.size,'dups',dup.length);process.exit(dup.length?1:0)"; echo rc=$?
```

Run 2026-09-25 at fork `2cf4ec46e`: `pairs 36 dups 0`, rc=0. The set list
in the command is the table as of that date. Test A3-R now reads the list
from the engine's exported `IMPLEMENTED_SET_IDS` (finding S7), so a set
added to the table is covered there. The second unsourced claim, "a member
single never breaks what its package keeps", still has no command.
