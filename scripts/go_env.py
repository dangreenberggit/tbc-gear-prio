"""The environment for a `go build` or `make` of the fork's Go code.

Go 1.25 stamps VCS data into a binary from the first `.git` *directory* above
the module. In a pair the fork's `.git` is a file, so Go skips it and can stop
at an unrelated `.git` directory higher up, such as `/home/daniel/.git`, and
the build fails with "error obtaining VCS status" (ticket 856). No build here
uses the stamp, so it is turned off.
"""

from __future__ import annotations

import os
import subprocess
from collections.abc import Mapping


def goflags_without_vcs_stamp(goflags: str) -> str:
    """`goflags` with -buildvcs=false added, unless it already sets -buildvcs."""
    flags = goflags.split()
    if any(f.lstrip("-").split("=")[0] == "buildvcs" for f in flags):
        return goflags
    return " ".join([*flags, "-buildvcs=false"])


def go_build_env(base: Mapping[str, str] | None = None) -> dict[str, str]:
    env = dict(os.environ if base is None else base)
    # An exported GOFLAGS hides the `go env -w` value, so start from what Go
    # itself would use.
    current = subprocess.run(
        ["go", "env", "GOFLAGS"], env=env, capture_output=True, text=True, check=True
    ).stdout.strip()
    env["GOFLAGS"] = goflags_without_vcs_stamp(current)
    return env
