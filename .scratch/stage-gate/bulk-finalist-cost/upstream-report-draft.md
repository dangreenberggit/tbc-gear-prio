# Upstream report drafts — Owner's call, not filed

Two items for `wowsims/tbc-new`, drafted at ticket 403's fix (2026-09-16).
**Neither has been filed and filing is the owner's decision.** They are separate
items on purpose: the first is a bug, the second is a feature note with no code
attached.

Everything below was measured on a fork of `wowsims/tbc-new` whose
`sim/core/bulk`, `sim/web`, `proto/api.proto`, `ui/core/wasm` and `ui/core/proto`
are byte-identical to upstream master `17a8fb28c`, so it describes upstream's own
behaviour, not a local modification.

---

## Draft 1 (bug) — the bulk finalist stage logs a target error it never uses, and has no test

**Where:** `sim/core/bulk/stage.go`, `sim/core/bulk/statistics.go`.

**What happens.** The finalist stage logs `Target error: 0.00%` on every start
(`stage.go:24`). The field it formats is never set, so the line always reads
0.00% and tells the reader nothing. Meanwhile the stage's *real* stopping test —
the pairwise 95% separation check in `statistics.go:130-142` — is never logged at
all, so there is no way to see from the log why the stage kept going or stopped.

**Observed consequence.** On a 601-candidate run through the bulk RPC, all 29
chunks ran the finalist stage to its maximum 4.000x iteration multiplier with
every candidate still a survivor. That is the stage doing its most expensive
possible work and separating nothing, and the log gives no signal that this is
what is happening — the only visible line claims a 0.00% target error.

**Also:** there is no `_test.go` in `sim/core/bulk/` covering the finalist stage.
The package's two test files do not mention it.

**Suggested fix.** Log the actual separation test's state (how many adjacent
pairs remain unresolved, and the multiplier so far) and drop or populate the
`Target error` line. A test that runs the stage over a small fixed set and
asserts it terminates for the stated reason would have caught the 29-of-29 case.

---

## Draft 2 (note, no code) — a caller that sets `top_results` to the candidate count gets a finalist stage over every candidate

**This is a note, not a patch.** No change is proposed; upstream may reasonably
consider the current behaviour correct for its own callers.

`top_results` carries two meanings at once in `sim/core/bulk`. It truncates the
response (`bulk_sim.go:197`) **and** it sizes the finalist stage
(`bulk_sim.go:189`). For upstream's own tab, which wants a top 5 out of a large
combinatorial search, those two meanings coincide and the stage does exactly what
it is for: separate the handful of results the user will actually see.

For a caller that wants *every* candidate's number back — a flat list of
individually-swapped items, no combinatorics — `top_results` must equal the
candidate count or most rows silently vanish. That forces the finalist stage to
treat all N candidates as finalists and refine all of them, which is the most
expensive thing the stage can do and buys nothing, because such a caller skips
the culling stages that give screening its purpose.

Measured on our side at 40 candidates: 263 s through the bulk RPC against 19 s
running the same sims one at a time against the same server, with the finalist
stage accounting for 174.5 s of the 263 s. We resolved it by not using the bulk
RPC on that path.

**What would be useful:** a per-request way to decline the finalist stage, so a
caller can say "return all N, do not refine". We prototyped a
`skip_finalist_stage` request field and then dropped it — for our case the
per-candidate loop turned out to be both faster and simpler than a refined bulk
path, so we had no need to carry a proto divergence. Recording the shape of the
problem in case another caller hits it.
