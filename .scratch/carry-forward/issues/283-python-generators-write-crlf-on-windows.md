Status: open
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
