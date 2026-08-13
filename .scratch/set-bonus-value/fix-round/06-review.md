# Fresh-context review — fix round (b3321cd..801065a)

Reviewer: fresh-context agent, no prior round context. Branch
`feat/set-bonus-value`, Windows, Node 22.

Scope: a61628a, 559976a, ee2a4e4, 83ca4ae, 61dbe4f, b8d033e, 40cd0e8, ff55700,
55c6299, 0fbcc67, 96ec2d5, 801065a.

Verification run: `pnpm verify` green on this machine (see finding 1 for why
that is not evidence about CI); targeted `vitest` runs on the five changed
test files (52 tests, all green); direct probes of `firstLineOf`,
`packageSetPotentialDps`, and the two committed artifacts.

**Verdict: one blocker (CI-breaking test dependency), otherwise a solid round
that does what the tickets and the owner's decisions say.**

---

## Blocker

### 1. `rank-package-artifacts.test.ts` depends on a gitignored, untracked file — CI will fail

`packages/core/test/rank-package-artifacts.test.ts:33` loads
`.scratch/rank-reports/shredzepelin-p3.json`. That path is **not tracked by
git** and is **actively ignored** (`.gitignore:40` — `.scratch/*` with a list of
re-included subfolders that does not include `rank-reports/`). Confirmed with
`git check-ignore -v` and `git ls-tree -r HEAD`: zero files under
`.scratch/rank-reports/` exist in the commit.

The load happens at module top level, not inside a test, so the whole file dies
at collection with `ENOENT` — not one skipped assertion but eight lost tests.
Reproduced by temporarily moving the file aside:

```
Error: ENOENT: no such file or directory, open '...\.scratch\rank-reports\shredzepelin-p3.json'
❯ loadArtifact test/rank-package-artifacts.test.ts:23:29
Test Files  1 failed (1)
```

The CI workflow (`.github/workflows/verify.yml`) does a plain
`actions/checkout@v4` and restores only `vendor/wowsims` and
`vendor/atlasloot` — nothing regenerates a rank report. So `pnpm verify` on a
fresh clone fails at this file. It passes locally only because the developer's
working tree happens to still hold the file from the regeneration run.

This round's own log says so in as many words:
`.scratch/set-bonus-value/fix-round/05-reports.md`, "What was committed vs
left" — "Left: everything under `.scratch/rank-reports/` … that folder is
gitignored, so those are untracked scratch outputs by convention." The ret half
of the same test file reads a **committed** artifact
(`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`, tracked at
801065a) and is fine; only the feral half is unbacked.

This is also precisely the failure mode AGENTS.md § Durable claims names: "Never
assert that a gitignored or untracked generated input is present for a fresh
worktree." Ticket 118's acceptance box and several ticket comments in this round
record "`pnpm verify` green" without qualifying that the green depended on an
untracked file.

Fix directions (owner's call, not applied): commit the feral artifact the way
the ret one was committed, or move the feral fixture's numbers inline the way
`rank-package-thresholds.test.ts` already does, or guard the load. Note that
committing it would also make the byte-stability of a regenerated report a live
concern, which inlining would not.

---

## Should-fix

### 2. `packageSetPotentialDps` — one NaN figure silently suppresses a real positive sibling

`packages/core/src/rank-report-rules.ts:524-531`:

```ts
const best = Math.max(...pkgs.map((p) => p.deltaDps));
return best > 0 ? best : item.deltaDps;
```

`Math.max` returns `NaN` if any element is `NaN`, and `NaN > 0` is false — so a
single corrupt figure makes the function fall back to the row's own delta and
**discard a perfectly good positive figure from the other threshold**. Probed
directly: `packages: [{deltaDps: NaN}, {deltaDps: 11}]` with `deltaDps: 5`
returns `5`, not `11`.

Ticket 115 was closed in this round on the reasoning that "Emission no longer
reads any number, so no numeric value — NaN included — can switch it." That is
true of the **chip marker's emit guard**, which is now the membership fact. It
is not true of the **sort key**, which still reads numbers and still has a NaN
edge — a different one from the old bug (this one hides a figure rather than
showing a spurious marker), but the same family, in the same feature, closed in
the same round on a NaN argument. Worth a `Number.isFinite` filter before the
max, or an explicit decision that a NaN package figure is impossible upstream
and should be asserted rather than tolerated.

Severity is should-fix rather than blocker because nothing in the current
pipeline is known to produce a NaN `packageDeltaDps` — `computeSynergy` derives
it from two observed DPS values. But the row-level guard against exactly this
was the point of ticket 115.

### 3. Ticket 119 stores a completing-piece id that no surface can display

`packages/core/src/rank.ts:1076-1087` deliberately keeps `packageItemIds` on the
unmeasurable entry, with a comment saying "The completing piece is still named
so a renderer can say which item would finish the threshold." Both ticket 119's
resolution note and ADR-0023 decision 6 repeat that claim.

No renderer does, and none can without a change:

- `setBonusEntry` (`rank-report-rules.ts:291-296`) returns early for any
  `unmeasured` value with **only** the reason line, before the
  `packageItemIds.length > 0` branch at line 308 is ever reached.
- `formatPackageContents` (`rank-report-rules.ts:339`) returns `""` for any
  `unmeasured` value, by explicit design and comment.
- `memberPackages` filters `unmeasured` entries out, so no row carries it either.

Confirmed against the committed ret artifact: the JSON entry carries
`"packageItemIds": [30131]`, and the rendered HTML panel entry for Crystalforge
2pc shows the reason text alone with no mention of the War-Helm.

The data being retained is harmless and arguably right; the **claim** that a
renderer can use it is a forward-looking statement written as present capability
in an ADR and a ticket resolution. Either surface it (the reason text is
actually a natural place — "…one piece short of this threshold" could name the
piece) or reword the claim to say the id is retained for a future renderer.

### 4. `rank-package-artifacts.test.ts`'s header comment contradicts what the artifacts contain

Lines 9-15 say: "The artifacts were generated before this change, so their
`setContext` still carries the old single-package shape — these tests re-run the
attachment over the artifacts' `setBonuses`."

The ret artifact committed at 801065a is post-change: every one of its 11
package-carrying rows holds the **new plural** `setContext.packages`, zero hold
the old singular `package`, and its Crystalforge 2pc already reads
`"unmeasured": "unmeasurable-at-this-worn-count"` (a ticket-119 output). The
comment was written against the pre-regeneration artifact at ee2a4e4 and was not
updated when 801065a replaced it.

The tests themselves are unaffected — they re-derive from `setBonuses` either
way, which is still the more robust thing to do. But a comment that tells the
next reader the committed fixture has an old shape, when it has the new one, is
the kind of stale durable claim this repo's rules exist to catch, and it sits
directly above the code in finding 1.

---

## Notes

### 5. `firstLineOf` adds the "full text" pointer to details that have no hidden text

`packages/core/src/rank-report.ts:367-370`. The trim is otherwise well built —
it handles real newlines and written-out backslash-n pairs, `\r\n` included, and
`esc()` is correctly applied *after* the trim so nothing escapes the escaping.
Two harmless edges, probed directly:

- `"trailing\n"` → `"trailing … (full text in the JSON report)"`. Nothing was
  actually withheld; the pointer sends a reader to the JSON for a second line
  that does not exist.
- `"\nleading"` → `" … (full text in the JSON report)"` — an empty first line,
  so the drawer entry shows the field name and nothing else.

Neither can arise from the one substitution shape in the committed artifacts,
and the three new tests cover the cases that do arise. Cosmetic only.

### 6. The rendered ret substitution now ends mid-JSON

Real output from the committed artifact:

```
...sim error: {"type":"ErrorOutcomeError","message":"interface conversion:
*retribution.RetributionPaladin is not hunter.HunterAgent: missing method
GetHunter … (full text in the JSON report)
```

The trim is doing exactly what ticket 123 asked (the reader gets the diagnosis,
2.4KB of goroutine frames stay out), but because the sim error is a stringified
JSON object, the first "line" is an unterminated object literal — an opening
brace and two unclosed quotes. It reads slightly oddly rather than wrongly. If
it bothers the owner, trimming the JSON envelope rather than cutting at the
newline inside it would read better; not worth code churn on its own.

### 7. Ticket 119's skip changes when a package sim is spent, and that is invisible in the artifact

The `addedPieces.length === 1` early return is correctly equivalent to
"worn count = threshold − 1": `selectPackage` sets
`needed = threshold − piecesWorn` and `addedPieces` always has exactly `needed`
entries, and the outer loop has already skipped `threshold <= piecesWorn`. So
the guard cannot fire for any other configuration. Verified by reading
`set-value.ts:167-217`.

I also checked the one thing that could have silently moved a number: the skip
happens **before** `twoPieceBonus` is assigned, so at 1 worn the 4pc's
`computeSynergy` now gets no `twoPieceBonus` where it previously got `0`.
`computeSynergy` does `(input.twoPieceBonus ?? 0)`, so those are identical —
no figure moves. Recording it because it is the kind of thing an early `continue`
usually does break, and here it does not.

### 8. Test fixture in `rank-package-thresholds.test.ts` describes a state the engine can no longer produce

`packages/core/test/rank-package-thresholds.test.ts:235-252`: the Crystalforge
fixture has `piecesWorn: 1` with a 2pc entry carrying one `packageItemIds` entry
and a **measured** `packageDeltaDps: -0.47`. After ticket 119 landed in the same
round, `buildSetBonuses` would emit that exact configuration as
`unmeasured: "unmeasurable-at-this-worn-count"` with no measured figure.

The test is testing `formatCuratedPackagePointer`, a pure function that never
sees the engine, so it passes and proves what it says it proves. But the fixture
now depicts an impossible engine state, and the next person to reason about
"what does a 1-worn Crystalforge 2pc look like" from this fixture will get the
wrong answer. Cheap to realign (bump `piecesWorn` to 0, or use the Lightbringer
numbers the rest of the file uses).

### 9. Spec and ADR claims that I checked and found accurate

Recording these so the owner knows the spec axis was actually exercised, not
just asserted:

- **Ticket 117's central claim holds.** Both `repairMeta` call sites in
  `rank.ts` (line 462 worn-gear repair, line 1483 candidate swap) now pass
  `gems.fillPalette`. The solvability argument checks out at the code level:
  `bestRepairMove` (`meta-repair.ts:170, 175`) skips meta **sockets** and meta
  **candidates** on both loops, so the rare cap provably cannot reach the meta
  socket — "the meta socket may use whatever it needs" holds structurally, not
  by luck. The ticket's honesty about the disproven hypothesis (+8.61 → +7.90 →
  +6.76, moving *away* from the owner's +10.69) is exactly the right shape.
- **Ticket 116 is genuinely dead code.** `git grep` across the tree at 801065a
  finds no remaining reference to `fillCandidateGems` outside archive prose,
  the stash-salvage quarantine, and one explanatory test comment. No production
  caller, no barrel export.
- **Owner's "data, not editorial" directive is respected.** The row line, the
  chip marker and the panel all render negative package figures; only
  `packageSetPotentialDps` (the sort) ignores non-positive ones, and the
  docstrings say so. The control is not hidden, no advisory prose was added,
  and the default view is untouched — `packageOnlyShortlist` still gates on
  `belowCutoff` and no `belowCutoff` value is recomputed.
- **Sort key on all-negative sets is correct.** On the ret artifact the 7 rows
  whose best measured package is ≤ 0 (Crystalforge, Justicar) carry
  `data-package` equal to their own delta, so they are correctly excluded from
  `packageOnlyShortlist` while still showing their figures in the row detail.
  Exactly ADR-0024 amendment point 3.
- **The negative plausibility band's arithmetic is right.** `Math.abs(fraction)
  <= band` keeps the band the same width on both sides, and `bonusDps === 0`
  (rather than `<= 0`) is the correct new skip. The two message branches never
  cross-describe. `magnitudeWarning` on a row is a separate per-item flag, so
  the new negative warnings cannot demote rows out of the curated list.
- **Prose style is clean.** Scanned all new text in `src/`, `test/`, `docs/`,
  `spec.md` and the tickets for the owner's banned jargon: no new "no-op",
  "load-bearing", or "smear". (The two "no-op" hits are ticket 118's pre-existing
  filename and the phrase "no-package chips"; the surviving "load-bearing" in
  ADR-0024 is pre-existing text at line 69, not new in this round.)
- **New tests are substantive, not pass-by-construction.** The ticket-117 test
  carries an explicit anti-vacuous guard (asserts the meta is seated *and*
  active before checking quality, so it fails if the repair never ran). The
  ticket-119 test drives the real `rankUpgrades` through a synthetic sim and
  pins the confounded 4pc arithmetic as a deliberate current-behaviour marker.
  The ticket-122 test proves the run continued past the crash by asserting a
  healthy candidate still ranks.
