# Handoff — collect the feral cat Wowhead lists

**Branch:** `phase-2/feral`, all committed, nothing in flight.

Feral cat ranks end to end, but its candidate pool holds **raid drops only**.
Ret's pool also carries badge, quest, vendor, crafted, arena and world-drop
items, and it gets them from hand-collected Wowhead lists under
`data/wowhead-lists/ret/`. There is no `feral/` directory, so feral gets none of
them. Collecting it is the job.

`.scratch/carry-forward/issues/41-...md` describes the symptom that exposed this
and **states the cause wrongly** — §4 has the correction. Read §4 before that
ticket.

## 1. Likely-owned gear is mostly not current-tier raid loot

The fact that drives this whole task, and the one the previous analysis missed.

A large share of what players wear at any phase does not drop in the current
raid. Badge-of-Justice vendor items, quest rewards, reputation vendor items,
crafted gear, arena and honor gear, world drops, and plain phase-1 leftovers are
**ordinary persistent gear**. A phase-2 or phase-3 character wearing phase-1
items is normal, not a data error.

Two live examples from the reviewed character: **Everbloom Idol (29390)**, a
badge vendor item, and **Bloodlust Brooch (29383)**, also a badge item — the
latter already in the ret universe, and only because a Wowhead list names it.

**So consult the community lists before judging an item missing, wrong, or
suboptimal.** Wowhead's BiS guides and the wowsims curated sets both carry
alternatives and merely-likely items alongside the optimal pick, with the real
acquisition source attached. This repo already treats them as authoritative for
pool membership. Reasoning from raid drop tables alone produces confident wrong
answers — that is exactly how ticket 41 went wrong.

## 2. Collect `data/wowhead-lists/feral/`

Mirror the ret directory. Copy the schema from
`data/wowhead-lists/ret/p1-p2.json` — same keys, same nesting.

Stage filenames are load-bearing: `WOWHEAD_STAGE_FOR_MAX_PHASE`
(`scripts/assemble_universe.py`) expects `p1-p2`, `p3`, `p4`, `p5`. **`p1-p2`
alone unblocks the phase-2 gate**; later stages can follow.

Three requirements the schema will not enforce for you:

- Keep `wowheadSourceText` **verbatim** from the page. `parse_wowhead_source`
  parses it for drop, badge, craft and reputation kinds, so a paraphrase
  silently drops the source kind and the item loses its origin.
- Include alternatives and realistic-but-suboptimal rows, not only the top pick.
  Per §1, that breadth is the point.
- Fill `collectedBy`, `sourceUrl`, `pageAuthor`, `pageUpdated` honestly. This is
  a hand-collected artifact and those fields are its provenance.

**Done when** the ranged slot recovers and ret is untouched:

```bash
python scripts/assemble_universe.py --max-phase 2 --spec feral
python -c "import json;u=json.load(open('data/universes/feral-p2.json'));print([e['itemId'] for e in u['entries'] if e['slot']=='ranged'])"
git diff --stat data/universes/   # ret-p*.json must show no diff
pnpm verify
```

## 3. Then: count the uncomparable worn items

Nobody has measured how many *worn* items across the three captured characters
are absent from their own universe. The count decides whether the worn-item
problem is one idol or a general hole — so measure before designing any fix.

Fixtures: `test/fixtures/{slamaltman,shredzepelin,nexess}.raw.json`; worn ids
live in `combatant_info_events[].gear` for the matching actor. Universes:
`data/universes/{ret,feral}-p2.json`.

**Done when** the count exists for all three characters, before and after §2,
and ticket 41 is rewritten around it (see §4).

## 4. Correcting ticket 41

Ticket 41 records two causal claims. Both are wrong; delete them rather than
carry them forward.

- *"Everbloom Idol has no source records, so it cannot enter the pool."*
  **Symptom, not cause.** 24 of 36 idols in the pinned db have no `sources`
  array — and so do 29 rows sitting in the shipping ret universe today. Missing
  db sources plainly does not prevent membership; the Wowhead list is what
  rescues those rows.
- *"Idol of Feral Shadows is the idol a cat wants at P2."* Asserted without
  checking, and **it is not the best cat idol for this tier.** Another druid idol
  worth knowing is a quest reward. This is precisely the claim §1's sources
  settle.

What survives from 41: **a character's currently-equipped item should be
comparable in every slot.** Whether that needs its own rule or falls out of §2
is what §3 measures.

Keep the five-man question out. That is ticket 17's, and the phase-2 spec puts
it out of scope.

## 5. Guard rails

- **Leave `data/universes/ret-p*.json` byte-identical.** The phase-2 spec
  requires additions only; a moved ret byte is a reportable defect.
- Restore vendored inputs with **`pnpm sync:wowsims:restore`**. Plain
  `pnpm sync:wowsims` is `--update`: it moves the pin off v0.0.101 and drops the
  lockfile's `proto` block.
- `pnpm verify` before every push.
- WCL class ids are not wowsims class ids — WCL 2=Druid, 11=Warrior; wowsims
  2=Paladin, 11=Druid. Map explicitly, never cast.

## 6. Context

- `.scratch/phase-2/feral-gate-verdict.md` — what the gate closed on
- `.scratch/phase-2/feral-coupling-audit.md` — measurements behind it
- `.scratch/handoffs/sme-rank-judgment-feral-shredzepelin.md` — the review that
  surfaced this; its ranged-slot **observation** stands, its stated cause is
  superseded by §4
- `scripts/assemble_universe.py`, `SPEC_PROFILES` — where `wowhead_dir` is set
