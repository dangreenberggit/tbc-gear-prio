# Handoff: what is left after the tier-source work

For whoever picks up **ticket 56 or 58** on `fix/carry-forward-backlog`.
**Tickets 53, 54, 55 and 57 are closed** — do not start them.
**Ticket 58 is new** and unstarted: only AtlasLoot's instance loot tables were
ever vendored, so vendor/badge/rep items have no machine witness *here*, and
five sites called that a limitation of AtlasLoot itself. The claim is corrected;
vendoring the other modules is the open work.

## Session of 2026-08-07 (second): 53 closed, 54 down to one item

Four commits on top of `14fc241`, branch still **unreviewed and unlanded**:

| Commit | What |
|---|---|
| `36957c0` | feral T6 → Vanquisher token, 4 slots verified per redemption list |
| `8ecaeb3` | ticket 53 — `profession` canonicalised off the proto enum |
| `ebc7525` | `wowheadSourceText` verbatim + `correctedSourceText` (option 1) |
| `065701e` | feral T6 shoulder slot, closing the map; allowlist down to one id |

`pnpm verify` on `065701e`: **425 passed**, 32 files, Node v22.16.0.

Three findings worth carrying, each of which contradicted a plausible guess:

- **The T6 token vocabulary is not a rename of T4/T5.** It is
  Conqueror/Vanquisher/Protector, and the *class groupings were re-cut*. This
  map's own note said druid takes the "Defender" token; at T6 Protector is
  Warrior/Hunter/Shaman and druid is **Vanquisher**. An analogy would have been
  wrong.
- **The redemption pairing has a machine source after all.** Each token's
  Wowhead "Currency for" list names the pieces it buys (vendor Tydormu). Both
  `feral-tokens.json` and ticket 54 say no committed input states it — true of
  AtlasLoot and `db.json`, but the page has it. This is the check to use for any
  future token→piece mapping.
- **The pre-correction text in git is identical across p3/p4/p5, and that is a
  flattening, not a record.** p3's page is right and its old text was our slip;
  p4/p5's pages are genuinely wrong. Restoring "the original" uniformly would
  have injected a defect into p3 while claiming faithfulness. Check per page —
  the same lesson this doc already records, which still nearly bit again.

Page access is rate-limited — it blocked one slot mid-session and cleared on its
own later. See "The pages are scrapeable" below before planning ticket 56.

Originally written 2026-08-07 on `830dae0` and revised repeatedly the same day —
several claims in the first version were wrong and are corrected below, so
prefer a later section over an earlier one where they conflict.

## What already landed (do not redo)

Eight commits, `c3f5b97` → `424c5a4`. Tickets 48, 49, 50, 51, 52, 55 and 57 are
closed. Three more landed later the same day — see the session note at the top.

| Commit | What |
|---|---|
| `c3f5b97` | parser splice fix (48), source-text corrections (49/50), tier cross-check gate (51). Its overwrite of `wowheadSourceText` is **partly reverted by `ebc7525`** — p4/p5 now keep the page's words and carry the fix in `correctedSourceText`. |
| `98bbff6` | boss sub-unit → encounter folding (52), `check_boss_aliases.py` |
| `37b8c46` | per-row `origin` on every source |
| `8bdfd3f` | witness gates — including ones `37b8c46`'s message wrongly claimed |
| `830dae0` | **diagnosis now known to be wrong — see below**; paraphrase gate |
| `a17e351` | `ret-tokens.json` note rescoped per page |
| `530711f` | paraphrase gate **deleted**, ticket 55 closed, 49/50 rewritten per page |
| `424c5a4` | ticket 57 — prose suppression + `check_wowhead_prose_suppression.py` |

`pnpm verify` on `424c5a4`: **418 passed**, 32 files, Node v22.16.0, and
`wowhead-prose:check` green. The 425 → 418 drop is the seven deleted
`SINGLETON_BUDGET` cases, one per gated file — not a regression.

Two agents worked this branch in parallel; `424c5a4` rebased onto `530711f`, so
history is linear and the working tree is clean.

## The pages are scrapeable, and that answered several open questions

**The guide body is not HTML** — it ships as a single
`WH.markup.printHtml("...")` JS string containing Wowhead's own BBCode:
`[table]`, `[tr]`, `[td]`, `[item=30905]`, `[npc=17968]`. NPC and item names
resolve from `WH.Gatherer.addData(...)` payloads in the same response.

**Access is less settled than this section originally claimed.** An earlier pass
recorded that `urllib` with realistic browser headers returns 200. On
2026-08-07 that stopped being true from this machine: every URL 403s, including
one that had worked, so the 200 was a property of that attempt and not a durable
fact. The in-app browser reads the pages fine but began returning CDN errors
after roughly eight loads. Treat page access as **rate-limited and unreliable**,
budget fetches, and do not tune request headers to defeat the block. Ticket 56
should assume it may need several sessions rather than one clean pass.

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

## Correction: ticket 55 is empty (closed — background only)

Ticket 55 lists 14 p4 rows with "paraphrased" rank labels. Measured against the
page: **13 match the page text exactly.** The 14th (`32581`) differs only
because the page cell contains a line break — `'Best - \n\nNo Expertise'` — and
the collected file has it sensibly collapsed.

The p4 page's Rank column has **33 distinct labels across 96 rows, 23 of them
singletons**. `Old Tier`, `T6 Option`, `Tier Option`, `Optional - tier` and
`Optional - Tier` are all real page text; the last two are the author's own
inconsistent capitalisation, not two spellings of an invented idea.

Consequences — **all three actioned in `530711f`, nothing to do here**:

- Ticket 55 closed as *measured, premise false*. Its original text is preserved
  under a closing note that records the measurement.
- The `SINGLETON_BUDGET` gate in `pool-hardening.test.ts` ("rankLabel is copied,
  not paraphrased") was **deleted**, not lowered. It measured page vocabulary,
  not collection defects. It was also *inverted*: our p4 file has
  `rankLabel: null` on the 40 `alternative`-section rows the page does label, so
  a faithful re-scrape restores those labels, adds singletons, and fails the
  gate — it penalised fixing the real defect. A comment at its old site records
  why, so it does not get reintroduced.
- The dropped-label data loss is the real defect and now belongs to ticket 56.

The premise is checkable in one command — the p4 singletons include
`'Optional - Human'`, `'Undead Only & Demons'`, `'Best - No Expertise'` and
`'Optional-Crafted'`, which are race and mechanic specifics no summariser
invents:

```bash
python -c "
import json
from collections import Counter
d=json.load(open('data/wowhead-lists/ret/p4.json',encoding='utf-8'))
c=Counter(e['rankLabel'] for e in d['entries'] if e.get('rankLabel'))
print(sorted(l for l,n in c.items() if n==1))
"
```

## Ticket 57 — LANDED 2026-08-07

Suppression is in `assemble_universe.build`, keyed on a new module-level
`carries_locus`, and gated by `scripts/check_wowhead_prose_suppression.py`
(`pnpm wowhead-prose:check`, wired into `verify`). 61 source rows left the six
universes; 0 lacked a same-zone non-wowhead sibling; pool membership and all
recall figures are unchanged. `pnpm verify` green, 425 passed, Node v22.16.0
— that count predates the rebase onto `530711f`; on the integrated tip it is
**418**, because the paraphrase gate's seven cases are gone.

Two corrections to the plan, both written up in the ticket:

- The machine-coverage set is frozen **before** the list loop. Reading
  `source_acc` per row also sees wowhead rows from an earlier list, so an item
  on two lists suppresses its own second row — 30017 does exactly that, and it
  is one of the prose-only 11.
- Keying on presence rather than supplied-locus produces byte-identical
  universes on today's data (668 ids are present-without-locus; none carries a
  wowhead locus row). So the trap the ticket warns about **cannot** be caught by
  any check over the shipped files. That is why the gate pins `carries_locus`
  on constructed sources as well as asserting over the emitted universes.

Also note `57-impact.py` runs the parser standalone and so reports the same
148/94/11 before and after — it is a planning instrument, not a verification.
Use `57-orphan-check.py` (61 → 0) and the new `57-removal-check.py`.

Ticket 45 can now be re-scoped: 40 of its 72 unparsed rows are moot. The parser
junk under "Ticket 56" below is untouched — still worth fixing.

## Ticket 57 (original) — the structural fix

Filed as
`57-guide-prose-should-not-source-items-a-machine-input-covers.md`. The guides
are an **editorial** input (which items matter); their Source cell restates
database facts we already hold. Measured: of the wowhead-parsed sources, **148
raid rows are redundant** with a machine input, **94 are load-bearing**
(crafted/pvp/badge/rep/world — `vendor/atlasloot/` holds only instance loot),
and **11 zone/boss claims rest on prose alone** — the same 11 that ticket 54's
`origin` query found from the other direction.

Suppressing the redundant 148 makes tickets 48–52 structurally unreachable for
covered items. Read the ticket before starting; it records the one trap
(suppress on *"the machine input supplies a zone"*, never on *"the item is
known to a machine input"* — the latter silently deletes heroic dungeon zones).

## Ticket 53 — CLOSED (`8ecaeb3`)

Detail in the ticket's closing note. One thing worth knowing before you read the
diff: it is **deletions only**, which looks lossy and is not — the canonicalised
wowhead row becomes byte-identical to the `db` row already present, so dedup
collapses the pair onto the machine-origin one. No item lost the `crafted` kind.

## Ticket 54 — CLOSED

- **Feral T6 map** — all five slots (`36957c0`, `065701e`); uncorroborated
  locus claims went **11 → 6**. `KNOWN_UNCORROBORATED` is now one item, `30017`.
- **Fixture guidance became a gate, not a doc line.** `realPoolEntry` throws
  when a fixture item rests a zone/boss claim on transcription alone — the funnel
  all 19 call sites already pass through, so it fires at the moment of the
  mistake. The wider rule ("must have a machine source") was tried and rejected:
  it failed two badge/rep fixtures that name no place and so cannot be
  misattributed. Nothing was added to `AGENTS.md`.
- ~~**Write down the "prefer the machine source over guide prose" rule.**~~
  **Done by 57 landing** — the pipeline enforces it and
  `pnpm wowhead-prose:check` gates it, which beats a doc line. Do not also
  write the doc line.
- **Fixture-authoring guidance** (do not author fixtures from shipped data).
  Still unwritten; still an AGENTS.md change, so it needs proposing in chat.

One caveat worth carrying, from the 30129 case in ticket 50: the p4/p5 pages
give a **structured** `[npc=21213]` that is factually wrong. A machine-readable
id is a *stronger* witness than prose, not an infallible one. Do not over-read
57's rule as "ids are always right".

## Ticket 56 — the scraper

Now **smaller**, and **unblocked** — 57 has landed. The scrapeability question
is answered (yes, no browser). The scraper needs only the item id and rank
label, both structured on the page as `[item=NNNNN]` and a plain `[td]` — not
the Source prose.

Fold in the dropped-label defect inherited from ticket 55: our p4 file has
`rankLabel: null` on the 40 `alternative`-section rows the page does label. A
faithful scrape fixes that, and there is no longer a singleton gate to fight.

Parser junk worth fixing while nearby, exposed by the 57 measurement:
`31856 Darkmoon Card: Crusade` → `zone: "Bind on Equip"`;
`32658 Badge of Tenacity` → `boss: "Depleted Badge"`;
`29301 Band of the Eternal Champion` → `zone: "The Scale of the Sands Exalted"`.

## Records cleanup — DONE (`ebc7525`)

An earlier version of this doc numbered these 1–4, which collided with the
ticket numbers and confused two sessions. Don't reintroduce the numbering; the
tickets are the only numbered things here.

The last item is closed. **Option 1, chosen by the user:** `wowheadSourceText`
holds what the page says, `correctedSourceText` sits beside it, and only the
parser prefers the correction (`source_text_for_parsing`). Applied to p4/p5
only — p3's page is right, so its value is already faithful. Detail and the
re-measurement in ticket 54's closing note.

## Process notes that cost time

- **`git checkout <file>` reverts uncommitted work in that file.** It silently
  ate a gate once. **Read the commit back** —
  `git show <sha>:<path> | grep -c <marker>` — for anything a message claims.
- **Two agents shared this branch, and the second rebased onto the first.** If
  you are handed a sha, confirm it still exists (`git cat-file -e <sha>`) before
  reasoning about it — 57's work was `f072468` pre-rebase and `424c5a4` after,
  and a session that cached the old sha drew a wrong conclusion from it. Check
  worktree state at the moment you need it, not from earlier in your session.
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
