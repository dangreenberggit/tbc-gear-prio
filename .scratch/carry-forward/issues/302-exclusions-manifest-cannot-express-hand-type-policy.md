# weapon-type-exclusions.json cannot express a hand-type policy

Status: open
Origin: pre-merge review feat/upgrades-dedup-wowsims (adversarial A3)
Blocks: none

`data/weapon-type-exclusions.json` maps a spec to a list of excluded
`weaponType` codes. That vocabulary cannot express ret's `policy_two_hand_only`
rule, because the rule cuts across hand type rather than weapon type: ret keeps
two-handed axes, maces and swords while excluding the one-handed ones, so those
three codes appear in neither the included nor the excluded list.

Measured on the current tip:

```
python -c "
import json,sys
sys.path.insert(0,'scripts')
import assemble_universe as a
db=json.load(open('vendor/wowsims/db.json',encoding='utf-8'))
by={int(i['id']):i for i in db['items']}
p=a.SPEC_PROFILES['ret']
blocked=[i for i in p.equip_eligible_ids
         if i in by and by[i].get('weaponType')
         and by[i].get('handType')!=4
         and int(by[i]['weaponType']) not in p.policy_excluded_weapon_types
         and (by[i].get('quality') or 0)>=3]
print(len(blocked))"
```

→ **285** items are excluded by a policy the manifest does not describe
(120 maces, 116 swords, 49 axes).

## This is a description gap, not a behaviour gap

The policy itself is applied correctly and is gated. `ret-p5` ships 23 weapons
and all 23 are two-handed; `scripts/check_policy_notes.py` fails the build if
the justification stops being published; and the prose reason travels in every
ret payload's `d7Note`. What is missing is only the *machine-readable* form, so
`packages/core/test/weapon-type-exclusion.test.ts` cannot assert on the 285.

## Why it was not fixed in the review round

Adding a hand-type axis is not a one-field change. The manifest is currently
`Record<string, number[]>` and the consuming test reads **every key as a spec**
and requires **every value to be an `int[]`**
(`weapon-type-exclusion.test.ts:114-131`) — the same constraint that ruled out a
sibling `_policyNotes` key during the original work. So a clean representation
needs the file's schema changed *and* that test restructured, which is a wider
blast radius than the finding warrants while nothing is actually mis-filtered.

## Done when

- The manifest can express "excluded unless two-handed" without a key that the
  existing spec-iteration reads as a spec.
- `weapon-type-exclusion.test.ts` asserts the 285 the same way it asserts the
  weapon-type exclusions today.
- ret's universes stay byte-identical (this is a description change only).

Consider doing it alongside ticket 300, which already re-shapes the profile
table and must carry the two policy fields through.
