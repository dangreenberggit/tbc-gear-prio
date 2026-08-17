Status: open
Type: defect (error handling; wrong failure mode on malformed input)
Origin: adversarial review of ticket 213's fix, 2026-08-17
Blocks: none
Blocked by: none

# `lockfile_pin()` raises `AttributeError` instead of returning `None`

`scripts/generate_sim_implemented_effects.py` defines:

```python
def lockfile_pin() -> str | None:
    """The fork commit this repo is pinned to, or None if unreadable."""
    try:
        return json.loads(LOCK_PATH.read_text(encoding="utf-8")).get("commit")
    except (OSError, json.JSONDecodeError):
        return None
```

The `except` clause covers a missing file and malformed JSON. It does not
cover **valid JSON that is not an object**, where `.get` does not exist. The
docstring's "or None if unreadable" is therefore false, and both callers'
`pin is None` guards are bypassed by an exception instead.

## Observed

Probed by importing the module and pointing `LOCK_PATH` at each payload:

| `data/wowsims-fork.lock.json` contents | result |
|---|---|
| `null` | **raises** `AttributeError: 'NoneType' object has no attribute 'get'` |
| `[]` | **raises** `AttributeError: 'list' object ...` |
| `"abc"` | **raises** `AttributeError: 'str' object ...` |
| `123` | **raises** `AttributeError: 'int' object ...` |
| `not json at all` | returns `None` (correct) |
| `{"commit": "x"}` | returns `"x"` (correct) |

Reproduce:

```bash
python - <<'EOF'
import importlib.util, os, pathlib
spec = importlib.util.spec_from_file_location("gen", "scripts/generate_sim_implemented_effects.py")
m = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(m)
except SystemExit:
    pass
p = pathlib.Path(os.environ.get('TEMP', '.')) / 'probe_lock.json'
for payload in ['null', '[]', '"abc"', '123']:
    p.write_text(payload, encoding='utf-8')
    m.LOCK_PATH = p
    try:
        print(f'{payload!r:8} -> {m.lockfile_pin()!r}')
    except Exception as e:
        print(f'{payload!r:8} -> RAISES {type(e).__name__}')
EOF
```

## Impact

Low but real. A botched merge or a truncated write that leaves the lockfile as
`null` or a list turns `pnpm verify` into a Python traceback rather than the
intended message.

**Only one of the two callers has a real `pin is None` path.**
`check_sim_implemented_effects.py:89-96` does exit 2 with "could not read the
pin from data/wowsims-fork.lock.json". The generator has **no such branch**:
its condition is `if commit is None or commit != pin`
(`generate_sim_implemented_effects.py:169`), so an unreadable lockfile falls
into the generic mismatch message and prints

> clone HEAD is `<sha>` but data/wowsims-fork.lock.json pins **unknown**.
> ... update the lockfile (or reset the clone to the pin), then re-run.

That misreports an unreadable lockfile as a pin mismatch, and advises
resetting the clone to a pin it could not read. So fixing `lockfile_pin()`
restores the intended path on the check side, and leaves a second, separate
defect on the generator side.

(An earlier version of this ticket claimed both callers already handled
`pin is None` correctly. That was asserted without reading the generator's
branch and is wrong.)

`json.JSONDecodeError` is a subclass of `ValueError`, so widening the except
to `ValueError` does not fix this; the failure is an `AttributeError` at
attribute access, after decoding succeeded.

## Suggested fix

Check the decoded type rather than widening the except:

```python
data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
return data.get("commit") if isinstance(data, dict) else None
```

Catching `AttributeError` would also work but hides the same bug in any
future field read.

## Acceptance criteria

- [ ] All four payloads above return `None` rather than raising.
- [ ] `{"commit": "x"}` still returns `"x"`, and a missing or malformed file
      still returns `None`.
- [ ] `pnpm verify` on a lockfile containing `null` prints the intended
      could-not-read-the-pin message and exits non-zero, with no traceback.
- [ ] The generator distinguishes an unreadable pin from a HEAD/pin mismatch,
      rather than printing "pins unknown" and advising a reset to a pin it
      could not read.
