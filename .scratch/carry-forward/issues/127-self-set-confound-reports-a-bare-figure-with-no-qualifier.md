Status: closed
Type: bug
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (adversarial axis, 3-A1)
Blocks: none
Blocked by: ticket 119 (same root cause; this is the disclosure half of it)

# A self-set confounded set bonus prints as a plain measurement with no qualifier

Ticket 119 anomaly A already records the arithmetic defect: when exactly one
piece of a set is worn, `rank.ts:1067-1088` returns early for the 2-piece
threshold (`addedPieces.length === 1` → `unmeasurable-at-this-worn-count`),
and that `continue` runs before `rank.ts:1162`'s
`if (threshold === 2) twoPieceBonus = synergy.bonusDps`. So the 4-piece figure
is computed by `set-value.ts:353` as
`packageDeltaDps - sumSingles - (input.twoPieceBonus ?? 0)` with the 2-piece
term missing.

What this ticket adds is that **nothing on any surface says so**. The figure is
reported as an ordinary measurement, with a standard error, and the reader has
no way to tell it is confounded.

Live in the committed artifact
`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`, Crystalforge
Battlegear (setId 629), `piecesWorn: 1`:

```
threshold 4: packageDeltaDps -26.77179572189698
             bonusDps        -9.924693454980343
             se              4.9633230225772005
             twoPieceBonus   absent
```

Reproduce the arithmetic from the same file — the three singles are 30131
(-0.46959810771954835), 30132 (-5.609560745483805), 30133
(-10.767943413713283):

```
-26.77179572189698 - (-16.847102266916636) - 0 = -9.924693454980343
```

which is the reported figure exactly, confirming the 2-piece term was never
subtracted.

`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html:645` then
renders `set bonus -9.92 DPS` with only the standing gem-model qualifier, four
lines under `:641`'s `can't be measured from this starting gear` for the same
set's 2-piece threshold. The two lines are adjacent and the dependency between
them is invisible.

The existing disclosure machinery does not fire here: `formatBreaksPrefix` and
the panel's qualifier line key off cross-set `breaks`, and a confound against
the set's *own* lower threshold produces no `breaks` entry.

Note this is a regression in disclosure, not in arithmetic. Before ticket 119
the 2-piece row printed a fabricated `0.00`, which at least hinted that the two
thresholds were coupled. Ticket 119 correctly stopped printing that fake zero
and, in doing so, removed the only visible trace of the coupling.

Re-run the artifact with:

```
pnpm rank --offline --region US --realm dreamscythe --character slamaltman \
  --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report
```

## Why it is filed rather than fixed

Ticket 119 step 2 already puts the suppress-vs-qualify choice in front of the
owner, and the fix for this ticket is the rendering half of that same decision
(reuse `breaks` with the set's own id, or add a sibling field). Making the call
inside a review would pre-empt the decision 119 exists to ask for.

## Acceptance

- [x] A set bonus computed without its lower-threshold term is not presented as
      a bare measurement — it is either suppressed or carries a qualifier
      naming the missing term.
- [x] The Crystalforge 4-piece-at-1-worn case in the ret artifact is covered by
      a test, and the same set at 0 worn stays clean.
- [x] `.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html` no
      longer shows an unqualified `set bonus -9.92 DPS` beside an
      unmeasurable 2-piece line.

## Closing note (2026-08-12)

Closed by commit `102b425` on `feat/set-bonus-value`. Chose the qualifier
shape (not suppression), as a sibling `selfConfound?: { threshold }` field on
`SetBonusValue` rather than reusing `breaks` — the self-set case is "this
figure's own lower term is missing", a different claim from `breaks`'
"another set's bonus leaked in", and folding them into one field would have
blurred that. `rank.ts`'s `buildSetBonuses` sets it directly when the
sibling 2pc entry for the same set came back
`unmeasured: "unmeasurable-at-this-worn-count"`; `formatSetBonusLine` and
`setBonusEntry` in `rank-report-rules.ts` render it, mirroring
`formatBreaksPrefix`'s front-loading. Verified with
`pnpm --filter core exec vitest run test/rank.test.ts test/rank-report.test.ts`
and a full `pnpm verify`, both green.

For the committed `slamaltman-p3.html`/`.json` pair: a live re-run with the
ticket's own command reproduced the Crystalforge figures bit-for-bit but
changed an unrelated field (a sim-crash substitution's Go stack trace —
goroutine id and pointer addresses, not this bug), so per the ticket's own
"stop and prefer option (a)" instruction, the JSON was **not** regenerated.
Instead `withSelfConfoundDisclosed` (a pure, render-time derivation from the
sibling 2pc row already in the JSON) was added and wired into
`renderRankHtml`, and only `slamaltman-p3.html` was rewritten from the
existing, untouched `slamaltman-p3.json`. Be honest about the asymmetry this
leaves: **`slamaltman-p3.json` still carries the bare `bonusDps` with no
`selfConfound` field** — only the HTML surface is fixed on this branch. A
future live re-run (once ticket 123's stack-trace nondeterminism is settled,
or by hand-patching just this field) would bring the JSON in line, but that
was out of scope here.

**The arithmetic half is still open as ticket 119.** This ticket closes only
the disclosure gap — `bonusDps` on the Crystalforge 4pc-at-1-worn entry is
unchanged (`-9.924693454980343`), still computed as `4pc − 2·2pc` per ticket
119 anomaly A. Nothing here suppresses or corrects that figure.
