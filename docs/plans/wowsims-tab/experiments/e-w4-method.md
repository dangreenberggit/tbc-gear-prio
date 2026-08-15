# E-W4 method — does gear-only import disturb settings?

Runs plan §8's E-W4 and decides §9 slice 5 ship-vs-shelve (D6). Every
upstream file:line below was read at the fork worktree tip (branched from
pin `8aa378b3`, v0.0.101); paths are relative to `vendor/tbc-new-fork/`.

**Verdict rule.** Capture the page's full `IndividualSimSettings` proto
before and after applying fixture gear through `player.setGear`. **PASS**
iff the structural diff is empty everywhere except `player.equipment`.
Any other difference is **FAIL**: record the diff (step 8) and stop —
whether a difference is benign is the user's shelve call under D6, never
the runner's.

Needs: the fork worktree, a browser, Node. No WCL credentials — the gate
tests gear _application_, which no fetch can disturb. No sims run, so
browser WASM slowness (ticket 156) does not affect this experiment.

## Steps

### 1. Serve the ret page

From a bash shell in the fork worktree (both env lines are mandatory —
see the fnm trap, `.scratch/handoffs/wowsims-tab/ORCHESTRATOR-HANDOFF.md` §3):

```bash
eval "$(fnm env --shell bash)"
export PATH="/c/Program Files/Go/bin:/c/Users/dgree/go/bin:$PATH"
mkdir -p dist/tbc   # fresh worktree: makes the next cp land at dist/tbc/assets
cp -r assets dist/tbc/
sed -e 's/@@CLASS@@/paladin/g' -e 's/@@SPEC@@/retribution/g' \
    ui/index_template.html > ui/paladin/retribution/index.html
npx tsx vite.build-workers.mts
npx vite serve --port 5173
```

Open `http://localhost:5173/tbc/paladin/retribution/`. _Done when_ the
ret sim page renders with its Gear tab populated.

### 2. Add the console hook

The page exposes no global handle to `simUI` (searched `ui/` at the pin;
none found). In the worktree, at the end of the `IndividualSimUI`
constructor in `ui/core/individual_sim_ui.tsx`, add:

```ts
(window as any).__ew4 = { simUI: this, TypedEvent, EquipmentSpec };
```

`TypedEvent` is already imported (line 68); add `EquipmentSpec` to the
existing `./proto/common` import. This line is harness-only — step 9
removes it; it never lands in a commit. Reload the page, run
`localStorage.clear()` in the DevTools console, and reload once more —
now exactly one `__currentSettings__` key exists (step 4 depends on
that), and `window.__ew4` is defined.

### 3. Configure the page non-default

A clobber to a field that already holds its default is invisible, so
give every category a visibly non-default value before capturing:

- **Gear**: equip the **PreRaid** preset (the fixture in step 5 is the
  P1 set, which differs from it — the sanity check depends on this).
- **Bonus stats / item swap**: these two are the fields most at risk
  (they share the Gear category — see reference below). Set a nonzero
  bonus stat and enable item swap with one item, **where the ret page
  exposes controls for them**; record in the result file which of the
  two you could actually set.
- **Talents**: move one talent point off the preset build.
- **Rotation**: change one rotation option or APL preset.
- **Consumes**: change one consumable.
- **Miscellaneous**: set "Distance from target" to a non-default value.
- **Buffs/debuffs**: toggle one raid buff and one debuff.
- **Encounter**: set duration to 150s.
- **UI settings**: set iterations to 5000.

_Done when_ each bullet is applied (or recorded as not-exposed).

### 4. Capture "before"

In the DevTools console (`copy()` is a DevTools utility):

```js
const KEY = Object.keys(localStorage).find((k) =>
  k.endsWith("__currentSettings__")
);
copy(localStorage.getItem(KEY));
```

Paste into `docs/plans/wowsims-tab/experiments/e-w4-before.json` (this
repo). Touch nothing on the page between this capture and step 5.

### 5. Apply the fixture gear

In the console — for `FIXTURE`, paste the full content of
`ui/paladin/retribution/gear_sets/p1.gear.json` (an upstream preset, so
every item resolves in the ret database):

```js
const { simUI, TypedEvent, EquipmentSpec } = window.__ew4;
const FIXTURE = `<content of p1.gear.json>`;
const spec = EquipmentSpec.fromJsonString(FIXTURE, {
  ignoreUnknownFields: true,
});
simUI.player.setGear(
  TypedEvent.nextEventID(),
  simUI.sim.db.lookupEquipmentSpec(spec)
);
```

_Done when_ the Gear tab visibly shows the P1 items.

### 6. Capture "after"

Once step 5's done-when holds, repeat step 4's snippet; paste into
`e-w4-after.json` in the same directory.

### 7. Diff

Save the script from the reference section below as `e-w4-diff.mjs`
beside the captures and run:

```bash
node e-w4-diff.mjs e-w4-before.json e-w4-after.json
```

Exit codes: **0** PASS · **1** FAIL (differences printed with paths) ·
**2** sanity failure — `player.equipment` did not change between the
captures, meaning the harness broke (autosave never fired, or the
fixture matched the equipped gear); fix the harness and re-run. A
verdict recorded off a sanity failure is worthless.

### 8. Record the result

Create `docs/plans/wowsims-tab/experiments/e-w4-result.md` in **this
repo** (the fork stays free of experiment artifacts) from the template
in the reference section, and commit it together with
`e-w4-before.json` and `e-w4-after.json` in the same directory. On
FAIL, include the script's full output. Then stop: plan §9.5's
done-when reads this artifact, and the shelve decision is the user's.

### 9. Remove the hook

Delete step 2's line from the worktree. _Done when_ `git -C
vendor/tbc-new-fork status` shows no harness edit left behind.

## Reference

### Why `player.equipment` is the only gear field

Derivation, re-runnable by reading three things:

1. **The ask** (plan §6, first paragraph): "only the 17 equipment slots
   change". Everything else on the page is a setting the user set.
2. **The schema**: `Player` in `proto/api.proto:21-95` (same message in
   this repo's pinned `data/proto/api.proto`) — equipment is field 3;
   every other field is talents, rotation, consumes, misc, buffs, or
   the spec oneof.
3. **The UI's own category map**: the Gear _category_ covers four
   fields — `equipment`, `bonusStats`, `enableItemSwap`, `itemSwap`
   (`ui/core/player.tsx:1447-1454` toProto; `:1501-1510` fromProto).
   The latter three are page settings the user configured, not gear a
   WCL log carries, so under the ask they sit with the settings: the
   gate requires them unchanged.

Hence the allowlist is exactly the protojson path `player.equipment`,
and every other field of `IndividualSimSettings` (`proto/ui.proto:320-338`)
must be byte-identical between the captures.

### The application call under test

E-W4 exercises `player.setGear(eventID, gear)` (`ui/core/player.tsx:707`)
— the single-purpose call plan §6 names. The category-filtered
alternative, `player.fromProto(eventID, proto, [SimSettingCategories.Gear])`,
also rewrites `bonusStats`, `enableItemSwap`, and `itemSwap` from the
incoming proto (`ui/core/player.tsx:1501-1510`); for a WCL-built proto
carrying only equipment, that would reset all three to defaults —
hypothesis from code reading, and exactly the clobber this gate exists
to catch. Slice 5 must therefore apply gear via `setGear`. The verdict
binds only the call it exercised: if slice 5 ships a different
application call, re-run E-W4 through that call before trusting the
gate.

Related, resolved 2026-08-14: `bulk_gear_json_importer.tsx` (the
follow-up plan §6 flagged) feeds the Batch tab's item list via
`bulkUI.addItems` and never touches the player — not a gear-only
application path. Its `Database.loadLeftoversIfNecessary` +
`lookupItemSpec` validation idiom is worth copying when slice 5 builds
gear from WCL items that may sit outside the loaded database.

### Capture: the page's own autosave

The page persists `IndividualSimSettings.toJsonString(this.toProto())` —
all categories, export mode, so no embedded item database — to
`localStorage[<specPrefix>__currentSettings__]` on every change event
(`ui/core/individual_sim_ui.tsx:406-412`; key suffix from
`ui/core/sim_ui.tsx:317-318`). Both captures therefore come from the
same serializer in the same page session: field order, default-value
elision, and repeated-field order are identical on both sides by
construction, so the structural diff cannot report serialization noise.
The emitter chain from `setGear` up to the autosave listener was read
hop-by-hop but not traced end-to-end (**untested**); the script's exit-2
sanity check catches the case where it never fired.

### Why PASS is literally empty

Same serializer, same session, and the only action between the captures
is the one call — there is no known benign source of difference. A
"tolerable differences" category would put the runner in the judgment
seat D6 reserves for the user; benignity gets argued in the shelve
discussion with the recorded diff on the table, not inside the gate.

### Diff script

```js
// e-w4-diff.mjs — usage: node e-w4-diff.mjs before.json after.json
import { readFileSync } from "node:fs";

const [before, after] = process.argv
  .slice(2)
  .map((p) => JSON.parse(readFileSync(p, "utf8")));

const diffs = [];
function walk(x, y, path) {
  if (path === "player.equipment") return; // the one allowed field
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  const bothObjects =
    typeof x === "object" &&
    x !== null &&
    typeof y === "object" &&
    y !== null &&
    Array.isArray(x) === Array.isArray(y);
  if (!bothObjects) {
    diffs.push({ path, before: x, after: y });
    return;
  }
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    walk(x[k], y[k], path ? `${path}.${k}` : k);
  }
}
walk(before, after, "");

if (
  JSON.stringify(before.player?.equipment) ===
  JSON.stringify(after.player?.equipment)
) {
  console.error(
    "SANITY FAIL: player.equipment identical in both captures — the harness did not capture the import. No verdict."
  );
  process.exit(2);
}
if (diffs.length === 0) {
  console.log("PASS: empty diff outside player.equipment");
} else {
  console.log(`FAIL: ${diffs.length} difference(s) outside player.equipment`);
  for (const d of diffs) {
    console.log(
      `- ${d.path}\n    before: ${JSON.stringify(d.before)}\n    after:  ${JSON.stringify(d.after)}`
    );
  }
  process.exit(1);
}
```

The structural walk makes key order irrelevant; arrays compare by
index, so a repeated-field reorder reports as a real difference — which
it is, since both sides come from one serializer.

### Result template

```markdown
# E-W4 result — <date>

Fork worktree tip: <git -C <worktree> rev-parse HEAD>
Page: /tbc/paladin/retribution/ (vite serve, recipe in e-w4-method.md §1)
Fixture: ui/paladin/retribution/gear_sets/p1.gear.json
Non-default settings applied (step 3), including whether bonus stats
and item swap were exposed on the ret page: <list>

Verdict: PASS | FAIL

Script output:
<full output of e-w4-diff.mjs>
```
