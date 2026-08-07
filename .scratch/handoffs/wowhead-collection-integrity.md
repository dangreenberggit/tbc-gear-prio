# Handoff: what is left after the tier-source work

For whoever picks up tickets 53, 54, 55 or 56 on `fix/carry-forward-backlog`.

Written 2026-08-07. Measured on `830dae0`. The branch is **unreviewed and
unlanded** — `pre-merge-review` has not been run.

## What already landed (do not redo)

Five commits, `c3f5b97` → `830dae0`. Tickets 48, 49, 50, 51 and 52 are closed.

| Commit | What |
|---|---|
| `c3f5b97` | parser splice fix (48), transcription fixes (49/50), tier cross-check gate (51) |
| `98bbff6` | boss sub-unit → encounter folding (52), `check_boss_aliases.py` |
| `37b8c46` | per-row `origin` on every source |
| `8bdfd3f` | witness gates — including ones `37b8c46`'s message wrongly claimed |
| `830dae0` | corrected the *cause* of 49/50; paraphrase gate |

`pnpm verify` on `830dae0`: 425 passed, 32 files, Node v22.16.0.

## Read this before touching any of it: the errors are ours

**The Wowhead pages are correct. We introduced the errors when collecting them.**

That is the opposite of what tickets 49 and 50 originally said, and the
opposite of what `data/two-hop/ret-tokens.json` used to claim. Both are now
corrected. A user screenshot of the live P4 chest table settled it: the page
reads `(via Chestguard of the Forgotten Conqueror)` for 30990 and lists 30129
below an "Other Chest Armor Recommendations" fold as `Optional | Kael'thas
Sunstrider (Tempest Keep)`. Both correct; both wrong in our file.

If you find yourself writing "the upstream source is wrong", stop and check a
screenshot or the live page first. That story was written down once and
believed for a whole session.

## Paraphrase is the tell

The page's Rank column uses a small vocabulary — `Best` and `Optional`, 16 each
in p4. Our collected file also has 17 labels appearing exactly **once**
(`"Optional - tier"` and `"Optional - Tier"` are two spellings of the same
invented idea). Those singletons are the collecting agent summarising instead
of copying, and **all three known defects sat on singleton rows.**

Treat **paraphrase** as the marker for a row worth re-checking. It means the
agent stopped copying and started interpreting, which is where facts drifted.

`pool-hardening.test.ts` > "rankLabel is copied, not paraphrased" pins the
per-file singleton counts so they can only shrink; `SINGLETON_BUDGET` in that
file holds the current numbers (92 across seven files, worst ret-p5 at 27).
Lower a budget when you re-collect its file. It is a backlog counter, not a
correctness verdict.

## Ticket 55 — check the 14 suspect p4 rows

These carry singleton labels but are **not** known to be wrong. Checking them
is a measurement job against the live page, not a rewrite:

```
30989 Lightbringer War-Helm          'Tier Option'
32581 Swiftstrike Shoulders          'Best - No Expertise'
30997 Lightbringer Shoulderbraces    'T6 Option'
33122 Cloak of Darkness              'Best - Crafted'
24259 Vengeance Wrap                 'Optional-Crafted'
30905 Midnight Chestguard            'Best - Non tier'
28485 Bulwark of the Ancient Kings   'Crafting - Alternate'
30057 Bracers of Eradication         'Option - Hit'
28795 Bladespire Warbands            'Option - Non Hit'
29950 Greaves of the Bloodwarder     'Optional - Human'
32345 Dreadboots of the Legion       'Optional - Hit'
23206 Mark of the Champion           'Undead Only & Demons'
33688 Vengeful Gladiator's Greatsword 'PVP Option'
23203 Libram of Fervor               'Optional Easy to Obtain'
```

**Two are already partly resolved by the same screenshot**, and they show the
two failure modes are separable:

- `30905 Midnight Chestguard` — page says `Best`; we wrote `"Best - Non tier"`.
  Source text (`Drop: Archimonde (Hyjal Summit)`) is **correct**.
- `28485 Bulwark of the Ancient Kings` — page says `Best`, source
  "Blacksmithing (Bind on Pickup) *(requires Armorsmithing)*". We compressed
  that to `"Armorsmithing Blacksmithing (BoP)"` — label paraphrased, facts
  intact.

So a paraphrased label does **not** imply wrong facts. It marks a row where the
agent was interpreting, which is where facts sometimes drifted. Do not "fix"
these by guessing; check the page.

Note the Bulwark case is also the origin of ticket 53's dirty value: the
`"Armorsmithing Blacksmithing"` compression is what reaches `profession`.

## Ticket 53 — `profession` carries prose

12 distinct values for five real professions
(`"Jewelcrafting - can be purchased on the Auction House"`, `"Master
Hammersmith Blacksmithing"`). Rendered to users via `formatItemSource`
(`packages/core/src/rank-report.ts:41`) but **not** a filter control, so
display-only today. Same `" - "` splice shape as ticket 48.

Given the Bulwark finding above, decide whether to fix this at the parser or by
re-collecting the source cell verbatim (ticket 56) — the prose is being
compressed at collection time, so a scraper may make the parser fix redundant.

## Ticket 54 — remaining items

Per-row `origin` shipped and the witness gate is in place, allowlisting 5 ids.
Still open:

- **Feral T6 has no two-hop map.** `feral-tokens.json` stops at T5 and says so
  in its own notes. Four Thunderheart pieces (31034, 31042, 31044, 31048) have
  no map row and are 4 of the 5 allowlisted ids. Closing this gap removes them
  from `KNOWN_UNCORROBORATED` — and the companion test will *fail* until you
  remove them, which is intended.
- **Write down the "prefer the parsed/curated side" rule.** Three independent
  confirmations now (49, 50, 52). It keeps getting re-derived per incident.
- **Fixture-authoring guidance.** `pool.test.ts` and `view.test.ts` both used
  30129's bogus row as their multi-zone fixture, with a comment asserting it
  "really does carry" both zones — a test authored by reading shipped data
  inherits its errors and pins them. This belongs in AGENTS.md, which this
  repo's own rule says must be **proposed in chat and approved** before
  editing. Not done.

## Ticket 56 — the scraper

Filed, not started. The pages are correct and near-static, so this is a
maintenance and re-collection win rather than an urgent correctness fix. The
user noted event-related items are the one genuinely churning category.

**First question, unanswered:** are these pages scrapeable without a headless
browser? Wowhead renders a lot client-side. Fetch one `sourceUrl` and grep the
body for a known item name — that decides whether this is a small script or a
browser-automation job.

## Process notes that cost time this session

- **`git checkout <file>` reverts uncommitted work in that file.** I used it to
  undo a mutation test, silently lost a gate, then wrote a commit message
  describing the gate. **Read the commit back** —
  `git show <sha>:<path> | grep -c <marker>` — for anything you claim in a
  message. A working tree that matches `HEAD` looks identical whether the work
  landed or was reverted, so the tree cannot answer this question.
- **Regenerate universes after any `git checkout data/universes/`.** The
  checkout reverts the regenerated output, not just your mutation.
- The regen loop is per spec and phase; `data/universes/` has six files:
  ```bash
  for spec in ret feral; do for ph in 2 3 4 5; do
    [ -f "data/universes/$spec-p$ph.json" ] && python scripts/assemble_universe.py --max-phase $ph --spec $spec
  done; done
  ```
- `pnpm verify` needs Node 22. On Node 20 six suites fail with
  `No such built-in module: node:sqlite` — environmental, not your bug.
- Prettier runs on commit via lint-staged and will reformat test files; if you
  `--write` first, `pnpm verify`'s `format:check` stops failing on you.

## Suggested order

1. **Answer the scrapeability question** (ticket 56, one fetch). It determines
   whether 53 and 55 are worth fixing by hand or fall out of re-collection.
2. **Feral T6 map** (ticket 54) — self-contained, clears 4 of 5 allowlist
   entries, and the existing gate tells you when you are done.
3. **The 14 suspect rows** (ticket 55) — cheap if the scraper lands, tedious
   otherwise.
4. **Ticket 53** — decide parser-fix vs re-collection first.
5. The two AGENTS.md items in ticket 54, which need a chat proposal.

Before any land ask: `pre-merge-review` → `docs/reviews/fix-carry-forward-backlog.md`.
