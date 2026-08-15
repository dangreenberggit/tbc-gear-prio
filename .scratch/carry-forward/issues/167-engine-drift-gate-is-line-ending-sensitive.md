Status: open
Type: gate fragility
Origin: orchestrator fan-in, ticket sweep 154–164, 2026-08-14
Blocks: none
Blocked by: none

# The engine drift gate fails on a line-ending change alone

`scripts/check_engine_port_drift.py` sha256s the 30 ported engine files as raw
bytes and compares them to `PROVENANCE.md`. The recorded hashes were computed
on LF content. The fork clone sits on Windows with git's autocrlf behaviour, so
**checking a ported file out converts it to CRLF and changes its hash**, and
the gate then reports drift on a file whose content nobody touched.

## Reproduce

In `vendor/tbc-new-fork`:

```bash
git checkout -- ui/core/components/individual_sim_ui/upgrades/engine/set-value.ts
cd ../.. && pnpm engine-port-drift:check
```

Observed 2026-08-14: `drifted: set-value.ts`, with
`PROVENANCE.md hash: 317f0705…` against
`actual file hash: 4c1735bd…`, while `git diff --numstat` on that same file
reported **no rows** — content identical, bytes different.

Converting the file back to LF restores the recorded hash exactly:

```bash
python -c "p='ui/core/components/individual_sim_ui/upgrades/engine/set-value.ts'; b=open(p,'rb').read().replace(b'\r\n',b'\n'); open(p,'wb').write(b)"
```

→ hash returns to `317f0705…`, gate green. That the hash comes back
byte-exact is the evidence the content was never in question.

## Why it matters

The failure is indistinguishable, at the gate's output, from a genuine silent
port drift — which is the one thing this gate exists to make distinguishable.
A reader who hits it has two bad options: re-hash (which launders a real drift
if the content *did* change) or hand-normalize line endings (obscure, and
undocumented anywhere). During this sweep it fired twice from ordinary
mutation-test cleanup and cost real time to diagnose both times.

It also interacts badly with the re-hash workflow: the checker instructs you to
re-run E-W3 and update the hash, which for a line-ending-only diff records a
CRLF hash that then breaks for the next person on a LF checkout.

## Done when

The gate is insensitive to line endings, or the repo makes them deterministic.
Options, in rough order of preference:

- Normalize before hashing in `check_engine_port_drift.py` (read the file,
  replace CRLF with LF, then sha256) — and say in `PROVENANCE.md` that hashes
  are over LF-normalized bytes, so the number stays reproducible by hand.
- Add a `.gitattributes` entry in the fork pinning the ported engine files to
  LF, so checkout cannot convert them.

Whichever is chosen, `PROVENANCE.md` should state the convention, since its
whole value is that a reader can recompute a hash independently.
