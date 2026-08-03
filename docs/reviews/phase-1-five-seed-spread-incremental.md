# Pre-merge review — phase-1/five-seed-spread (incremental)

Diffed against: `fc9d5d6..HEAD` (tip `3493188` at dispatch)

**Incremental.** The full-branch review at
[`phase-1-five-seed-spread.md`](phase-1-five-seed-spread.md) covered
`dev...fc9d5d6` and stands. This pass covers the 44 commits after it —
tickets 13, 14, 15, 17, 23, 24 and 27, plus the p4/p5 universes.

Hand-written surface: **4.2k lines across 41 files**. Reviewers were given the
extracted source diff and told not to line-read generated artifacts
(`data/items/index.json`, `data/universes/*`, `data/enchants/index.json`,
`packages/core/src/proto/*`).

**Dispatch.** `codex` is not on `PATH`, so all three axes ran as fresh Opus
subagents with no memory of writing the code. Adversarial and Domain used
`.agents/reviews/*.md`; Standards + Spec invoked the `code-review` skill
unchanged.

> **Author's note.** Every finding below is against code I wrote earlier in the
> same session. Three of them are defects I would otherwise have shipped, and
> two of those made a change a _regression_ against the code it replaced. The
> reviewers earned their keep; this file records that plainly rather than
> softening it.

---

## Adversarial

**A1 — `data/enchants/index.json` keyed by a non-unique field. CONFIRMED.**
`effectId` is not unique: 141 records collapse to 137 keys, and
`build_enchants_index` did last-write-wins in a bare loop. The four collisions
each pair enchants for _different slots_ — 2564 is both "Gloves - Superior
Agility" and "Weapon - Agility" — and **three are worn in
`test/fixtures/slamaltman.raw.json`**. Reproduced end-to-end:
`enchantAppliesToItem(2564, 30145) === false` for gloves-on-gloves. Failure
mode: a worn glove enchant resolves to the weapon record, fails the slot test,
and is silently dropped on every glove swap, understating that candidate's
delta. Valid JSON, plausible DPS, no error — and **worse than the
`isEnchantable` gate it replaced**, which kept the enchant.

**A2 — worn `effectId` 911 is absent from the index. CONFIRMED.**
`getEnchant(911)` is undefined, so the rule returns false. Same silent-drop
shape as A1, one enchant wide. Domain identified it as a boots enchant on
30067 / 28669, simply absent from the pinned 141-record table.

**Checked and clean.** The port itself is faithful — the reviewer reimplemented
upstream's rule literally and brute-forced all 137 enchants × ~8,000 items for
**0 divergences** on the off-hand XOR, shield, staff and ranged branches. The
weapon-DPS term is arithmetically correct and cannot double-count (all 17 P3
weapons are `handType 4`). "Membership unchanged" verified by regenerating p2–p5
**byte-identically**. The mutation-check claims in the commit messages are real:
neutering the two-hand branch fails 2 tests.

**Noted, not filed.** The superset test is membership-only, so it would not
catch a wrong `curationHint`, `source.zone`, `boss` or `phase` on a _new_ p4/p5
row — and p4/p5 were never simmed.

## Domain

**D1 — the port drops `extraTypes`, and it hits ret's real enchants. CONFIRMED.**
Upstream's `getEligibleEnchantSlots` is `[enchant.type].concat(enchant.extraTypes || [])`;
our port collapsed that to `enchant.type !== item.itemType`, with a comment
asserting the two were equivalent. **14 enchants carry `extraTypes`**, including
Heavy Knothide Armor Kit (`type: 1`, `extraTypes: [3, 5, 7, 9, 10]`) — a
standard ret kit that would have been stripped off shoulder, chest, wrist, hands
and legs. 137 p3 items sit in those slots. No test exercised a multi-slot
enchant, so `pnpm verify` could not see it.

**D2 — the corrected scope test on ticket 17 is right; Shard of Contempt is a
real defect.** Independently endorsed: "power at that tier, not which content
type drops it" is the correct rule for TBC ret, and the earlier "raid-scoped
design working as intended" framing was wrong. 34472 is 44 expertise at weight
2.14; the review called the "Absolute BIS" label "correct and if anything
understated". Filed as ticket 28.

**D3 — typo'd zone string ships in p3/p4/p5. CONFIRMED.** `"Maghteridon's Lair"`
alongside the correct spelling on 28779, as a duplicate source row. Never
matches a zone-keyed lookup.

**D4 — sockets unscored; accepted with the reasoning intact.** Defensible for
ranking (all candidates share the blindness) but it does move the _tail_:
Glaive of the Pit (three sockets, empty stat map) and Hammer of the Naaru sit
near the bottom. The top of the order was judged **sane for a TBC ret player** —
Cataclysm's Edge first at P3 is correct, and the P5 order matches how a ret
player would rank Sunwell/BT two-handers. Keeping `weapon` out of the EP-floor
filter was called the right conservative choice.

**Verified correct, no action.** The weapon-DPS formula is exact against
`getWeaponDPS`; `5.34` really is `PseudoStatMainHandDps` from `P2_EP_PRESET`,
really was dropped in transcription, and really must not fold into Stat 41
(different units). Applying a main-hand weight to a two-hander is sound — ret is
strict 2H, no off-hand to double-count. `effectId` namespace consistent with
[R19]. p4/p5 tier coverage correct in both directions (15/15 at p4 which
correctly _expects_ 15; 18/18 at p5).

**One Domain claim rejected.** The review said ticket 17's "ilvl 159" was wrong
for 34388/34392 and they are 154. Checked before amending:
`scalingOptions.0.ilvl` in the pinned `db.json` is **159 for all three**
(34388, 34392, 34397). The ticket was right; the correction was not. Recorded
on the ticket so the next reader does not re-apply it.

## Standards + Spec

**S1 / ST1 — `slotChoice: string`, and the recorded justification is false.
CONFIRMED, and both axes reached it independently.** I typed the field `string`
and justified it with the `resolveJsonModule` widening finding. That finding is
true but **describes an approach nobody needs**: `simSlotsForPoolSlot` never
reads `slots-table.json` — it is a hand-written `switch` over string literals,
so its own arms yield a union directly. I tested one approach, found it blocked,
and wrote down "impossible" instead of "that approach is blocked." It also edits
a type `PLAN.md:190` pins, without the amendment this branch used for
comparable drift.

**ST2 — `ITEM_SOURCE_KINDS` duplicated three ways** (Python constant, TS union,
test literal). The Python comment documents the duplication rather than removing
it. Cross-language, so the fix is a shared JSON like `slots-table.json`.

**ST3 — ADR-0018's "roughly 15 minutes" carries no command and no hedge**, in
violation of the durable-claims rule, and it is load-bearing (the stated reason
the prefilter is not urgent).

**ST4 — `rank-report.ts` comment contradicts its code**: "System stacks only"
above three named webfonts. The code was right; the comment was wrong.

**Judgement calls, both resolved in favour of the code.** `pseudoWeights` is
sound and not ad hoc — `PseudoStat` is a genuinely separate upstream index
space, and every TS consumer projects `.weights`, so the key is inert. The
`enchants.ts` shield/staff/off-hand branches **stay**: the off-hand branch is an
inequality, so deleting the "unreachable" half changes the semantics of the
reachable half, and a partial port is a worse artifact than a complete one.

**Ticket-note accuracy.** 13, 14, 15, 17 and 27 judged accurate — 27 "the
strongest in the set". Ticket 24 **overclaimed** (S1). Ticket 23's "tier gap
closed" note inherits the p5 defect without cross-referencing it.

---

## Summary

Three confirmed defects, all mine, all fixed on this branch:

1. **A1** — enchant index keyed on a non-unique field, silently dropping worn
   enchants on swaps. A regression against the code it replaced.
2. **D1** — `extraTypes` dropped from the applicability rule, stripping armor
   kits off five slots. Also a regression.
3. **S1/ST1** — a type widened on a justification that does not survive
   reading the function it describes.

The pattern worth naming: **A1 and D1 both hid behind a number I read as
reassurance.** The generator printed "137 enchants" — that _was_ the collision,
and I logged it as a count. It now prints records and ids separately.

What held up: the weapon-DPS work (formula, weight, provenance, no
double-count), membership stability across all four tiers, and the
mutation-check discipline — every claimed mutation check was re-run by a
reviewer and genuinely failed.

`pnpm verify` green at tip: **154 tests, 3 todo, 22 files.**

## Disposition

| ID     | Axis             | Disposition | Ticket / note                                                                                                                                            |
| ------ | ---------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1     | Adversarial      | fixed       | `7d88d79` — index keyed as a list, resolved by the item's slot; mutation-checked                                                                         |
| A2     | Adversarial      | defer       | Covered by `.scratch/carry-forward/issues/28-p5-bis-outside-raid-zones.md` notes; one boots enchant absent from the pinned table, no ret impact measured |
| D1     | Domain           | fixed       | `7d88d79` — `extraTypes` emitted and unioned; armor-kit test added                                                                                       |
| D2     | Domain           | defer       | `.scratch/carry-forward/issues/28-p5-bis-outside-raid-zones.md` (new)                                                                                    |
| D3     | Domain           | fixed       | `d9dee9f` — spelling folded in `canonical_zone`, plus a build guard rejecting any raid/token zone absent from `phase_raids.json`                         |
| D4     | Domain           | wontfix     | Sockets unscored is recorded on ticket 27 as deliberately open — a per-socket estimate is a magnitude there is no measurement for                        |
| S1/ST1 | Spec + Standards | fixed       | `876a81f` — `SimSlotName` union, PLAN.md §4 amended, ticket 24's false rationale corrected                                                               |
| ST2    | Standards        | defer       | `.scratch/carry-forward/issues/24-standards-smells-cleanup.md`                                                                                           |
| ST3    | Standards        | fixed       | `3493188` — marked untested with the command to re-derive                                                                                                |
| ST4    | Standards        | fixed       | `3493188` — comment rewritten to describe the fallback stacks                                                                                            |

Ticket 13 was closed separately by a delegated agent (`f5595a8`), which refuted
my earlier "the join does not exist" measurement — see the ticket.
