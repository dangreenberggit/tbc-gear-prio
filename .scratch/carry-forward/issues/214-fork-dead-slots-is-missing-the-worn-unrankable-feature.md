Status: open
Type: defect (ported engine is stale; browser output differs from core)
Origin: ticket 212 slice 3 pre-flight investigation, 2026-08-16
Blocks: none
Blocked by: none

# The fork is missing the `worn-unrankable` feature (two files)

`packages/core/src/dead-slots.ts` gained a `worn-unrankable` dead-slot cause in
commit `2e6b257` ("Mark worn-unrankable slots instead of showing false
losses", 2026-08-14). The fork's ported copy never received it.

Missing from
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/dead-slots.ts`:

- the `"worn-unrankable"` member of the cause union,
- the `WornUnrankableItem` type,
- the `wornUnrankable?` option field,
- the loop that emits a dead-slot row per worn-unrankable item, and
- the `if (unrankableSlots.has(slot)) continue;` guard that suppresses the
  normal row for those slots.

Reproduce (comment- and blank-line-stripped diff, so this is code, not
formatting):

```bash
F=vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/dead-slots.ts
C=packages/core/src/dead-slots.ts
strip() { grep -vE '^\s*(//|/\*|\*|$)' "$1" | sed 's#\s*//.*##'; }
diff <(strip $C) <(strip $F)
# 30 diff lines, all deletions relative to core
```

## Why both gates missed it

`PROVENANCE.md` labels `dead-slots.ts` as "none (import paths only)". That
label was accurate when written: the port table records core commit
`12ce5841`, and `2e6b257` is **not** an ancestor of it — the feature landed
after the table. Verify:

```bash
git merge-base --is-ancestor 2e6b257 12ce58414ad0f8f1e34c581d7583e6998e05e8bb \
  && echo ancestor || echo "not an ancestor"
```

So the file is **stale**, not mislabelled. Neither gate can see this:

- `scripts/check_engine_port_drift.py` hashes fork files against the
  PROVENANCE table. Both sides live inside the clone; it never reads
  `packages/core/src/`. A change landing in core and not the fork produces no
  signal at all.
- E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) is self-keying —
  see ticket 165.

This is a structural gap, not an oversight by whoever wrote the table: the
mechanism has no fork-vs-core comparison anywhere. Ticket 212 slice 3 is the
same pattern caught before it landed rather than after.

## `plausibility.ts` has the same gap

Same feature, same cause, same "none (import paths only)" label. Missing from
the fork's `upgrades/engine/plausibility.ts`:

- `"worn-unrankable"` in the cause list,
- the whole warning branch that explains the slot is unmeasured — the text
  telling the reader every row was scored against an empty slot and must not
  be read as an upgrade or a loss, and
- the `wornUnrankable` pass-through into `deadSlotWarnings`.

Same reproduce recipe, substituting `plausibility.ts` (14 code-diff lines).

## Audit of the other ported files

Every row of the PROVENANCE table was diffed against its
`packages/core/src/` source, comment- and blank-line-stripped. **All rows have
a core source that exists on disk** — there are no fork-only entries.

Divergence over 10 lines, complete:

| file | code-diff lines | PROVENANCE label |
|---|---|---|
| `seams/store.ts` | 137 | adapted (documented) |
| `rank.ts` | 140 | adapted (documented) |
| `meta.ts` | 116 | adapted (documented) |
| `enchants.ts` | 98 | adapted (documented) |
| `content-hash.ts` | 94 | adapted (documented) |
| `fixtures/report-events-offline.ts` | 73 | adapted (documented) |
| `pool.ts` | 49 | adapted (documented) |
| `items.ts` | 48 | adapted (documented) |
| `promotion.ts` | 41 | adapted (documented) |
| `gems.ts` | 29 | adapted (documented) |
| **`dead-slots.ts`** | **25** | **none (import paths only)** |
| **`plausibility.ts`** | **14** | **none (import paths only)** |

Every file over 10 lines except these two carries an "adapted" label naming a
specific documented reason (Database-backed instead of JSON-backed, reuses the
fork's own helpers, hand-written literals, and so on), so those divergences
are intended. The two bolded rows are the only files claiming to be pure
copies while differing in code, and both differ by exactly this one feature.

Of the **19** rows whose label begins "none", **12 are byte-identical** in
code, 5 differ by a handful of import or type-export lines, and these 2 are
stale.

That is the good news in this ticket: the port is not broadly rotten. One
feature was missed, in the two files it touched.

Recompute (run from the repo root; parses the PROVENANCE table, so it stays
correct as rows are added):

```bash
python - <<'EOF'
import re, os, difflib
P = 'vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md'
E = os.path.dirname(P)
rows = []
for line in open(P, encoding='utf-8'):
    m = re.match(r'^\|\s*`([^`]+)`\s*\|\s*`?([^`|]+?)`?\s*\|\s*(.*?)\s*\|\s*`?([0-9a-f]{64})`?\s*\|', line)
    if m:
        rows.append((m.group(1), m.group(2).strip(), m.group(3).strip()))
def strip(p):
    out = []
    for l in open(p, encoding='utf-8', errors='replace'):
        s = l.strip()
        if not s or s.startswith(('//', '/*', '*')):
            continue
        out.append(re.sub(r'\s*//.*$', '', l.rstrip()))
    return out
for fork_rel, core_rel, label in rows:
    f, c = os.path.join(E, fork_rel), os.path.join('packages/core/src', core_rel)
    if not (os.path.isfile(f) and os.path.isfile(c)):
        print('NO CORE SOURCE:', fork_rel); continue
    d = [x for x in difflib.unified_diff(strip(c), strip(f), lineterm='', n=0)
         if x[:1] in '+-' and not x.startswith(('---', '+++'))]
    if len(d) > 10:
        print(f'{fork_rel:<36}{len(d):>5}  {label[:44]}')
EOF
```

The earlier version of this table was wrong on three counts: it claimed 28 of
33 rows had core sources (all do), said 17 where the census gives 19, and
omitted `seams/store.ts` and `fixtures/report-events-offline.ts` from a table
presented as complete. Corrected 2026-08-17 after review.

## Impact

Untested hypothesis, stated as such: the browser's Upgrades tab shows dead
slots without the `worn-unrankable` cause, so a slot whose worn item cannot be
ranked renders as a normal dead slot (or a false loss — the behaviour
`2e6b257` was written to stop) rather than being marked, and the warning
explaining why those rows are unreadable never appears. Confirming this needs
a served-build run; nobody has done one against this specific behaviour.

## Suggested fix

Port `2e6b257`'s change into the fork's `dead-slots.ts`, re-run E-W3, update
the PROVENANCE hash in §9.1a order, and record the new core commit the table
traces to. Note the table's header commit (`12ce5841`) is now stale for every
file, not just this one — decide whether to re-baseline the whole table or
record per-file source commits.

Worth considering alongside: a check that compares each ported file against
its `packages/core/src/` source (comment-stripped) would have caught this at
the commit that introduced it. That is the gap ticket 165 and this ticket both
point at from different directions.

## Acceptance criteria

- [ ] The fork's `dead-slots.ts` carries the `worn-unrankable` cause, type,
      option, emit loop and suppression guard.
- [ ] The fork's `plausibility.ts` carries the cause entry, the warning
      branch and the `wornUnrankable` pass-through.
- [ ] A comment-stripped diff of both files against their
      `packages/core/src/` sources shows no code divergence.
- [ ] E-W3 re-run green *before* the PROVENANCE hashes are updated (§9.1a).
- [x] Every other ported file audited the same way — done 2026-08-16, table
      above; recomputed and corrected 2026-08-17 after review found the
      counts wrong. Only these two files diverge without an "adapted" label.
