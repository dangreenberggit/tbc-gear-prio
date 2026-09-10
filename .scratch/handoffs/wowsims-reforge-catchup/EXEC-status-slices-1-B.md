# Execution status — slices 1 and B (wowsims-reforge-catchup)

Branch `feat/wowsims-reforge-catchup`, off `dev` at `8b2fffe72d17dffc196eef66db8c4a4c379083be`
(matched the base SHA the orchestrator named; no correction needed).
Model: Opus, per the gate-executor spawn contract.

Scope executed this session: **slice 1 and slice B only**, per the
orchestrator's explicit scoped stop. Slice C (fork merge), D (tier default),
E (docs/tickets) were **not started** — leaving them for a fresh gate on
slice B's regen diff, as instructed.

## Commits

| SHA | Subject | Files |
| --- | --- | --- |
| `caf570d` | Build wowsimcli from source when the pin is a sha | `scripts/fetch_wowsimcli.py` |
| `bec0014` | Pin the engine to backend-reforge ec5c5f2 | lock, `sync_wowsims.py`, palette/enchants/items/pool-listings/buff-defaults/skeleton, `extract_sim_defaults.mjs` |
| `1d462f6` | Refresh data/proto and generated types from the pin | 4 `.proto` sources, 6 generated `*_pb.ts` |

Plus, in the **fork** (`vendor/tbc-new-fork`, gitignored, own git repo,
`pushed: false` unchanged):

| SHA | Branch | Subject |
| --- | --- | --- |
| `b8e7f9e8dee7c3199a7744cd0e5fabe97743de67` | `feat/upgrades-tab` | Refresh bundled universes for the ec5c5f2 engine pin |

This fork commit moved the clone's HEAD away from
`data/wowsims-fork.lock.json`'s pinned `6d0edd69d237e725de8ec5d034c28aa10171bd21`.
That lock is **untouched** (correctly — slice C owns it) and will read stale
until slice C's hand edit. Three verify gates (`equip-eligibility:check`,
`ep-presets:check`, `meta-conditions:check`) currently exit 2 with "clone
HEAD is X but lock pins Y" as a direct, plan-anticipated consequence (see
"What slice C needs to know" below) — not a regression to chase.

## Predicted-vs-actual artifact diff, every regen

### Slice 1 — `fetch_wowsimcli.py` binary build

Predicted: script only, tracked; two gitignored probe `vendor/wowsimcli-*`
dirs, deleted after comparison.

Actual: matched. Two builds at `ec5c5f205e61049d730e460967f8488774a7fe2a`
produced identical sha256 `fb4b9769e397dd1892464060078d165c221415406ad3e89ce70f73d2da3f8a24`
(22,340,608 bytes). Release path regression check (`v0.0.119`) still works.

Two bugs caught and fixed before committing (see slice 1's commit body for
detail): `--commit` didn't force the build path past the tag-shape check;
protoc was invoked with absolute proto paths against a relative `-I`.

### Slice B1 — the pin (`data/wowsims.lock.json`, `sync_wowsims.py`, db-derived artifacts)

| Artifact | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| `wowsims.lock.json` tracked file count | "78" (plan's original number) | **98** | Plan review already corrected this (F2c) before I started; actual matches the corrected number |
| `wowsims.lock.json` changed file entries | 8 of 98 | 8 of 98, exact same 8 names (db.json, constants_other.ts, proto_utils.ts, feral_sim.ts, feral_default.apl.json, ele_p1_a.gear.json, ele_p1_h.gear.json, enh_p5.gear.json) | Yes |
| `ret_p3.gear.json` | loses per-file `commit` override (C5) | confirmed: sha256 unchanged, `commit` key gone | Yes |
| `data/gems/palette.json` | 4 gems (33135/33140/33143/33144) each move 1 stat by -1 | **unchanged**; none of those ids exist in the regenerated palette | **No — plan's prediction was wrong, not a bug** |
| `data/enchants/index.json` | ambiguous ("ids 963 x2") | +1 new key ("963") with 2 new rows | Resolved the ambiguity toward "2 new entries," not "1 changed" |
| `data/items/index.json` | unchanged | **5 items' `phase` field corrected** (32649, 32757: p5→p3; 35317, 35319, 35320: p3→p4) | **No — genuine unpredicted content movement** |
| `data/pool-listings/{ret,feral}-p3.md` | only pin header lines move | confirmed, zero item rows moved | Yes |
| `data/presets/feral/buff-defaults.json` | UNCERTAIN, extractor may need a fix (C15) | **fired as hypothesized**: `defaultExposeWeaknessSettings()` lost its explicit phase arg; fixed the extractor to read `CURRENT_PHASE` statically from `constants_other.ts`; one field moved (`exposeWeaknessHunterAgility` 1080→1210) | C15 confirmed true |
| `data/presets/feral/p2.raid-sim-skeleton.json` | moves only if buff-defaults moved | confirmed, same one field | Yes |
| `data/universes/*` (44 files + 44 reports) | empty diff | **empty by content** (confirmed via `tr -d '\r' \| sha256sum` on both sides), but `git status` flagged all 44+ as modified due to pre-existing CRLF-on-disk state that this regen normalized back to LF | Yes in substance; CRLF churn is cosmetic, documented, not a data finding |
| `data/weapon-type-exclusions.json` | not explicitly predicted (shared side-output) | unchanged once regenerated | n/a |

### Slice B2 — protos

| Artifact | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| `api.proto` | +~225/-few | +220/-5 | Yes |
| `common.proto` | 2 lines | 1+1 | Yes |
| `db.proto` | 6 lines | 5+1 | Yes |
| `ui.proto` | -73 | -73/+0 | Yes |
| other 12 `.proto` | unchanged | confirmed unchanged | Yes |
| `api_pb.ts`, `common_pb.ts`, `db_pb.ts`, `ui_pb.ts` | regenerate | regenerated, matching their proto diffs | Yes |
| `apl_pb.ts`, `spell_pb.ts` | not predicted to move (their `.proto` sources didn't move) | **moved anyway** — pre-existing codegen drift dating to the first proto-pinning commit (`9705084`), surfaced by this session's `buf generate` (which regenerates the whole 16-file set on every run) but not caused by this pin move | **No — real unpredicted finding, but a pre-existing bug, not new drift** |

## Every uncertainty measured, and its answer

| ID | Question | Answer |
| --- | --- | --- |
| C5 | Is `5c7491899` (ret_p3 override) an ancestor of `ec5c5f2`? | **Yes** — `gh api .../compare/... --jq .status` → `ahead`. Removed the `PER_FILE_PIN` override per its own promotion rule. |
| C9 | Does `packages/core` typecheck against the new protos? | **Yes**, `pnpm typecheck` green, confirmed twice (after each proto regen). |
| C15 | Does the extractor fail on `defaultExposeWeaknessSettings()` losing its phase arg? | **Yes**, fired exactly as hypothesized; fixed in `scripts/extract_sim_defaults.mjs`. |
| Universe regen runtime | unmeasured in the plan | **~0.5s per invocation**, 44 invocations ran sequentially in well under a minute — no backgrounding needed. |
| `--check`'s DRIFT line count on the unchanged lock | plan said "exactly two" | **three** — `new release available`, `*** CONTENT TIER CHANGED 2 -> 3 ***`, `watched ref moved`. The third is consistent with PROCESS.md's own Gate 1 finding (tier move was already known); no checksum-mismatch line appeared, so the precondition's real intent (safe to proceed) held even though its exact line count was off by one. |

## Things that surprised me (deviation ledger)

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| B1 precondition | `--check` on unchanged lock shows exactly 2 DRIFT lines | 3 DRIFT lines (adds "CONTENT TIER CHANGED") | **adapt** | Third line is consistent with PROCESS.md's already-known tier move (R1/Gate 1), not a new problem; no checksum-mismatch line appeared, so the safety property the precondition checks for (no local edits) held. Local, not load-bearing to any register claim. |
| B3 (palette) | 4 gems move 1 stat each | Palette byte-identical to HEAD; none of the 4 predicted ids exist in the regenerated set | **adapt** | Verified, not a break — the plan's R2-sourced prediction was simply wrong for this content window. Nothing downstream depends on this being true. |
| B3 (items/index.json) | unchanged | 5 items' `phase` field corrected by upstream (2 dropped p5→p3, 3 rose p3→p4) | **flag** | Real, unpredicted content movement, inside the Paths manifest (this file was already named), but its downstream effect (phase-pool membership) crosses into slice C/D territory that this session doesn't own. Recorded for ticket 353's blast-radius inventory. Verified it changed nothing in `data/universes/*` (same membership either way) and grepped `packages/core/` for the 5 item ids — no hits. |
| B2 (apl_pb.ts, spell_pb.ts) | not expected to move (their .proto sources unchanged) | Moved anyway — pre-existing codegen drift since the first proto-pinning commit, unrelated to either pin move | **adapt** | CI's own gate (`proto:generate` + `git diff --exit-code`) exists precisely to catch this; regenerating and committing is squarely within slice B2's mandate and required for that CI gate to pass regardless of what I did. Confirmed the two files' `.proto` sources are byte-identical to HEAD before and after this session touched anything, so this predates the session. |
| B4 (universes vs fork bundle) | universes empty diff; if moved, `sync_fork_universes --write` | Universes byte-identical in content, but `git status` (and `fork-universes:check`'s raw-byte comparison) both flagged a pre-existing CRLF-on-disk artifact as "moved"/"drifted" | **adapt** | Plan's own contingency covers exactly this outcome ("if they moved, `--write`"); followed it, recorded the CRLF-not-content cause in the fork's own `PROVENANCE.md` before committing there, per known-traps.md's CRLF guidance. |
| B6 (`pnpm test`) | listed as a gate that "would go red if the step above were skipped" | 11 pre-existing tests broke: 8 recorded-adapter sim-key misses (feral only, caused by B3's legitimate `buff-defaults.json` change altering the request hash), 1 `CURRENT_API_VERSION` mismatch against a hand-authored, never-regenerated preset fixture, plus 2 synthetic-fixture replays of the same recall path | **flag** | This is exactly the class of staleness the plan already defers to ticket 353 ("re-baseline committed sim numbers and recorded fixtures... SME look at the feral rotation change") and Axis G of the plan review explicitly endorses deferring rather than fixing in the same commit that causes it. Did not touch any fixture or the stale preset. Full test-name inventory is in the commit body of `bec0014` for slice E to fold into ticket 353. |
| B6 (fork gates) | not explicitly named as expected to break mid-slice-B | `equip-eligibility:check`, `ep-presets:check`, `meta-conditions:check` exit 2 ("clone HEAD is X but lock pins Y") after the B4 fork commit | **adapt** | Plan's own slice C precondition text ("Slice B committed (so B4's possible `sync_fork_universes --write` is already in the fork tree and committed there)") anticipates this exact transitional state. `sim-implemented-effects:check` and `engine-port-drift:check` stayed green because they read the fork by pinned-commit `git show` or by file-diff only, not by clone HEAD. |

## What slice C needs to know

1. **The fork already has a new commit ahead of the pinned lock.** `vendor/tbc-new-fork` `feat/upgrades-tab` HEAD is now `b8e7f9e8dee7c3199a7744cd0e5fabe97743de67` (universe-bundle refresh only, no engine files touched — `engine-port-drift:check` stayed green throughout). `data/wowsims-fork.lock.json` still names the old `6d0edd69d237e725de8ec5d034c28aa10171bd21`. Slice C's merge commit lands **on top of** `b8e7f9e8d`, not `6d0edd69d` — its own precondition check (`git -C vendor/tbc-new-fork rev-parse HEAD`) will show the new sha, which is expected per the plan's own sequencing note, not a drift to chase.
2. **Three fork-pin-dependent verify gates are red right now** (`equip-eligibility:check`, `ep-presets:check`, `meta-conditions:check`) and will go green again once slice C's lock edit points at the merge commit.
3. **`data/items/index.json` moved** (5 items' phase field corrected: 32649, 32757 p5→p3; 35317, 35319, 35320 p3→p4) even though slice B's universe regen showed zero membership change from it. Worth a glance in slice C in case `data/equip-eligibility.json` or the fork's own item-phase assumptions read this file differently than `assemble_universe.py` does.
4. **11 tests are currently red on this tip** (recorded-adapter sim-key misses + one stale `apiVersion` fixture), all attributed and explained in commit `bec0014`'s body, all deferred to ticket 353 per the plan's own Axis G guidance — do not re-record or hand-fix them in slice C; that inventory is slice E's job to formalize into ticket 353.
5. **`pnpm verify` does not currently exit 0** on this tip, for the two reasons above (fork-pin mismatch, deferred test staleness) — both expected and both slice C/E's to close, not evidence of a slice B mistake. Every other gate is green (see slice B2's commit body for the full list re-run individually).

## Session environment notes

- fnm PATH pin was needed for every Node/pnpm-dependent command in both Bash
  and PowerShell (per `docs/agents/known-traps.md`); ran standalone, no `&&`
  chains, per that doc's own guidance.
- `pnpm run <script>` in PowerShell sometimes reports the invoked shell line
  as a `NativeCommandError` even on success (stderr passthrough quirk); always
  confirmed with `$LASTEXITCODE` rather than trusting the tool's error framing.
