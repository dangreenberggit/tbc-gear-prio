Status: closed
Type: task
Origin: docs/reviews/fix-carry-forward-backlog.md (adversarial A1)
Blocks: none
Blocked by: none

# `matchesRequestedSpec` is exported but never called in production

Ticket 40 shipped the `spec.ts` half: `matchesRequestedSpec` exists, is
exported from `index.ts:108`, and is unit-tested. Nothing in `src/` calls it.

```bash
grep -rn 'matchesRequestedSpec' packages/core/src/
# -> only spec.ts:126 (the definition) and index.ts:108 (the barrel)
```

The defect the function's own doc comment names is therefore still live: a
ret request against a protection night still resolves, sims against ret's
preset and EP weights, and returns a confidently wrong ranking with no error.
Ticket 04's first capture (slamaltman's protection night scored as ret) is
the real instance, not a hypothetical.

This is **not** a claim that ticket 40 was closed dishonestly — 40 is
correctly still `Status: open` and its `Progress:` line and "What did not
ship" section name all four unmet criteria. This ticket exists so the
*wiring* half is visible on its own, because ticket 61's fix is what makes
the shipped function load-bearing.

## Relationship to ticket 40

40 is the parent and stays open. Close this one only as part of 40's
"Done when", or fold it in when 40 is picked up. Filed separately because a
reviewer reading `spec.ts` sees a tested, exported guard and can reasonably
assume it guards something.

## Done when

- `rankUpgrades` / `resolveFight` call `matchesRequestedSpec` on the resolved
  fight, or ticket 40 closes and this is folded into it.
- The `{matches:false, detected:<other spec>}` branch is exercised by a test
  (see review finding A4 — it currently is not, by any test).

## Closed 2026-08-07

Wired into `rankUpgrades` immediately after `readGear` (`rank.ts`), plus the
seam change the "Blocked by" line called for.

**The blocker was shallower than recorded.** `LoggedGear` did lack a class
name, but WCL's `actors[].subType` carries it and every committed capture
already has it — no re-capture, no new probe:

```bash
python -c "
import json,glob
for f in sorted(glob.glob('test/fixtures/*.raw.json')):
    d=json.load(open(f,encoding='utf-8'))
    print(f, sorted({a.get('subType') for a in d['actors'] if a.get('subType')})[:4])"
```

So `LoggedGear.className?: string` was added and populated in the shared
offline builder. Optional on purpose: a source that cannot supply it degrades
to "cannot classify" rather than throwing.

**The refusal rule needed correcting mid-implementation.** The obvious guard —
refuse when `matchesRequestedSpec` returns a named `detected` — never fires
for the case that motivated this ticket. Measured:

```
Paladin prot  [0,44,17] -> {"ok":false,"reason":"unsupported-spec","treeIndex":1}
Paladin ret   [5,11,45] -> {"ok":true,"spec":"ret","treeIndex":2}
Druid feral   [0,45,16] -> {"ok":false,"reason":"needs-form-uptime",...}
Warrior       [40,20,0] -> {"ok":false,"reason":"unsupported-class"}
```

Protection classifies as `unsupported-spec` with `detected: undefined`, which
is correct per `matchesRequestedSpec`'s docstring (protection has no spec home
today, so it is not a *wrongly detected* spec). The guard therefore refuses on
either a named `detected` **or** `unsupported-spec` — where the class is known
and the favoured tree is known and simply is not this spec's.

Everything else ranks as before, because absence of evidence is not evidence
against: no `className`, `unsupported-class`, `ambiguous`, and feral's
`needs-form-uptime` all pass through. A test pins the feral case specifically,
since over-strictness here would reject every druid.

New `RankErrorKind: "spec-mismatch"`. Audited every catch site — `cli.ts:490`
prints `${err.kind}: ${err.message}` generically rather than switching on the
union, so the new kind surfaces without an unhandled-discriminant hole.

`pnpm verify` green: 32 files, 434 passed / 2 todo (up from 425).

## What this does not do

The message tells the user to pick another fight or rank the spec they played;
it cannot yet *offer* to sim that other spec, because only ret and feral ship
presets. That remains ticket 40's territory — 40 stays open for the
`resolveFight` / fixtures half of its own "Done when".
