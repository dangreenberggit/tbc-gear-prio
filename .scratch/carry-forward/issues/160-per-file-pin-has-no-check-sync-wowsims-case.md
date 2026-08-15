Status: resolved
Type: task
Origin: docs/reviews/feat-ret-p3-data.md (standards axis)
Blocks: none
Blocked by: none

# `PER_FILE_PIN` has no `check_sync_wowsims.py` case

`feat/ret-p3-data` added `PER_FILE_PIN` to `scripts/sync_wowsims.py:122-141`
plus a new per-entry `"commit"` field written in `do_update` (`:280-300`) and
read back in `do_restore` (`:376-379`). It exists so `ret_p3.gear.json` can be
fetched from `5c7491899` while decision D2 keeps the main pin at `8aa378b3`.

The mechanism's own comment states the hazard it must prevent: a plain
`--update --tag <pin>` must not "silently drag it backward to whatever the
main pin fetches."

Nothing gates that. `scripts/check_sync_wowsims.py` runs under `pnpm verify`
(`package.json`, `sync-wowsims:unit:check`) and has **no case** for the
override write/read path:

```bash
grep -n "PER_FILE_PIN" scripts/check_sync_wowsims.py   # no match
```

The adversarial reviewer separately confirmed the round-trip is *currently*
correct and stays hash-guarded by `verify_blob`, so this is missing
regression cover, not a live bug. The slice's own handoff
(`.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:382-384`) records as
**untested** whether a second `PER_FILE_PIN` entry round-trips cleanly.

## Done when

`check_sync_wowsims.py` covers: an `--update` at the main pin leaves an
overridden file's `commit` and bytes unchanged; `do_restore` fetches the
override rather than the main pin; and a second override entry round-trips.
Promoting a file out of `PER_FILE_PIN` once upstream's pin catches up should
be a no-op diff, per that dict's comment.

## Comments

2026-08-14: Resolved at `71a35a7` on `w/b3-sync-docs`. Added four checks to
`scripts/check_sync_wowsims.py` covering all four cases in Done when. All
pass against the current mechanism (offline, fake `fetch()`, no network),
confirming the adversarial reviewer's read that this was missing cover, not
a live bug — including the previously-untested second-override round-trip.
Re-run with:

```bash
python scripts/check_sync_wowsims.py
# sync_wowsims.py guard rails ok (10 checks)
```
