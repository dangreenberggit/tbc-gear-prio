Status: open
Type: bug
Origin: docs/reviews/feat-ret-p3-data.md (adversarial + domain axes, independently)
Blocks: none
Blocked by: none

# Universe artifacts record no EP-weights provenance, so a reweight is invisible

`scripts/assemble_universe.py:1303` resolves which EP-weights file scores a
universe via `ep_weights_path_for(profile, max_phase)`, which picks the highest
key in `ep_weights_by_phase` that is `<= max_phase`. After
`feat/ret-p3-data`, ret p4 and p5 therefore resolve to
`data/presets/ret/p3.ep-weights.json` — they are not p3 artifacts, and nothing
in the shipped output says which weights produced their numbers.

The universe file's top-level keys are `spec, maxPhase, carryoverPolicy,
generatedBy, d7Note`, and `generatedBy` is the bare string
`"scripts/assemble_universe.py"`. The report file records no weights either.

`curationHint` is not decorative: it is the EP score, the slot sort key, and
the input to the junk filter's percentile floor.

## Reproduce

From `feat/ret-p3-data` @ `859eab5` (worktree
`C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`):

```bash
python -c "
import json,subprocess
old=json.loads(subprocess.run(['git','show','5be6a81:data/universes/ret-p5.json'],capture_output=True,text=True).stdout)
new=json.load(open('data/universes/ret-p5.json'))
o={e['itemId']:e.get('curationHint') for e in old['entries']}
n={e['itemId']:e.get('curationHint') for e in new['entries']}
print('changed:',sum(1 for k in o if o[k]!=n[k]),'of',len(o))
print('membership added:',len(set(n)-set(o)),'removed:',len(set(o)-set(n)))
"
```

Observed on this branch: **423 of 534 p5 `curationHint` values changed, with
zero membership change** — a pure reweight. Meanwhile
`git diff 5be6a81...859eab5 --stat -- data/universes/` shows
`ret-p3/p4/p5.report.json` are **not in the diff at all**, so a reader
diffing the reports sees nothing happened.

Both the adversarial and the domain reviewer reached this independently.
Domain's judgment is that p3 weights are the *better* approximation for p4/p5
than p2's, so the substitution is not wrong — the missing provenance is.

## Done when

The resolved EP-weights path and its `pin` field are stamped into the
universe artifact (and/or the report), so a reader can tell which weights
produced a `curationHint` without re-deriving it from the generator. A
regen after the change is byte-compared as usual.
