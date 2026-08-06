# Pre-merge review — phase-2/feral

Diffed against: `dev...phase-2/feral` (cc4e750, plus the fixes recorded below)

Four reviewers, each on the sharp lane (Opus, effort medium) with **fresh
context** — the diff and their own brief only, no access to the authoring
session. `codex` is not on `PATH` in this environment, so option 1 of the
dispatch ladder was unavailable; option 2 (fresh sharp subagents, all axes in
one parallel batch) ran normally. No wall, no downgrade.

Note the three-dot diff covers the **whole branch** (99 files, ~50 commits),
not only the most recent work.

## Adversarial

Five findings, two of them blocking.

**A1 — an item's recorded source depended on which tier was being assembled.**
The highest-severity class of bug this project defines: a confidently wrong
answer with no error. The universes are cumulative, so a p3 build reads the
p1-p2 Wowhead list too. Where the two guides phrased the same item differently
and only the later phrasing parsed, the item shipped with a real `raid` source
at p3 and a zoneless `{kind:"unknown"}` at p2 — and `matchesZone` requires
`"zone" in s`, so at p2 the item silently vanished from its own raid's view.

30017 Telonicus's Pendant of Mayhem is a Kael'thas drop; the feral p1-p2 page
writes it `Quest: … (Tempest Keep: The Eye)`, the p3 page writes `Drop: …`.
Confirmed before the fix:

```
feral-p2 30017 [{'kind': 'unknown'}]
feral-p3 30017 [{'kind': 'raid', 'zone': 'Tempest Keep', 'boss': "Kael'thas Sunstrider"}]
```

Ditto 30834 Shapeshifter's Signet and 29119 Haramad's Bargain in ret-p2 vs
ret-p3.

The root cause was a reasoning error in the branch, not a typo: it treated _no
parseable source_ as equivalent to _no origin exists_. **Fixed** — see
Disposition.

**A2 — `Quest:` and `Vendor:` prose was dropped on the floor**, 18 of 79 feral
p1-p2 rows and 20 of 87 p3 rows. This is what fed A1. **Fixed** for the shapes
the collected guides actually use; the remainder is ticket 45.

**A3 — the heroic branch ran before the "/" split**, so
`Drop: Trash (Heroic A / B)` produced one dungeon named `"A / B"`, matching
nothing and failing membership silently rather than tripping the
`phase_raids.json` guard (which only covers `raid`/`token`). Latent — no such
row exists in the collected data — but a real trap. **Fixed** by splitting
first, then classifying each side.

**A4 — the pinned counts were updated but the property that would have caught
A1 was never asserted.** Not hollow tests (the surrounding loop checks every
`kind` against `ITEM_SOURCE_KINDS`), but adding `"unknown"` to that allowlist
is exactly what made A1 invisible to it. **Fixed** — five new regression tests,
verified to fail without the parser fix and pass with it.

**A5 — `sources[0]` is whichever pipeline ran first**, not the most actionable
origin. Pre-existing; the slashed-zone split and `unknown` both widen it.
**Deferred** to ticket 44.

Explicitly cleared: the `ZONE_SPELLING_FIXES` entry is correctly scoped —
`canonical_zone` lowercases and exact-matches, so `"tempest keep: the eye"`
cannot collide with Tempest Keep's other wings.

## Domain

**No contradictions of `docs/phase0-findings.md` or `docs/verification-log.md`.**
Everything checkable against the pinned db verified.

- **`specID` honoured.** All three new fixtures read `specID: 0`; nothing on the
  branch reads the field. `talentPointsFromWclTalents` still treats
  `talents[].id` as points spent (R18) — cat and bear both `[0,45,16]`, summing
  to 61.
- **Tier sets correct, and confirmed the right way.** All 10
  `FERAL_TIER_PIECE_IDS` resolve to `setId` 640 (Malorne Harness, T4) and 641
  (Nordrassil Harness, T5), `armorType: 2`, `classAllowlist: [11]`. The
  Harness-vs-Raiment split is confirmed **on stats, as the comment claims**:
  29096 carries Str/Agi/AP where siblings 29087/29091 carry Int/Spirit/
  SpellDamage. The hazard here is real — Nordrassil Harness is 30222/30223/
  30228/30229/30230 while Raiment interleaves at 30216-30221, so an id-range
  guess would have grabbed restoration.
- **Equip rules correct** for TBC feral: cloth+leather, idols as
  `rangedWeaponType == 6`, one-handers allowed, no excluded weapon types.
  `CLASS_DRUID = 11` matches the db's `classAllowlist`, and the WCL-vs-wowsims
  class-id reversal is called out explicitly in the source.
- **Phase→raid mapping correct**: p3 = Black Temple + Hyjal Summit.
- **All 166 hand-transcribed entries validate** — every `itemId` exists in
  db.json with a byte-identical name and a slot matching `ITEM_TYPE_SLOT[type]`.
  Zero transcription errors.
- **`{kind:"unknown"}` is defensible in TBC terms**: the affected items are
  phase-1 persistent badge and reputation gear, so "not from a raid, present in
  all phases" is right. `Shapeshifter's Signet` entering the _ret_ pool is
  correct, not a leak — no `classAllowlist`, and it sits in upstream's own
  `ret_p1/p2.gear.json`.

Two unverified assumptions flagged, neither a defect:

- `data/two-hop/feral-tokens.json` joins piece→token by armour slot and
  self-declares that "Defender is the druid/warrior/priest token" needs a human
  check. That is the disclosure the durable-claims rule asks for. If wrong, a
  shortlist would name the wrong kill.
- `p1-p2.json` uses feral's _phase-2_ guide for a `p1-p2` stage file, where ret
  pairs its stage files with a pre-raid list feral has none of. Feral's phase-1
  non-raid gear is thinner as a result.

## Standards + Spec

### Standards

**One hard violation, now fixed.** Ticket 41's header read
`Status: partly fixed — …`. `scripts/check_merge_ready.py:35` captures the
first token, so it parsed as `"partly"`, and the ticket **disappeared from
`pnpm issues:open`** — a still-open finding made invisible by the tool meant to
track it. Confirmed by running it: 42 and 43 listed, 41 absent. Also restored
the `Blocked by:` header the tracker mandates.

Passing checks recorded: the Types-from-JSON route was followed correctly
(`unknown` added to both the JSON and the committed `as const`, with
`pool.test.ts` deliberately reading the JSON off disk); the new comments are
all _why_, none restate code; `formatItemSource` stays exhaustive.

Three judgement-call smells. `DRUID_TREE_SPEC` is an empty map — **wontfix**,
it is load-bearing: `CLASS_TREE_SPEC` uses key presence as the supported-class
test and the comment says so. The four parallel membership booleans in
`assemble_universe.py` (Primitive Obsession) and the duplicated count-bump
comments are noted and left.

### Spec

**Scope is clean.** All three scope questions resolve in the branch's favour
against the spec's own words:

- **ret universe edits respect the boundary.** The spec's operative sentence is
  _"no Phase 2 branch **re-generates or edits the existing `ret-p*.json`** —
  feral adds files beside them and leaves their bytes alone"_ (lines 80-82).
  `git diff --numstat` shows **zero deletions** on all four ret files; every
  hunk is an insertion, no existing row altered. Line 84 asks that any changed
  byte be reported, and this is that report: ret-p2 +5, ret-p3/p4/p5 +3 each,
  all curated ret items previously dropped in silence.
- **`feral-p3.json` is in scope.** Line 80 authorises _"ticket 05 must **add**
  `feral-p*.json`"_ — the glob, not `p1-p2`. The handoff's "p1-p2 alone
  unblocks the gate" states a sufficient minimum, not a ceiling.
- **The gate box is not failed by the `pool.ts` / `assemble_universe.py`
  edits.** Line 63 scopes it to _"without a structural change to `rankUpgrades`
  or its seams"_. `seams/` is untouched; `rankUpgrades`, `Deps`, `RankInput`,
  `Ranking` unchanged. `pool.ts` widens a union; the generator is explicitly
  outside the box.
- The handoff's §3 measurement exists in durable, re-runnable form in ticket 41.

**One finding, now addressed.** Ticket 05 was marked `Status: closed` while the
gate box it owns self-reports PARTIAL, with a stated closing condition ("once
41 is resolved or explicitly accepted") that is unmet. The box has been updated
to record what changed and why it still reads PARTIAL: only shredzepelin was
ever SME-reviewed, so "believable" is unevidenced for slamaltman and nexess.
**Closing it needs a domain pass on those two, not more pool work** — that is
the outstanding item for this gate box, and it is not something this branch can
close by itself.

Also outstanding, not yet due: the spec requires the phase gate be written into
`docs/verification-log.md` before `phase-2/trust` merges to `dev`. No feral
entry exists there yet. That gates the `dev` merge, not this branch.

## Summary

Four axes, ten findings. Two were blocking and both are fixed: a silent
wrong-answer bug where an item's source depended on the tier being assembled
(A1), and a ticket-tracker break that hid an open finding from `pnpm
issues:open`. Domain found zero contradictions and verified all 166
hand-transcribed rows against the pinned db. Spec found no scope creep and
confirmed the ret-universe changes respect the boundary the spec actually
draws.

After the fixes: `pnpm verify` green, **357 tests** (up from 352 — five new
regression tests, each verified to fail without the fix). Unparsed Wowhead rows
fell from 18→7 (feral p1-p2) and 20→2 (p3). `{kind:"unknown"}` is down to 3
rows per universe, identical across every phase, and now provably means "no
input mentions this item" rather than "no input we could read".

**The gate box "≥3 real characters produce believable shortlists" remains
PARTIAL** and is the reason this branch is not gate-complete.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                             |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Parser learned badge-vendor, rep-vendor (both orders) and quest-with-zone shapes; `unknown` now means genuine absence. Pinned by a new cross-phase source-stability test. |
| A2  | Adversarial | fixed       | Same change; residue is `.scratch/carry-forward/issues/45-unparsed-wowhead-prose-and-unknown-bucket.md`                                                                   |
| A3  | Adversarial | fixed       | `zone_sources()` splits on `/` first, then classifies each side as heroic or raid                                                                                         |
| A4  | Adversarial | fixed       | 5 regression tests in `pool-hardening.test.ts`; verified red without the fix                                                                                              |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/44-sources0-order-is-arbitrary.md`                                                                                                         |
| D1  | Domain      | wontfix     | `feral-tokens.json` slot-join already self-declares the gap per durable-claims                                                                                            |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/45-unparsed-wowhead-prose-and-unknown-bucket.md` — feral has no pre-raid list, recorded there                                              |
| S1  | Standards   | fixed       | Ticket 41 `Status:` restored to `open`; `Blocked by:` header added; confirmed visible in `pnpm issues:open`                                                               |
| S2  | Standards   | wontfix     | `DRUID_TREE_SPEC` empty map is load-bearing — key presence is the supported-class test                                                                                    |
| P1  | Spec        | fixed       | Ticket 05 gate box updated with what changed and why it stays PARTIAL                                                                                                     |
