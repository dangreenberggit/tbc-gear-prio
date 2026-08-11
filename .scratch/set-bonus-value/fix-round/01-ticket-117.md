# Worker log — ticket 117 (meta repair used uncapped gem list)

Date: 2026-08-11. Branch: `feat/set-bonus-value`. Commits: `a61628a` (code +
tests), this log and the ticket update in the follow-up commit.

## What was wrong

Ticket 111 capped the automatic socket-filling step at rare-quality gems, but
the step that swaps gems around to keep a meta gem's colour requirement
satisfied (`repairMeta`) still shopped from the full gem list. It never touches
the meta socket itself — only the coloured sockets around it — so on any helm
with a meta socket it was quietly replacing the rare gems the fill had chosen
with epic gems the player may not own. Measured in the convergence check: both
helm arms ended up with epic 32220 in the coloured socket.

## The owner's decision

Cap the coloured-socket swaps at the same rare limit the fill uses (option 1 in
the ticket). The sim compares gear upgrades, not hidden gem upgrades. The meta
socket may keep whatever it needs to stay solvable.

## What upstream wowsims does (checked first, at the pin)

The pinned `wowsims/tbc-new` commit `8aa378b` has **no automatic gem-choosing
code at all** — no suggest-gems file anywhere in its tree, and the gear/gem UI
files only do manual picking, migration-on-equip that leaves leftover sockets
empty, and an "is the meta active" check. When the colour requirement fails,
their sim just withholds the meta bonus; it never swaps gems for you. So our
repair pass has no upstream counterpart and there was nothing to copy. The
suggest-gems button the owner used on the web is not in the pinned source (nor,
by filename, at that repo's current tip); the nearest findable relative is
`wowsims/wotlk`'s `suggest_gems_action.ts`, which rebuilds all gems from
hardcoded per-spec lists and has no rarity logic. Full detail in the ticket.

## The change

- `packages/core/src/rank.ts` — both `repairMeta` call sites (worn-gear repair
  at rank start, candidate-swap path) now pass the rare-capped
  `GemContext.fillPalette` instead of the full palette.
- `packages/core/src/candidate-gems.ts` — rewrote the `fillPalette` docstring
  that claimed repair keeps the full list.
- `repairMeta` itself unchanged. Solvability is unaffected: any non-meta gem
  may sit in any coloured socket, every colour exists at rare, and all 18 TBC
  metas are quality 3 so the fill still seats them.

## Tests

- `packages/core/test/rank.test.ts` — "meta repair never places a gem above the
  rare fill cap" (describe "equipmentForCandidateSwap gem quality (ticket
  117)"). Red before the fix: the swap onto Cursed Vision seated epic 30549 on
  the helm and epic 32220 twice on the chest.
- `packages/core/test/meta-repair.test.ts` — "still solves from the rare-capped
  palette (ticket 117)".

`pnpm verify` green before commit.

## Re-measured helm A/B (Cursed Vision 32235 vs Vengeful 33672)

Owner's gear + TypeSimple rotation, seeds [11,22,33,44,55] @ 3000 iterations,
pinned wowsimcli v0.0.101. Re-run:

    pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build_convergence_arms_0811.ts
    python .scratch/set-bonus-value/loop-103-106/sim_convergence_0811.py

Both helm arms now carry rare 24061 in the coloured socket (was epic 32220).

- Cursed − Vengeful: **+6.76** (SE 0.912), per-seed 6.778, 6.675, 6.677,
  6.837, 6.838. Owner web: +10.69 (SE 0.693). Gap −3.93, z 3.43.
- History: +8.61 (before any cap) → +7.90 (fill capped, repair uncapped) →
  +6.76 (both capped). The suspicion that the epic repair swap caused the
  earlier drop is **disproven in direction**: removing the epic moved the
  figure further from the owner. The remaining gap is not a gem-quality issue;
  the ticket-113 web-vs-CLI offset remains open.
- Sanity checks from the same run: baseline 2219.82 matches the pre-fix run
  exactly (same engine), belt swap +50.45 unchanged (no meta socket involved).

Transcript: `.scratch/set-bonus-value/loop-103-106/sim_convergence_0811_ticket117.stdout.log`;
per-seed numbers in `sims-convergence-0811/per-seed.json`.

## Ticket state

`.scratch/carry-forward/issues/117-...md` is `Status: resolved` with the
decision, the upstream finding, the fix, and the measurement recorded.
