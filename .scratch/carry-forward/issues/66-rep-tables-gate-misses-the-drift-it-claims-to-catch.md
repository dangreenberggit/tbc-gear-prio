Status: closed
Resolution: fixed in 3f53c81 on `feat/phase-3-vendor-and-craft-coverage`.
  Defects 1-3 fixed; defect 4 took the "minimum" (cite with caveat) rather than
  pinning `names.ts`, because `REP_FACTION_DISPLAY` is read at module import and
  `vendor/` is gitignored, so parsing it would make `pnpm verify` hard-fail on a
  fresh worktree until a network restore ran.

  **The ticket's premise was wrong in one place, and it mattered.** §1 and the
  `Done when` note treat prose factions as having no id ("Lower City is
  prose-only, has no proto id"). Every faction has an id -- Wowhead exposes it in
  the URL (`wowhead.com/tbc/faction=1011/lower-city`), and this repo's own
  `notes/65-faction-ids.md` already recorded 1011. What was missing was a lookup,
  not an id. Resolving prose names to ids at parse time removed the need for the
  allowlist §1 asks for, and made the exact comparison it wanted trivial. See
  ticket 67 for the follow-up review of that change.
Type: bug
Origin: adversarial review of `feat/phase-3-vendor-and-craft-coverage`, 2026-08-08
Blocks: none
Blocked by: none
Relates to: 65 (this reviews the gate ticket 65 step 1 added)

# `check_rep_tables.py` misses the drift its own docstring calls load-bearing

Three defects in code landed by ticket 65 step 1, plus one missed opportunity.
All four reproduced by the author before filing; every command below was run.

Nothing here is urgent — the gate protects a **presentation** invariant (the
faction string's only consumer is `rank-report.ts:43`, which interpolates it
into a label; nothing filters, groups or joins on it). No shipped data is
wrong. But the gate does not do what it says it does, and a gate that reports
green while the invariant is broken is worse than no gate.

## 1. The spelling check is blind to any change in letters

`scripts/check_rep_tables.py:113-122`

The comparison collapses apostrophes and spaces, then only records a failure
when `matches` is non-empty:

```python
collapsed = name.replace("'", "").replace(" ", "").lower()
matches = [k for k in known if k.replace("'", "").replace(" ", "").lower() == collapsed]
if matches and name not in matches:
```

Drop the article and the collapsed forms differ (`theconsortium` vs
`consortium`), so `matches` is empty and the `if` short-circuits to a no-op.
Only punctuation and whitespace drift is detectable — which is two of the ten
factions (`Ogri'la`, `The Mag'har`). The other eight are effectively unchecked.

```bash
python - <<'PY'
import sys, io, contextlib
sys.path.insert(0, "scripts")
import check_rep_tables as c

def run(label, spellings):
    orig = c.universe_rep_spellings
    c.universe_rep_spellings = lambda: spellings
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = c.main()
    c.universe_rep_spellings = orig
    print(f"  {label:46} rc={rc}")

run("Ogri'la -> Ogrila (punctuation)", {"Ogrila"})
run("The Consortium -> Consortium (dropped article)", {"Consortium"})
run("Ashtongue Deathsworn -> ...sworne (typo)", {"Ashtongue Deathsworne"})
PY
```

Observed:

```
  Ogri'la -> Ogrila (punctuation)                rc=1
  The Consortium -> Consortium (dropped article) rc=0   <-- passes
  Ashtongue Deathsworne (typo)                   rc=0   <-- passes
```

`The Consortium` is one of the two examples the docstring names as load-bearing.

**Fix:** compare exactly. The collapsing exists to pair a shipped spelling with
its table entry, but the pairing key should be the faction *id* where one is
known, not a lossy normalisation of the name. Where no id is available (prose
rows), an exact set-membership test against the table's values is the honest
check: a shipped name that is not in the table and not a known prose-only
faction is either drift or a new faction, and both deserve a failure.

Watch the false-positive edge: `Lower City` is prose-only, has no proto id, and
must keep passing. See invariant 4's existing comment.

## 2. An empty `data/universes/` makes the check vacuous and it still prints ok

`scripts/check_rep_tables.py:61-76, 111`

`universe_rep_spellings()` globs a directory. Nothing there, no loop body, no
failure — and real drift is masked by the unrelated missing input:

```bash
python - <<'PY'
import sys, io, contextlib
from pathlib import Path
sys.path.insert(0, "scripts")
import check_rep_tables as c
c.UNIVERSES = Path("does-not-exist")
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    rc = c.main()
print(f"rc={rc} | {buf.getvalue().strip()}")
PY
# rc=0 | rep tables ok: 10 factions, 10 used by db.json, 4 standings in use, 0 spellings shipped
```

The evidence of vacuity (`0 spellings shipped`) is printed and ignored.

The repo already has the idiom, in the sibling gate this script was modelled on
— `scripts/check_wowhead_prose_suppression.py:90`:

```python
if not paths:
    return ["no universe files found -- this check would pass vacuously"]
```

The new script guards its *other* input correctly (`if not db_factions:` fires
when db.json is missing) but not this one, so it is an oversight, not a
decision.

**Fix:** copy the sibling's guard.

## 3. `_enum_members` silently drops members with a trailing option

`scripts/assemble_universe.py:519-528`

The member regex `^\s+(\w+)\s*=\s*(\d+);` requires `;` immediately after the
digits, so a member carrying an option is skipped with no error. Because the
function only raises when the member list is *entirely* empty, a partial parse
is silent.

```bash
python - <<'PY'
import re
RE = r"^\s+(\w+)\s*=\s*(\d+);"
for label, body in {
    "trailing option": "enum T {\n\tA = 0;\n\tB = 1 [deprecated = true];\n}",
    "negative value": "enum T {\n\tA = 0;\n\tB = -1;\n}",
    "line comment": "enum T {\n\tA = 0; // note\n\tB = 1;\n}",
    "reserved range": "enum T {\n\treserved 2 to 5;\n\tA = 0;\n\tB = 1;\n}",
}.items():
    inner = re.search(r"enum T \{(.*?)\n\}", body, re.S).group(1)
    print(f"  {label:16} -> {dict((int(n), k) for k, n in re.findall(RE, inner, re.M))}")
PY
```

Observed — the first two lose member `B`, the last two parse correctly:

```
  trailing option  -> {0: 'A'}
  negative value   -> {0: 'A'}
  line comment     -> {0: 'A', 1: 'B'}
  reserved range   -> {0: 'A', 1: 'B'}
```

Not triggered today: no enum member in any pinned proto carries an option. But
`[deprecated = true]` is already live on message fields in `ui.proto` (4
occurrences), so the syntax is in use in the very file this parses, and marking
an enum member deprecated is an ordinary upstream move.

For `RepFaction` a dropped member is caught downstream by `rep_faction_names()`'s
bidirectional sync assertion. **`RepLevel` and `Profession` have no such
assertion**, so a dropped member there would surface as `map_db_source` falling
back to `str(prof)` — a bare number in a display field.

**Fix:** either widen the regex to tolerate an option suffix, or (better) raise
on any line inside the enum body that looks like a member but does not parse.
Silent partial success is the actual defect; the regex is just how it happens.

## 4. Upstream already ships this exact table — cite it, or parse it

`scripts/assemble_universe.py:549-572` argues at length that the display names
"are not derivable" and must be hand-typed. True as far as it goes, but wowsims
ships the identical table and it is sitting in this repo:

`.scratch/wowsims-tbc-new-src/ui/core/proto_utils/names.ts` — `REP_FACTION_NAMES`
(~line 184) and `REP_LEVEL_NAMES` (~line 172). All ten spellings match ours
character for character, both directions, including `"Ogri'la"` and
`'The Consortium'`:

```bash
python - <<'PY'
import re, sys
sys.path.insert(0, "scripts")
from assemble_universe import REP_FACTION_DISPLAY
src = open(".scratch/wowsims-tbc-new-src/ui/core/proto_utils/names.ts", encoding="utf-8").read()
blk = re.search(r"REP_FACTION_NAMES.*?\n\};", src, re.S).group(0)
up = {k: (a or b) for k, a, b in
      re.findall(r"RepFaction(\w+)\]:\s*(?:'([^']*)'|\"([^\"]*)\")", blk)}
up.pop("Unknown", None)
ours = set(REP_FACTION_DISPLAY.values())
print("upstream not in ours:", sorted(v for v in up.values() if v not in ours) or "none")
print("ours not in upstream:", sorted(ours - set(up.values())) or "none")
PY
# upstream not in ours: none
# ours not in upstream: none
```

**Important caveat the reviewer did not catch:** that path is **gitignored and
untracked** (`.gitignore:40` matches `.scratch/*`). It is a local scratch
checkout of wowsims source, not a pinned artifact. So it is a *corroborating
witness available today*, *not* a dependency to build on — a fresh worktree will
not have it, and per AGENTS.md's durable-claims rule this ticket must not assert
it is present.

**Fix, in order of preference:**

- Minimum: cite it in the `REP_FACTION_DISPLAY` comment as the second witness
  that the spellings are upstream's, not invented — with the caveat that it is
  untracked, so a future reader knows to re-fetch rather than assume.
- Better: if `scripts/sync_wowsims.py` can pin `names.ts` the way
  `sync_atlasloot.py` pins `data-tbc.lua`, parse the spellings from it. Then the
  hand-typed table and most of this gate stop being necessary at all. Check
  whether that file is fetchable at the pinned commit before committing to this.

This matters beyond tidiness: the repo's recurring complaint (tickets 48-53, 58)
is single-witness transcription. A hand-typed table whose corroborating source
was in the tree and went uncited is that same pattern applied to itself.

## Done when

- The three defects have a test or a demonstrated failing-then-passing run;
  reuse the commands above, they are the reproductions.
- `pnpm verify` green.
- Either the upstream table is cited with its untracked caveat, or `names.ts` is
  pinned and parsed and the hand-typed table is deleted.
- If invariant 2 (spelling agreement) cannot be made to catch letter drift
  without false positives on prose-only factions, **deleting it is an acceptable
  outcome** — say so in the commit. Invariants 1 and 3 (every id and repLevel in
  use resolves) are the parts that protect step 2's correctness and should stay
  regardless.
