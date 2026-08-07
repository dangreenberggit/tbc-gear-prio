# Handoff: what is left after the tier-source work

For whoever picks up tickets 53, 54, 55, 56 or 57 on `fix/carry-forward-backlog`.

Originally written 2026-08-07 on `830dae0`. **Substantially revised the same day
after fetching the live pages** — several claims in the first version were
wrong and are corrected below. The branch is still **unreviewed and unlanded**.

## What already landed (do not redo)

Five commits, `c3f5b97` → `830dae0`. Tickets 48, 49, 50, 51 and 52 are closed.

| Commit | What |
|---|---|
| `c3f5b97` | parser splice fix (48), source-text corrections (49/50), tier cross-check gate (51) |
| `98bbff6` | boss sub-unit → encounter folding (52), `check_boss_aliases.py` |
| `37b8c46` | per-row `origin` on every source |
| `8bdfd3f` | witness gates — including ones `37b8c46`'s message wrongly claimed |
| `830dae0` | **diagnosis now known to be wrong — see below**; paraphrase gate |

`pnpm verify` on `830dae0`: 425 passed, 32 files, Node v22.16.0.

## The pages are scrapeable, and that answered several open questions

`urllib` with realistic browser headers returns 200 (a bare User-Agent gets
403). No headless browser needed. **The guide body is not HTML** — it ships as a
single `WH.markup.printHtml("...")` JS string containing Wowhead's own BBCode:
`[table]`, `[tr]`, `[td]`, `[item=30905]`, `[npc=17968]`. NPC and item names
resolve from `WH.Gatherer.addData(...)` payloads in the same response.

Fetch and extraction helper: `.scratch/carry-forward/notes/57-impact.py` is the
measurement script; the fetch/extract pair used to get the markup is small
enough to rewrite (fetch with browser headers, then pull the `printHtml`
argument as a JS string literal and `json.loads` it).

## Correction: `830dae0`'s diagnosis is wrong for p4/p5

`830dae0` recorded that "the Wowhead pages are correct and we introduced the
errors by paraphrasing". That was based on one screenshot. Checked against the
live markup, it is **right for p3 and wrong for p4/p5**:

| Page | How the 30990 token is recorded | Correct? |
|---|---|---|
| p1-p2 | `[item=30236]` link | yes |
| p3 | `[item=31089]` link | yes |
| p4 | bare text "Chestguard of the Vanquished Champion" | **no** |
| p5 | bare text "Chestguard of the Vanquished Champion" | **no** |

Same for 30129: p1-p2 and p3 give `[npc=19622]` (Kael'thas, Tempest Keep); p4
and p5 give `[npc=21213]` (Morogrim Tidewalker, Serpentshrine Cavern), which is
a genuine upstream factual error. And 30993: p3 links the Illidari Council npc;
p4/p5 type the token name and splice it with `" - "` — the ticket 48 splice
shape occurring **in the upstream page**, not introduced by us.

So p3's original collection really did contain a transcription error (the page
was right), while p4/p5's original collection was **faithful to pages that are
themselves wrong**. The previous session generalised one page's finding to all
of them; the first version of this handoff repeated that, and an early pass of
the revision over-corrected in the other direction. Check per page.

**The item data currently in the repo is correct for all three items.** Nothing
about the loot needs reverting.

Do not extrapolate a rule from this. Six hand-typed values were wrong and four
linked ones were right, but those three items were *selected because they were
already known broken*, so the sample proves much less than it appears to. The
durable point is narrower: prose is a weaker witness than a structured id, and
the way to know is to check a machine source.

## Correction: ticket 55 is empty

Ticket 55 lists 14 p4 rows with "paraphrased" rank labels. Measured against the
page: **13 match the page text exactly.** The 14th (`32581`) differs only
because the page cell contains a line break — `'Best - \n\nNo Expertise'` — and
the collected file has it sensibly collapsed.

The p4 page's Rank column has **33 distinct labels across 96 rows, 23 of them
singletons**. `Old Tier`, `T6 Option`, `Tier Option`, `Optional - tier` and
`Optional - Tier` are all real page text; the last two are the author's own
inconsistent capitalisation, not two spellings of an invented idea.

Consequences:

- Ticket 55 should close as *measured, premise false*, not be worked.
- The `SINGLETON_BUDGET` gate in `pool-hardening.test.ts` ("rankLabel is copied,
  not paraphrased") is measuring page vocabulary, not collection defects. A
  faithful scraper reproduces all 23 p4 singletons and the gate reads that as
  regression. It should be deleted, not lowered.
- Our p4 file has `rankLabel: null` for the 41 `alternative`-section rows where
  the page does carry labels. That is real data loss, and the opposite of the
  paraphrase story.

## Ticket 57 (new) — the structural fix

Filed as
`57-guide-prose-should-not-source-items-a-machine-input-covers.md`. The guides
are an **editorial** input (which items matter); their Source cell restates
database facts we already hold. Measured: of the wowhead-parsed sources, **148
raid rows are redundant** with a machine input, **94 are load-bearing**
(crafted/pvp/badge/rep/world — AtlasLoot does not cover vendor and quest items),
and **11 zone/boss claims rest on prose alone** — the same 11 that ticket 54's
`origin` query found from the other direction.

Suppressing the redundant 148 makes tickets 48–52 structurally unreachable for
covered items. Read the ticket before starting; it records the one trap
(suppress on *"the machine input supplies a zone"*, never on *"the item is
known to a machine input"* — the latter silently deletes heroic dungeon zones).

## Ticket 53 — `profession` carries prose

Unchanged and still real: 12 distinct values for five professions. Note the
Bulwark case is authentic page text — `Profession: Armorsmithing Blacksmithing
(BoP)` is what p4 says — so this is a parser problem, not a collection one.
Ticket 57 does **not** fix it, because `crafted` is a kept kind.

## Ticket 54 — remaining items

- **Feral T6 has no two-hop map.** `feral-tokens.json` stops at T5. The four
  Thunderheart pieces (31034, 31042, 31044, 31048) are 4 of the 5 allowlisted
  ids and 4 of the 11 prose-only locus claims. Closing this removes them from
  `KNOWN_UNCORROBORATED`, and the companion test will fail until you do —
  intended.
- **Write down the "prefer the machine source over guide prose" rule.** Ticket
  57 is the mechanised version of it. If 57 lands, the rule is enforced by the
  pipeline rather than by memory, which is better than a doc line.
- **Fixture-authoring guidance** (do not author fixtures from shipped data).
  Still unwritten; still an AGENTS.md change, so it needs proposing in chat.

## Ticket 56 — the scraper

Now **smaller**. The scrapeability question is answered (yes, no browser). If 57
lands, the scraper needs only the item id and rank label, both structured on the
page as `[item=NNNNN]` and a plain `[td]` — not the Source prose. Land 57 first.

Parser junk worth fixing while nearby, exposed by the 57 measurement:
`31856 Darkmoon Card: Crusade` → `zone: "Bind on Equip"`;
`32658 Badge of Tenacity` → `boss: "Depleted Badge"`;
`29301 Band of the Eternal Champion` → `zone: "The Scale of the Sands Exalted"`.

## Records cleanup (separate task, not started)

Independent of 57 and safe to do in parallel — it touches no pipeline code:

1. `data/two-hop/ret-tokens.json`'s note was rewritten by `830dae0` to say the
   guide is correct. For p4/p5 it is not. Restore the substance of the original
   note, scoped per page.
2. `wowheadSourceText` should hold **what the page says**; corrections belong
   alongside, not overwritten into it. `c3f5b97` overwrote it for 30990/30129/
   30993 (it did record `corrections[]`, which is why this is recoverable).
   Constraint: `assemble_universe.py` reads `wowheadSourceText` directly, so
   restoring verbatim prose without a second field would feed the wrong boss
   into the universe. Two shapes were discussed — add a corrected field the
   parser prefers, or keep the parser on the existing field and put verbatim
   text in a new one. **Undecided; ask before picking.** If 57 lands first this
   gets easier, since prose stops being a locus input for these items anyway.
3. Delete the `SINGLETON_BUDGET` / paraphrase gate; close ticket 55.
4. Rewrite tickets 49 and 50 to the per-page story above.

## Process notes that cost time

- **`git checkout <file>` reverts uncommitted work in that file.** It silently
  ate a gate once. **Read the commit back** —
  `git show <sha>:<path> | grep -c <marker>` — for anything a message claims.
- **Regenerate universes after any `git checkout data/universes/`.**
- Regen loop is per spec and phase; `data/universes/` has six files:
  ```bash
  for spec in ret feral; do for ph in 2 3 4 5; do
    [ -f "data/universes/$spec-p$ph.json" ] && python scripts/assemble_universe.py --max-phase $ph --spec $spec
  done; done
  ```
- `pnpm verify` needs Node 22. On Node 20 six suites fail with
  `No such built-in module: node:sqlite` — environmental.
- Prettier runs on commit via lint-staged; `--write` first so `format:check`
  stops failing.
- **Measure before concluding, and say which pass a number came from.** This
  investigation produced three different coverage figures ("zero uncovered",
  then 66, then the 148/94/11 split). Only the last is right; the first counted
  items merely *present* in `db.json` without checking whether the entry had a
  `sources` array.

Before any land ask: `pre-merge-review` → `docs/reviews/fix-carry-forward-backlog.md`.
