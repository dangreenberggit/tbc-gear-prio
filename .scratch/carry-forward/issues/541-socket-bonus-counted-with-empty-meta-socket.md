Status: closed
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, finding D3, 2026-10-03
Blocks: none
Blocked by: none
Related: 535

# The socket bonus counts as active when the meta socket is empty

## What was found

`socketBonusActive` in `packages/core/src/meta.ts` (lines 148-168) and its
verbatim port in the fork's
`ui/core/components/individual_sim_ui/upgrades/engine/meta.ts` (lines
53-74 at fork `3613d654f`) skip meta sockets and end with
`return sawColoured || !metaEmpty`. An item with an empty meta socket and
matching coloured sockets therefore gets its socket bonus.

The domain reviewer reports that the sim does not give it: the bonus needs
every socket to intersect (`sim/core/database.go:633-641` in the fork), an
empty gem has colour `GemColorUnknown = 0` (`proto/common.proto:405`), and
`ColorIntersects(Meta, Unknown)` is false (`database.go:766-775`).

Since ticket 535, `gearHitRating` and `layoutHitRating` (fork `caps.ts`,
`meta-repair.ts`) read this rule, so a head with an empty meta socket and a
hit socket bonus would count hit the sim does not give. The effect on any
ranking is not measured (hypothesis, untested); test 535-L0 matches the
sim's 52 gear hit on the ret-p3-p2 fixture, whose metas are filled.

## What would close this

1. Confirm the sim's rule with a Go or `computeStats` reading of one item
   with an empty meta socket and a socket bonus. Record the command.
2. If confirmed: return false when a meta socket is empty and the item has
   coloured sockets, in core and in the fork port (PROVENANCE cycle, see
   `docs/agents/known-traps.md` "Before editing a ported engine file"),
   with a test in each.

## Closed 2026-10-04: fixed at fork e413972db and main 9f03ed7c

**The sim's rule, recorded.** Fork commit `4aa92892` adds
`TestEmptyMetaSocketWithMatchedColouredSocketEarnsNoBonus` to
`sim/core/gem_test.go`. It builds an item with sockets `[Meta, Yellow]`
in-test, so it needs no database and cannot skip. With the yellow socket
matched: an empty meta socket gives no bonus; a seated meta gem gives it; a
seated but disabled meta gem gives it. Command:
`go -C vendor/tbc-new-fork test ./sim/core -run 'TestEmptyMetaSocket|TestEmptySocketNeverEarns|TestDisabledGemKeeps' -count=1 -v`
→ rc=0, `--- PASS` for the new test. The rule is the one in
`sim/core/database.go:632-644`: every socket must hold an intersecting gem,
and an empty socket intersects nothing.

**The fix.** `socketBonusActive` returns false when any socket, meta
included, is empty or holds a gem that does not match it. A socketless item
stays vacuously true. A meta gem in a meta socket matches by colour
equality, so the rule has no meta special case.
- Core: `packages/core/src/meta.ts`, main commit `9f03ed7c`.
- Fork port: `upgrades/engine/meta.ts`, fork commit `e413972db`, with the
  PROVENANCE cycle (parity test green before the hash moved; PROVENANCE
  row moved to `e2472d1b`; fork oxlint and tsc rc=0;
  `scripts/check_engine_port_drift.py` rc=0 after the re-pin). The two
  function bodies are identical (`diff` empty).

**Tests.**
- `packages/core/test/meta-repair.test.ts`: the 24545 `[0, 23113]` case now
  expects false; a new `[32409, 23113]` case expects true; the mismatched
  coloured socket case now seats a meta (`[32409, red]`) so it still tests
  the coloured socket and not the empty meta.
- `packages/core/test/candidate-gems.test.ts`: the old "bonus still live
  with no meta" case is rewritten. With no meta in the palette the yellow
  socket takes 24054 by raw EP (46 against 10). A new case adds 32409 to the
  palette: the meta is seated, the bonus is live, and the yellow socket
  takes 23113 (10 + 40 bonus beats 46). A guard test checks both EP margins.
- `packages/core/test/rank.test.ts`: the swap-path case for 24545 with no
  meta available now asserts the bonus is off and the yellow gem has the
  best fill EP. A kept live-bonus case seats a meta on the same item, with
  worn chest 21865, waist 23510 and hands 21863 giving Relentless its
  colours, and asserts the bonus is live.
- `packages/core/test/fork-meta-repair.test.ts` "541-F" checks the fork's
  `socketBonusActive` both ways; it failed before the fork edit.

**Hit consumers.** The fork's `caps.ts:gearHitRating` reads the rule
through `layoutHitRating` → `socketsMatch`. Its three consumers in
`upgrades/engine/rank.ts` are `baselineGearHit` (`:1128`), the version
reads' `buildHit` (`:1200`), and the per-candidate hit budget (`:4214`).
`npx vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/fork-set-net.test.ts`
→ rc=0, 124 tests, with no expectation changed: no fixture in those suites
has an empty meta socket beside a matched coloured socket.

**What the fill does with a meta socket.** It seats the spec's preferred
meta, or the best meta by EP when no preferred id is in the palette
(`packages/core/src/candidate-gems.ts:360-384`); a spec with no recorded
preference gets no meta (`:367`). It does this before the layout is scored. Repair never touches the meta socket. So a meta socket
that is still empty when a layout is scored reaches the sim empty, and the
sim pays no bonus for it; the old rule's credit had no source.

**ADR.** ADR-0025 Decision 3 has a "Superseded 2026-10-04 by ticket
541" note, and the ADR status line names it. Decisions 2, 4 and 5 are
unchanged.

**Blast radius.** The ADR-0025 command
(`npx tsx packages/core/src/cli.ts --region US --realm dreamscythe --character <c> --offline --spec <s> --show-below-cutoff`
for slamaltman/ret, shredzepelin/feral, nexess/feral) was run on the branch
before the core edit and again after it. The outputs are byte-identical
(`cmp` rc=0, 2661 lines each), as pre-registered. The likely reason is that
no layout scored for those fixtures has an empty meta socket beside matched
coloured sockets (hypothesis, untested; ADR-0025 Decision 3 gives the same
reason for its own null result). Evidence files
`541-blast-before.txt`, `541-blast-after.txt` and `541-blast-radius.txt`
(empty diff) are under `.scratch/stage-gate/round-11-followups/`
(gitignored).
