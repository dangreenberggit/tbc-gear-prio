Status: closed — fixed 2026-09-15 by ticket 399 on `feat/desktop-transport-gate` (see "Resolution")
Type: tooling defect
Origin: stage-gate `upgrades-ui-pass`, step-8 regen, 2026-08-23
Blocks: none
Blocked by: none

# Python generator scripts write CRLF on Windows

`scripts/generate_sim_implemented_effects.py:279` writes its artifact with:

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

`Path.write_text` without an explicit `newline=` applies the platform default,
so on Windows every line is written CRLF. Measured 2026-08-23 immediately
after a regen on this branch:

    working tree: CRLF 2032, bare LF 0
    committed blob: CRLF 0, LF 2032

AGENTS.md's data-pipeline section states the rule this violates: "Python
writes need `newline='\n'`."

## What the exposure actually is

**Committed bytes are not at risk.** The last line of `.gitattributes` is
`* text=auto eol=lf`, a catch-all covering every text file in the repo, so git
normalizes CRLF to LF on staging. Verified: the staged blob had 0 CRLF.

The cost is local and low, but it is real and it recurs:

- `git status` prints "CRLF will be replaced by LF the next time Git touches
  it" after every regen, which is noise that trains readers to ignore warnings;
- the working tree does not byte-match `HEAD` after a regen, so a byte-compare
  done in the working tree rather than against the index gives a false
  mismatch — and byte-compare is exactly how this repo gates generated
  artifacts;
- it makes the scripts depend on a `.gitattributes` catch-all for correctness
  rather than writing the bytes they mean to write.

The dependency is the part worth fixing. The catch-all is doing work the
scripts should be doing themselves, and nothing in either file records that
arrangement.

## Scope: this is repo-wide, not one line

The pattern was measured across `scripts/`, not assumed. Eighteen
`write_text(...)` call sites omit `newline=`:

    assemble_universe.py:359, :2035, :2041
    build_feral_skeleton.py:227
    capture_fixture.py:138
    check_build_feral_skeleton.py:95
    check_sim_implemented_effects_classifier.py:100
    compose_feral_raid_sim.py:169, :215
    compose_slamaltman_raid_sim.py:160, :206
    crn_pairing_probe.py:69
    fetch_protos.py:102
    five_seed_spread.py:84, :279
    generate_json_literal_types.py:184
    generate_sim_implemented_effects.py:279
    seed_overlap_probe.py:68

Plus one text-mode `open` without `newline=`: `sync_atlasloot.py:122`
(the other `open` hits in that grep are `"wb"` binary writes and are fine).

Not all of these write committed artifacts — several write scratch inputs for
sim probes — so the fix should be applied where the output is committed or
byte-compared first, and the rest can follow for consistency.

## Fix

Pass `newline="\n"` explicitly at each write site. The repo runs Python 3.12
(verified), and `Path.write_text` has accepted `newline=` since 3.10, so no
rewrite to `open()` is needed:

    OUT_PATH.write_text(..., encoding="utf-8", newline="\n")

## Done when

- Every generator that writes a committed or byte-compared artifact passes
  `newline="\n"`.
- After a fresh regen on Windows, the working-tree file has 0 CRLF and
  `git status` shows no line-ending warning and no modification.
- `pnpm verify` still passes (it runs `scripts/check_sim_implemented_effects.py`
  among other byte-compare gates).
- Consider whether `.gitattributes`'s `* text=auto eol=lf` should carry a
  comment saying it is a backstop, not the mechanism — the two proto-tree
  rules above it already carry that kind of note.

## Resolution, 2026-09-15 — fixed under ticket 399

The write-site sweep landed as ticket 399's option 2. Thirteen `write_text(`
sites across eleven scripts gained `newline="\n"`; the pre-merge review then
found a fourteenth, `sync_atlasloot.py:122`, which is an `open()` call that
sweep's `write_text(` grep could not match (finding A1 in
`docs/reviews/feat-desktop-transport-gate.md`).

Measured on a clean tree after a fresh regen:

    data/sim-implemented-effects.json: CR 0, LF 2036   (was 2032 CRLF / 0 LF)
    data/universes: 88 files, 0 containing CR          (was 47 CRLF / 41 LF)

`python scripts/assemble_universe.py --max-phase 2 --spec ret` then leaves
`git status` clean, which is this ticket's second "Done when". Full
`pnpm verify` is rc 0.

Nine bare write sites remain in `scripts/`, none writing a committed artifact:
four are `"wb"` binary writes where `newline=` does not apply
(`fetch_wowsimcli.py:78`, `sync_atlasloot.py:109`, `sync_wowsims.py:434`,
`:553`); two are `TemporaryDirectory` writes (`check_build_feral_skeleton.py:95`,
`check_sim_implemented_effects_classifier.py:100`); three are sim request files
handed to `wowsimcli` and discarded (`crn_pairing_probe.py:69`,
`seed_overlap_probe.py:68`, `five_seed_spread.py:84`). Established with a
paren-balancing scan rather than a line grep — the fixed calls are multi-line,
so a plain `grep -v newline=` reports false positives.

**The fourth "Done when" is done, and the rule this ticket cited is now
written.** Line 20 above claims `AGENTS.md`'s data-pipeline section states
"Python writes need `newline='\n'`". It does not, and never did — a search of
`AGENTS.md`, `CLAUDE.md`, `docs/**` and `.claude/**` finds it nowhere. The rule
now lives in `docs/agents/known-traps.md` § "Before any scripted or generated
file edit", which `AGENTS.md` already routes to for this action; that entry also
stopped describing the generators as a live hazard, which they no longer are.
`.gitattributes` carries the backstop note this ticket asked for.

**Line numbers above have drifted.** `generate_sim_implemented_effects.py:279`
is now the fix's comment, with the write at :282–284; most of the eighteen
listed numbers moved similarly.

**Sibling case 167 is not closed by this.** `check_engine_port_drift.py` sha256s
raw bytes of the fork's ported `.ts` files, whose CRLF arrives from a git
checkout rather than any Python write, and the `.gitattributes` 399 added to the
fork is scoped to `upgrades/data/`, not `upgrades/engine/`.
