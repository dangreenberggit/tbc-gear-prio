// The environment for a `go build` or `make` of the fork's Go code. Go 1.25
// stamps VCS data from the first `.git` *directory* above the module; in a
// pair the fork's `.git` is a file, so Go can stop at an unrelated `.git`
// directory higher up and fail with "error obtaining VCS status" (ticket 856).
// No build here uses the stamp, so it is turned off. Python twin:
// scripts/go_env.py.

import { execFileSync } from "node:child_process";

export function goflagsWithoutVcsStamp(goflags) {
  const flags = goflags.split(/\s+/).filter(Boolean);
  if (flags.some((f) => f.replace(/^-+/, "").split("=")[0] === "buildvcs"))
    return goflags;
  return [...flags, "-buildvcs=false"].join(" ");
}

// An exported GOFLAGS hides the `go env -w` value, so start from what Go
// itself would use.
const goEnvGoflags = (env) =>
  execFileSync("go", ["env", "GOFLAGS"], { env, encoding: "utf8" });

export function goBuildEnv(base = process.env, readGoflags = goEnvGoflags) {
  const current = readGoflags(base).trim();
  return { ...base, GOFLAGS: goflagsWithoutVcsStamp(current) };
}
