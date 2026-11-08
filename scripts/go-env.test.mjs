import { describe, expect, it } from "vitest";
import { goBuildEnv, goflagsWithoutVcsStamp } from "./go-env.mjs";

describe("goflagsWithoutVcsStamp", () => {
  it.each([
    ["", "-buildvcs=false"],
    ["-mod=mod", "-mod=mod -buildvcs=false"],
    ["-buildvcs=false", "-buildvcs=false"],
    ["-mod=mod -buildvcs=true", "-mod=mod -buildvcs=true"],
    ["--buildvcs=false", "--buildvcs=false"],
    ["-buildvcs", "-buildvcs"],
  ])("turns %j into %j", (flags, want) => {
    expect(goflagsWithoutVcsStamp(flags)).toBe(want);
  });
});

describe("goBuildEnv", () => {
  it("keeps the rest of the env and the GOFLAGS that `go env` reports", () => {
    const calls = [];
    const readGoflags = (env) => {
      calls.push(env);
      return "-mod=mod\n";
    };
    const env = goBuildEnv({ PATH: "/bin", GOFLAGS: "-mod=mod" }, readGoflags);
    expect(env).toEqual({ PATH: "/bin", GOFLAGS: "-mod=mod -buildvcs=false" });
    expect(calls).toEqual([{ PATH: "/bin", GOFLAGS: "-mod=mod" }]);
  });
});
