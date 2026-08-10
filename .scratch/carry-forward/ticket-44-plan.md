# Ticket 44 plan — `sources[0]` order

Status: proposed, not implemented. Measurement below is re-runnable; every count
comes from the committed `data/universes/*.json` at branch `wk/cf-44`.

## What the measurement says

Scripts: `.scratch/carry-forward/ticket-44/measure.py`, `measure2.py`,
`measure3.py`. Run each with e.g.
`python .scratch/carry-forward/ticket-44/measure.py` — they locate the repo
root from their own path, so the working directory does not matter.

Across all six committed universes (ret p2–p5, feral p2–p3), 2114 entry rows:

| Question | Answer |
| --- | --- |
| Rows with >1 source | 400 |
| Rows with >1 **distinct kind** | 61 |
| Which kind pairs occur | `raid`+`token` only — no other pair exists |
| Rows with both `rep` and `badge` | 0 |
| Rows with both `quest` and `crafted` | 0 (no `quest` kind is emitted at all) |
| Rows where `sources[0].kind` is `rep`/`badge`/`unknown` while a `raid` row exists | 0 |
| Rows with >1 source of the same kind | `raid` 265, `crafted` 76, `pvp` 4 |
| Rows naming >1 **distinct zone** | 20 row-instances, 7 distinct (itemId, zoneset) combos |

Kinds actually present: `raid` 1917, `token` 81, `crafted` 76, `pvp` 32,
`badge` 23, `unknown` 18, `rep` 17, `heroic` 11.

## The real defect

**The ticket's stated cause does not survive contact with the data.** There is
no cross-kind precedence problem: the only multi-kind pair that occurs is
`raid`+`token`, which is one fact recorded twice (same item, same zone), and in
all 61 cases `sources[0]` is already the `token` row — the more informative of
the two. Zero rows put a `rep`, `badge`, or `unknown` row ahead of a `raid` row.

What is actually left is two much smaller things:

1. **A within-`raid` zone tie** (7 distinct combos, e.g. 32591 Choker of
   Serrated Blades = Black Temple + Hyjal Summit). This is a display question
   about which of two equally-true zones to name, not a precedence question.
   `matchesZone`/`matchesBoss` in `view.ts` already scan every source, so
   filtering is correct today; only `zoneKeyOf` and the report's single-source
   line collapse it.

   The SME review confirms the tie is real: 32589, 32590, 32591, 32592 and
   34009 are all T6-era trash drops that genuinely drop from trash in both Black
   Temple and Hyjal Summit. Neither zone is more true, so displaying both is the
   only honest option. Note this does **not** extend to 30129 — see below.
2. **Genuine data-quality bugs found while measuring, not in the ticket**: 10
   distinct tier items carry a `raid` row whose `boss` field has a token name
   spliced into it, e.g. 30990 Lightbringer Breastplate →
   `boss: "Chestguard of the Vanquished Champion - Illidan Stormrage"`. This
   renders through `formatItemSource` as a boss name and is simply wrong. It is
   an upstream parse defect, and the file that produces it
   (`scripts/assemble_universe.py`) is owned by another agent right now — this
   plan does not touch it. **Recommend filing it as its own ticket.**

   The SME review escalated two of these from cosmetic to factual:

   - **30990 names the wrong token.** It is a paladin chest, so a *Conqueror*
     piece, and its token row correctly reads `Chestguard of the Forgotten
     Conqueror` — but its raid row embeds `Chestguard of the Vanquished
     Champion`, a token group paladins cannot use. Reproduce by comparing the
     embedded name against the token row's `token` for every tier row; 30990 is
     the only disagreement, in ret-p3/p4/p5. The other nine embed the correct
     token and are only ugly.
   - **30129 Crystalforge Breastplate's Serpentshrine row is probably bogus.**
     The T5 chest token drops from Kael'thas in Tempest Keep; Morogrim
     Tidewalker does not drop it. This is very likely a bad join, not a second
     legitimate zone, and must **not** be folded in as an equal alternative the
     way the trash items in (1) should be. Left as-is it surfaces a tier chest
     in a Serpentshrine zone filter that cannot be obtained there.

## Is a precedence ladder needed?

**No.** The ladder is unnecessary because 0 items carry conflicting kinds. Every
one of the 61 multi-kind rows is `raid`+`token` for the same zone, and the
ordering there is already the one a ladder would produce. Building
`raid > rep > badge > unknown` would be dead code from the day it merged, and it
would encode a judgement (a boss beats a faction) that no row in the data
actually asks for.

Equally: there is nothing wrong with `sources` being an array, and nothing wrong
with a `raid` kind appearing more than once with different zones. That is the
honest shape of the data.

## Proposed fix shape

Minimal, and mostly about *stating the rule* rather than changing behaviour:

1. **Make `sources[0]` deterministic rather than pipeline-dependent.** Sort the
   `sources` array by a stable total order — `(kind, zone, boss)` lexicographic,
   with `token` before `raid` so tier rows keep today's output — at the point
   `poolEntryFromUniverse` builds the entry, not in the Python. This satisfies
   "chosen by a stated rule, not by pipeline order" without inventing a
   precedence claim, and it is a no-op on all 61 multi-kind rows (assert this
   in the test rather than assuming it).

   Token-before-raid is not just an informativeness preference. Per the SME
   review, a tier piece's raid row describes an event that does not happen —
   you do not kill Kael'thas and receive Crystalforge Breastplate, you receive
   the token and hand it to a vendor. The token row names the thing that
   actually drops. Worth a follow-up question whether the bare `raid` row on a
   tier piece should exist at all.
2. **Deduplicate exact-duplicate source rows.** 32591 carries five rows that are
   four near-copies (`{raid, Hyjal Summit}`, `{raid, Hyjal Summit, Trash}`,
   `{raid, Hyjal Summit, Trash Mobs}`, …). Collapsing exact duplicates and
   boss-less rows subsumed by a boss-bearing row of the same zone is a real
   improvement and is where most of the 400 multi-source rows live (300 of them
   have all-agreeing zones).

   Two constraints from the SME review. **Keep the boss-bearing row, discard the
   bare one** — `"Trash"` is real loot information, and for these five items
   trash is the only way to get them, so a row reading just "Hyjal Summit" sends
   a player to a boss loot table the item is not in. Normalise `"Trash"` and
   `"Trash Mobs"` together, but never normalise trash away to an empty boss.
   And **dedup must only collapse rows that agree** — it must not be relied on
   to hide 30129's bogus Serpentshrine row, which needs its own fix.
3. **Leave `PoolEntry.source` in place.** It stays the primary/display source;
   `sources` is already exposed alongside it and every filter already uses the
   list.

### Blast radius

The ticket calls option 2 "honest but touches every consumer". **That claim is
wrong.** Production readers of the singular `.source` are five call sites in
three files:

- `packages/core/src/view.ts:82,108` — `sourcesOf` already falls back to the
  list; `zoneKeyOf` is the only real singular read, and it is ticket 35's.
- `packages/core/src/rank.ts:561` — copies it onto `RankedItem`; `sources` is
  copied too at line 572.
- `packages/core/src/rank-report.ts:163,190` and
  `rank-report-rules.ts:86,87` — display and a `pvp` partition.

So the fix as scoped above is a **1-file production change** (`pool.ts`) plus
tests. Even the maximal "expose the list everywhere" version is 3 files, not 30.

## Deliberately out of scope

- **Ticket 35** (`groupBy: raid` picks an arbitrary zone) — `zoneKeyOf` in
  `view.ts:104` returning the first zone is a phase-3 UI decision (show both?
  duplicate the row into both groups?) and is not decided here. Sorting
  `sources` makes its choice *deterministic*, which is a precondition for 35 but
  not a fix for it.
- The `boss`-field token-name corruption (10 items), the wrong-token-group bug
  on 30990, and the suspect Serpentshrine row on 30129. All upstream in
  `scripts/assemble_universe.py`, which is owned by another agent right now —
  not touched here. Each needs its own ticket; 30990 and 30129 are correctness
  bugs, not cosmetics.
- `scripts/assemble_universe.py` — not touched.

## SME review

`.scratch/handoffs/sme-rank-judgment-ticket-44.md`, verdict
`trust-with-caveats`. It endorsed the no-ladder conclusion and the both-zones
display, and changed this plan in four places: token-before-raid got its real
game justification, the trash-row dedup gained a keep-the-boss-row constraint,
and 30990 and 30129 were escalated from cosmetic to correctness bugs. Its gate:
the ordering change is sound, but the pipeline currently ships two rows that
state false things about the game, and sorting does not fix either.
