# Ticket 05 — verdict on the two gate boxes

Branch `phase-2/feral`, merge base `phase-2/trust`. Ticket 05's deliverable is
*"a written verdict on the claim, plus whatever code the verdict required"*.
Evidence for every claim here is in
[`feral-coupling-audit.md`](feral-coupling-audit.md) or re-runnable below.

## Box 1 — feral shipped without a structural change to `rankUpgrades` or its seams

**PASS.**

The claim under test was *"adding a spec should be a preset JSON plus the
disambiguation confidence field, and nothing else."* It is **very nearly**
true, and the two places it is not are worth stating exactly.

```bash
git diff --stat phase-2/trust...HEAD -- \
  packages/core/src/rank.ts packages/core/src/seams/ \
  packages/core/src/compose.ts packages/core/src/types.ts \
  packages/core/src/spec.ts
```

| File | Lines | What changed |
|---|---|---|
| `seams/` | **0** | untouched — no fourth port, no port signature changed |
| `compose.ts` | **0** | untouched — it never branched on class |
| `rank.ts` | 20 | `PRESET_ID` → `PRESET_ID_BY_SPEC` + `presetIdFor()` |
| `spec.ts` | 95 | druid support + `classifyFeralForm` |
| `types.ts` | 9 | added `DetectedSpecId` |

**`rankUpgrades`'s signature, `Deps`, `RankInput` and `Ranking` are unchanged.**
The `rank.ts` diff is a module constant becoming a per-spec lookup at the two
existing call sites — a value change, not a shape change. Nothing was added to
`Deps`, because `raidSimSkeleton`, `epWeights`, `gemPalette` and `pool` already
carried the per-spec inputs as data (ADR-0019). That design is what made this
cheap, and it is the thing the box was really testing.

The two honest qualifications:

1. **`spec.ts` changed shape, and had to.** `SpecClassification` was a closed
   union with no way to express "feral, but which one". This is not a seam and
   not `rankUpgrades`, so the box is legitimately passed — but §14's phrase
   *"a preset JSON plus the disambiguation confidence field"* anticipated
   exactly this, so it is a predicted change rather than a surprise.
2. **`SpecId` gained a sibling type.** `DetectedSpecId = SpecId | "feral-tank"`
   separates what the engine can *rank* from what it can *identify*. Adding
   `feral-tank` to `SpecId` would have implied a preset and universe that do
   not exist.

### What the box does not cover, reported separately as ticket 05 requires

The universe **generator** was substantially spec-coupled, and it is neither
`rankUpgrades` nor a seam. Six of seven named hard-codings were paths; the
seventh (`CLASS_PALADIN`) plus the unnamed `ret_eligible_d7` were **logic** —
druid is Leather+Cloth against ret's Leather/Mail/Plate, wears one-handers,
wears the staves ret explicitly excluded, and needs Idol (6) where no idol
constant existed. Full per-hard-coding table in the audit, §2.

So the box passes **and** the finding is real. Both are recorded.

## Box 2 — ≥3 real characters produce believable shortlists

**PARTIAL — three characters rank; the believability judgment is not done.**

| Character | Spec | Baseline DPS | Universe |
|---|---|---|---|
| slamaltman | ret | 2003.26 | 230 |
| shredzepelin | feral | 1917.50 | 225 |
| nexess | feral | 2100.02 | 225 |

```bash
pnpm rank --region US --realm dreamscythe --character shredzepelin --spec feral --offline
pnpm rank --region US --realm dreamscythe --character nexess --spec feral --offline
pnpm rank --region US --realm dreamscythe --character slamaltman --offline
```

Three real characters across two specs, each producing a shortlist from its own
logged gear. `kharnij` could not be used — a Warrior, and not a rankable spec
(audit §5).

`sme-rank-review` was run on shredzepelin's shortlist and returned
**trust-with-caveats** —
[`.scratch/handoffs/sme-rank-judgment-feral-shredzepelin.md`](../handoffs/sme-rank-judgment-feral-shredzepelin.md).

What it confirmed: the list is recognisably a feral cat list. No unequippable
items, no PvP or encounter-only loot presented as normal gear, no plate or mail
or caster tier, deltas the right size for his gear. The cloak-and-ring crowding
is **correct rather than a bug** — he wears five T5 Harness pieces and a good
staff, so those are his genuinely weak slots.

What it found, filed as
[`carry-forward/issues/41`](../carry-forward/issues/41-ranged-slot-thin-and-worn-item-uncomparable.md):
the ranged slot offers two items, **the idol he is wearing is not one of them**
(Everbloom Idol has no source records in the pinned db, so it cannot enter the
pool), and the best cat idol for the tier drops in a five-man and is excluded by
raid scoping. A player would notice this immediately.

**Ret has the identical two-item ranged slot**, so this is a standing pool
property that feral made visible, not a feral regression. That is why the box is
`PARTIAL` rather than failed, and why 41 is carry-forward rather than a ticket 05
blocker.

Box 2 should close once 41 is resolved or explicitly accepted. The remaining two
characters have not been SME-reviewed; one review found a defect that applies to
all three, so reviewing the others is unlikely to change the verdict before 41
is addressed.

## What is still open on Phase 2 after this branch

- `sme-rank-review` for box 2, then the verification-log entry for the phase.
- The **remaining five Phase 2 gate boxes** belong to the four slices already
  merged into `phase-2/trust`; none has been written into
  `docs/verification-log.md` yet, and §14 requires that before `dev`.
- Feral limits carried forward, none of them gate items: no Wowhead lists, tier
  stops at T5, the token map is slot-joined rather than Wowhead-verified, and
  feral's EP preset is upstream's P1 because no P2 exists.
