# `check_merge_ready.py` disposition parser — defect review

Written 2026-09-12. Read-only: no edit, commit, stage or checkout was performed
against the repo. All parser probes ran against **copies** in a scratchpad
directory, never the working tree. This file is the only write.

Probe directory:
`C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\ce93c1ad-6697-4f47-a813-95dfd1191b40\scratchpad\probe`

---

## Answer to the question you actually asked: two defects, not one. Plus a third.

**They are two distinct holes.** They live in different regexes, on different
lines, and fixing either one leaves the other entirely intact.

| | Ticket 85 defect | Independent-review defect |
| --- | --- | --- |
| Where | `parse_disposition`, line 156 — the **section anchor** `re.search(r"(?ms)^## Disposition\s*\n(.*?)(?=^## \|\Z)")` | `DISPOSITION_RE`, lines 47–50 — the **row pattern**'s `(fixed\|defer\|wontfix)` group |
| What is invisible | every row in the 2nd..Nth `## Disposition` section | a single row whose disposition word is not one of the three |
| Trigger | a second table anywhere in the file | one bad cell in any table |
| Fix | `re.finditer` instead of `re.search` | match `([^\|]+?)` then validate the word |

Applying the ticket-85 fix (`finditer`) changes nothing about the `Sp1 … n/a`
row — it would still be skipped, now in whichever section it sits. Applying the
unknown-disposition fix changes nothing about the second table — its rows are
never handed to `DISPOSITION_RE` at all, because the anchor already sliced them
away. **Two independent fixes, two tests.**

**And there is a third, which neither the ticket nor the review names.** The
anchor requires `## Disposition` followed immediately by a newline, so a heading
carrying *any* trailing text does not match. Two real files in `docs/reviews/`
already have one. Details in Defect C.

---

## Defect A — the first-table-only anchor (ticket 85). CONFIRMED STILL REAL, and worse than filed.

### Is ticket 85 still real? Yes. Re-derived, not taken on trust.

`scripts/check_merge_ready.py:156` on `dev` today reads exactly what the ticket
quotes:

```python
m = re.search(r"(?ms)^## Disposition\s*\n(.*?)(?=^## |\Z)", text)
if not m:
    return []
```

`git log --oneline -- scripts/check_merge_ready.py` shows seven commits, none of
which touched this line: `04bb7b2` (blocked status), `230e1bf` (relevant-ticket
warn), `1f03344` (bold status / ticket 147), `ee9e220` (rename), `30bb9f3`,
`07a9fc6`, `625a677`. Ticket 85's own `Status:` line still reads `open`.
**Nothing fixed it.**

### CONFIRMED — synthetic two-table fixture

Case A of `probe2.py`, a file with two `## Disposition` sections, second one
carrying a `defer` row pointing at a ticket that does not exist:

```
A: two Disposition sections
   rows returned: 1 -> [('A1', 'fixed')]
   => PASSES parse; gate proceeds
```

One row parsed of two. The `defer` row pointing at
`.scratch/carry-forward/issues/999-nope.md` — a file that does not exist — was
never resolved, never status-checked, and produced no warning. That is the exact
contract violation the gate exists to prevent.

### CONFIRMED — the real files, and the scale is much larger than the ticket says

Ticket 85 reports "nine rows, one of them a `defer`". Measured across
`docs/reviews/` today (`probe1.py`, comparing `parse_disposition()` against every
row matching `DISPOSITION_RE` file-wide):

```
feat-upgrades-dedup-wowsims.md    6 headings   parsed=9    file-wide=61   MISSED=52
feat-candidate-pool.md            3 headings   parsed=36   file-wide=56   MISSED=20
fix-75-82-review-tickets.md       2 headings   parsed=23   file-wide=32   MISSED=9
feat-reforge-catchup-leftovers.md 2 headings   parsed=9    file-wide=17   MISSED=8
```

**`feat-upgrades-dedup-wowsims.md` has 61 disposition rows and the gate reads
9 of them.** Six review rounds accumulated in one file; the gate sees round 1
and stops.

### CONFIRMED — the missed rows include unvalidated `defer` rows

`probe4.py` isolates the missed rows and resolves each `defer` target:

```
feat-upgrades-dedup-wowsims.md : 52 missed rows, 15 of them DEFER
  D5  -> 308-duplicate-non-unique-item-unrankable.md          status='closed'
  S3,T1,T2,T3,T4 -> 307-upgrades-tab-borrow-gaps-...md        status='closed'
  A1  -> 317-upgrades-settings-emitter-never-emitted.md       status='closed'
  A2  -> 319-stale-guard-comments-in-read-helpers.md          status='closed'
  D3  -> 320-raid-zones-group-may-cover-non-raid-zones.md     status='closed'
  Sp1 -> 316-tmb-export-includes-owned-shortlist-rows.md      status='closed'
  Sp3 -> NO TICKET PATH  note='Ticket 315 — 313 committed unmet; see Summary…'
  Sp4 -> 318-ask-9-pool-source-line-is-dev-noise.md           status='closed'
  A1  -> 325-layout-gate-is-wired-into-no-gate.md             status='closed'
  A2  -> 326-layout-gate-span-assertion-has-an-escape-hatch.md status='closed'
  D1  -> 335-set-bonus-floor-under-models-4pc-noise.md        status='closed'

feat-candidate-pool.md : 20 missed rows, 6 of them DEFER
  S1,S2 -> 229-...md  status='resolved'
  P1,P2,P3 -> 231-...md  status='resolved'
  P8  -> 230-...md    status='resolved'

fix-75-82-review-tickets.md : 9 missed rows, 1 DEFER
  S-a -> 84-proto-drift-not-caught-by-local-verify.md  status='open'

feat-reforge-catchup-leftovers.md : 8 missed rows, 0 DEFER
```

**One row deserves singling out: `Sp3` in the dedup review carries no resolvable
ticket path at all** (`ticket_path_from_note` returns `None`). Had it been
parsed, it would have produced `Sp3: defer with no ticket path` — a hard gate
failure. It was silently skipped.

### Important honesty qualifier on the above

The `status=` values are read from **today's** working tree, not from the tree as
it stood at each merge. `closed`/`resolved` now does **not** prove the gate would
have failed then — those tickets were plausibly open at merge time and closed
later, which is the normal, intended lifecycle (the independent review confirms
`dev` history is full of defer rows whose tickets have since closed).

So: **"WOULD HAVE FAILED THE GATE" in the probe output is counterfactual against
current status only.** What *is* CONFIRMED regardless of timing is the structural
claim: those 15 + 6 + 1 defer rows were **never presented to the validation
logic at all**, at merge time or any other time. The gate did not check them and
find them acceptable; it did not look.

`Sp3` is the exception that needs no timing argument — "no ticket path" is a
property of the row's text, not of any ticket's status, so it would have failed
whenever it was parsed.

### CONFIRMED — three of these four branches reached `dev`

```
feat/upgrades-dedup-wowsims   : MERGED into dev
feat/candidate-pool           : MERGED into dev
fix/75-82-review-tickets      : MERGED into dev
feat/reforge-catchup-leftovers: not merged
```

This is not theoretical. Three merges to `dev` passed `merge-ready: ok` while the
gate had read a minority of the rows in the review file.

### How likely by accident? Near-certain — the documented workflow invites it

This needs no malformed file and no unusual word. It needs a **second review
round in the same file**, which is the repo's standard practice: 65 of 69
`## Disposition` headings across `docs/reviews/` are the plain form, spread over
fewer files than headings.

Worse, `docs/agents/known-traps.md:122` tells agents the opposite of the truth:

> `merge-ready` parses every Disposition row in `docs/reviews/<branch>.md`,
> across **all** rounds in the file.

That is false, and it is the document agents are instructed to read *before
writing a review Disposition table*. A reviewer following the trap file
correctly will append a second table believing it is checked.

`fix-75-82-review-tickets.md` shows someone already worked around it by hand —
its second heading literally reads `## Disposition (second pass — rows merged
into the table above so check_merge_ready.py parses them)`. The workaround is
institutional knowledge in a heading string, not a fix.

---

## Defect B — unknown disposition words vanish. CONFIRMED, independent of A.

`DISPOSITION_RE` (lines 47–50) only matches rows whose third cell is
`fixed|defer|wontfix`. A row with any other word does not match, so it never
becomes a `rows` entry — and the `else: unknown disposition {disp!r}` branch at
line 476 is **unreachable from a table**. It can only fire on a value that
matched the regex but is not one of the three, which the regex makes impossible.

### CONFIRMED — the `Sp1 … n/a` row the independent review cited

`probe1.py` against the touchpoints review:

```
touchpoints.md
   '## Disposition' headings visible : 1
   rows parse_disposition returns    : 15
   valid-disposition rows FILE-WIDE  : 15
```

15 parse. The 16th visible row is real — line 158 of the file on
`docs/fork-upstream-touchpoints`:

```
| Sp1 | Spec | n/a | No findings — all four brief-mandated survival items and all eight A4 items present, no scope creep |
```

The independent review's "15 parse, 16 visible" is **accurate as stated**.

### CONFIRMED — the severity depends on whether the whole table is bad

This is the redeeming detail, and it bounds the blast radius:

```
B: lone table, ALL dispositions unknown   -> rows=0  => LOUD: `if not rows` error fires
C: lone table, one good + one typo'd      -> rows=1  => PASSES parse; gate proceeds
```

A wholly-mistyped table fails loudly ("review has no parseable ## Disposition
table"). **A single mistyped row among good ones is silent.** So the dangerous
case is one typo, not a broken file — which is the more likely mistake.

### How likely by accident? Low but non-zero, and the census shows it is already happening

Census of the disposition column across every file in `docs/reviews/`:

```
467 fixed
225 wontfix
160 defer
  1 n/a          <- Sp1, the touchpoints review
```

Plus header/separator noise (`disposition`, `-----------`) which the
`fid.lower() in ("id","---")` guard already discards harmlessly, and a long tail
of strings that are **severity values from 5-column tables**, not dispositions
(`major`, `minor`, `blocker`, `sev`, `low`) — see Defect D.

So: exactly **one** genuine out-of-vocabulary disposition exists today, it is
semantically honest (`n/a` for an axis with no findings), and it hides nothing.
The risk is prospective: a future `defered` / `fixed?` / `deferred` typo would
disappear rather than fail. Note `deferred` (the natural English spelling) is
**not** matched — `defer` is, but the regex anchors the whole cell, so
`deferred` fails. That is a plausible typo with a silent outcome.

---

## Defect C — headings with trailing text do not anchor at all. CONFIRMED. Not in either source.

Neither ticket 85 nor the independent review mentions this. The anchor is
`^## Disposition\s*\n` — `\s*` then a newline, so any trailing characters on the
heading line break the match entirely.

CONFIRMED from `probe1.py`:

```
feat-candidate-pool.md
   '## Disposition' headings visible : 3
   headings the anchor regex matches : 2
      '## Disposition'            -> MATCHES
      '## Disposition (round 3)'  -> NOT MATCHED by anchor
      '## Disposition'            -> MATCHES

fix-75-82-review-tickets.md
   '## Disposition' headings visible : 2
   headings the anchor regex matches : 1
      '## Disposition'                                        -> MATCHES
      '## Disposition (second pass — rows merged into the…'   -> NOT MATCHED
```

And synthetically (`probe2.py` case D): a file whose **only** heading is
`## Disposition (round 3)` returns 0 rows → the loud `if not rows` error fires.

**Why this matters for the fix:** it interacts with Defect A. Naively swapping
`re.search` for `re.finditer` on the same pattern fixes the plain-form second
tables but **still** misses `## Disposition (round 3)`. Both real-world variants
must be handled, so the anchor needs `^## Disposition\b.*\n` (or similar), not
just a different search method. A fix that only changes `search`→`finditer`
would be tested green against `feat-reforge-catchup-leftovers.md` and still
under-read `feat-candidate-pool.md`.

---

## Defect D — 5-column tables return zero rows (loud, but a trap). CONFIRMED.

`DISPOSITION_RE` is anchored `^...$` with exactly four cells. A table with a
severity column does not match:

```
E: 5-column table (extra col) -> rows=0 => LOUD: `if not rows` error fires
```

This is **fail-loud**, so it is not a silent-skip defect. It is recorded because
the disposition-column census shows `major` (19), `minor` (14), `blocker` (6),
`sev` (3), `low` — meaning 5-column tables **exist in this repo's review files**.
Where such a table is the only one in a file the gate fails loudly and someone
fixed it; where it sits alongside a 4-column table, its rows are silently absent
from the count by the same mechanism as Defect B. Worth a line in the fix's
test matrix, not a separate ticket.

---

## Question 4 — other silent-skip paths in the same parser

### D1. `ticket_path_from_note` can crash the gate on an absolute path — PLAUSIBLE

`probe3.py`:

```
note='see `C:/somewhere/else/issues/380-x.md`'
   -> C:\somewhere\else\issues\380-x.md
      relative_to(ROOT) RAISES ValueError -> CRASH in check()
```

`check()` line 461 does `tpath.relative_to(ROOT)` **before** the `is_file()`
test, and `ticket_path_from_note` returns an absolute path unchanged
(line 178: `return p if p.is_absolute() else ROOT / p`). An absolute ticket path
in a note raises an uncaught `ValueError`. Marked PLAUSIBLE: I proved the
`relative_to` raise in isolation, but did not execute `check()` end-to-end to
confirm nothing upstream catches it. This is fail-loud-but-ugly (a traceback,
not a pass), so it is a robustness bug, not a gate hole.

A `../../` relative path, by contrast, resolves *outside* the repo without
raising — `relative_to(ROOT)` returns `../../other/issues/380-x.md` — and then
fails the `is_file()` check loudly. Acceptable.

### D2. `unparseable_status_tickets()` is complete for its stated scope, but its scope is narrow — CONFIRMED

The guard iterates `iter_issue_files()`, which is `sorted(CARRY.glob("*.md"))` —
`.scratch/carry-forward/issues/*.md` only, non-recursive. Within that scope it is
genuinely complete: it flags both "no Status: line" and "unknown status", so the
ticket 88/89 shape cannot recur there.

Two gaps outside that scope:

- **A `defer` row can point anywhere.** `ticket_path_from_note` accepts any
  `*/issues/NNN-*.md` path, and `read_status` reads it directly. A defer target
  outside `CARRY` is status-checked by `check()` but is never swept by
  `unparseable_status_tickets()`. In practice all current defer targets are in
  `CARRY`, so this is latent.
- **Tickets in subdirectories are invisible.** `glob("*.md")` is non-recursive by
  deliberate design (the docstring says "not nested worktree / scratch copies"),
  which is correct — but it means a ticket filed one directory deep is invisible
  to `pnpm issues:open` and to the unparseable sweep alike, silently.

### D3. The header/separator guard is sound — CONFIRMED

`fid.lower() in ("id","---") or set(fid) <= {"-"}` discards table headers and
rules. It discards only rows whose **ID cell** is those values, so it cannot eat
a real finding. No defect.

### D4. The `if not rows` error message is misleading — CONFIRMED, cosmetic

When a second table exists but the first is fine, no error fires at all. When
everything fails, the message reads "review has no parseable ## Disposition
table" — accurate. But there is **no message for the partial case**, which is
the whole of Defects A and B. The gate prints `disposition rows: N` with no
denominator, so `9` looks identical to `9 of 61`. **Printing a count with no
expected total is what makes every defect here silent rather than loud.**

---

## Question 5 — the fix (described, not implemented)

### Shape

1. **Anchor all sections, and tolerate trailing heading text.**
   Replace `re.search(...)` with `re.finditer` over a pattern like
   `^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)`, concatenating rows from every
   match. This closes Defect A **and** Defect C together; either alone leaves
   real files under-read.

2. **Match the disposition cell permissively, then validate.**
   Change the third group from `(fixed|defer|wontfix)` to `([^|]+?)` and let the
   existing `else: errors.append(f"{row['id']}: unknown disposition …")` branch
   at line 476 finally become reachable. This closes Defect B and makes a typo
   fail loudly. **This needs an allowlist decision:** `n/a` is in current use and
   is honest ("axis found nothing"). Either add `n/a` to the accepted set as a
   no-op disposition, or flip the touchpoints `Sp1` row to `wontfix`. Turning
   this on without deciding will fail the touchpoints branch's merge.

3. **Print a denominator.** `disposition rows: 9` should read
   `disposition rows: 9 (from 3 sections)` and, once step 2 lands, any row that
   did not parse should be reported. Silence is the defect; a count with no
   expected total cannot be sanity-checked by a human.

4. **Duplicate IDs.** Ticket 85 suggests failing when two rows share an ID. I
   recommend **not** doing this as part of the fix: multi-round files legitimately
   reuse `A1`/`D1` per round (confirmed — `feat-upgrades-dedup-wowsims.md` has
   two `A1` and two `A2` rows across rounds), so an ID collision check would fail
   nearly every existing review file. If wanted, scope IDs per section instead.

5. **Regression tests.** The repo's convention is `--self-test` checks in the same
   file (`CHECKS` tuple, line 785). `parse_disposition` is pure — text in, list
   out — so it fits that harness with no new infrastructure. Minimum matrix: two
   plain sections; a `(round 3)`-style heading; one typo'd row among good ones;
   an all-typo'd table (must stay loud); a 5-column table.

6. **Correct `docs/agents/known-traps.md:122`**, which currently asserts the
   parser reads all rounds. Until the fix lands it is false; after the fix it
   becomes true. Either way it should not be left stating the behaviour the code
   does not have.

### Ticket routing

- **Ticket 85: keep open, and update it.** Its diagnosis is correct and its
  suggested `finditer` fix is right in direction but **incomplete** — it does not
  cover `## Disposition (round 3)` (Defect C). Its scale figure ("nine rows") is
  also badly understated; the real worst case is 52. Both are worth correcting in
  the ticket body so whoever fixes it does not test against the wrong target.
- **File a new ticket for Defect B.** Different regex, different fix, and it
  carries a vocabulary decision (`n/a`) that ticket 85 does not. Folding it into
  85 would hide a judgement call inside a mechanical fix. No existing ticket
  covers it — I checked every ticket naming `check_merge_ready.py` (85, 145, 147,
  227, 234, 238, 262); none is about the row regex. `NEXT` reads `381`.
- Defects C and D belong **inside** ticket 85 as part of its acceptance criteria,
  not as separate tickets — C because it must be fixed in the same regex, D
  because it is only a test-matrix line.

### Should any merged branch be re-checked?

**Yes — three, and one specifically.**

`feat/upgrades-dedup-wowsims`, `feat/candidate-pool` and `fix/75-82-review-tickets`
all reached `dev` with the gate reading a minority of their disposition rows.
Re-running the gate against them today is not meaningful (their tickets have since
closed, which is the normal lifecycle), so the useful check is narrower:

**`Sp3` in `feat-upgrades-dedup-wowsims.md` is the one to look at.** It is a
`defer` row with **no resolvable ticket path** — its note reads
`Ticket 315 — 313 committed unmet; see Summary. Do not c…`, naming a ticket in
prose rather than as a path. Had the gate parsed it, it would have failed with
`defer with no ticket path`. That is a finding deferred into a prose reference,
which is precisely the "deferred into a void" failure the gate exists to stop.
Worth confirming by hand that ticket 315's content was actually addressed.

The other 20 missed defer rows all name real ticket files that exist on disk, so
the bookkeeping was done even though the gate never verified it. Low priority.

---

## CONFIRMED vs PLAUSIBLE

**CONFIRMED — I ran it and the output is quoted above:**

- `parse_disposition` on `dev` is unchanged since ticket 85 was filed; ticket 85
  `Status: open`; no commit touched line 156
- parsed-vs-file-wide row counts for all four multi-table review files
  (9/61, 36/56, 23/32, 9/17)
- the missed rows include 15 + 6 + 1 `defer` rows, itemised with their targets
- `Sp3` resolves to no ticket path at all
- a synthetic two-table fixture returns 1 row of 2 and passes the gate
- `## Disposition (round 3)` and the `(second pass…)` heading do not match the
  anchor; both exist in real files
- `Sp1 | Spec | n/a` exists at line 158 of the touchpoints review; 15 of 16 rows
  parse — the independent review's figure is accurate
- an all-unknown table fails loudly; a single unknown row among good ones is silent
- a 5-column table returns 0 rows
- the disposition-value census across `docs/reviews/` (467 fixed / 225 wontfix /
  160 defer / 1 n/a, plus severity-column noise)
- three of the four multi-table branches are ancestors of `dev`
- `known-traps.md:122` asserts all rounds are parsed
- `unparseable_status_tickets()` covers `CARRY/*.md` non-recursively, flagging
  both missing and unknown statuses
- no existing ticket covers the row-regex defect

**PLAUSIBLE — reasoned, not executed:**

- that an absolute path in a defer note crashes `check()` with an uncaught
  `ValueError`. I confirmed `relative_to(ROOT)` raises in isolation and read the
  call order at line 461, but did not run `check()` end to end.
- that the three merged branches were green at merge time *because* of these
  defects. The structural claim (rows never reached validation) is confirmed; the
  counterfactual (the gate would have failed then) is not, because ticket
  statuses have moved since. `Sp3` is the exception — it would have failed at any
  time.
- that correcting `DISPOSITION_RE` would fail the touchpoints branch's merge on
  the `n/a` row. The code path is unambiguous but I did not execute it.

---

## What I could not determine

1. **Whether any *unmerged* branch's review file is currently under-read.** I
   swept `docs/reviews/` on the working tree plus the touchpoints branch's review
   file. Review files living only on other unmerged branches were not enumerated.
2. **Whether ticket 315 (the `Sp3` target) was substantively addressed.** I
   established the row was never validated; I did not audit the ticket's content
   or the code that was supposed to satisfy it.
3. **Whether the gate was actually green at each of the three historical merges.**
   Reconstructing that needs the ticket statuses as of each merge commit, which
   means reading each ticket file at that SHA. Not done — it would not change the
   recommended fix.
4. **Whether `n/a` should be accepted or the `Sp1` row rewritten.** That is a
   vocabulary decision for the owner, not a measurement.
5. **Whether any historical review file ever carried a genuinely mistyped
   disposition that this defect hid.** The census covers the current state of
   `docs/reviews/`; I did not walk git history for rows that were later corrected.
