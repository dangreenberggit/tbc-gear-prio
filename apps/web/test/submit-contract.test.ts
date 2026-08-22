/**
 * The POST /api/jobs body, checked from both ends at once.
 *
 * The server and the UI were written by separate slices working in parallel.
 * Each was self-consistent and their tests passed, but the UI sent a flat
 * `{region, realm, name, ...}` while the server required a nested
 * `{character: {...}, maxPhase}` — so the first real click answered 400. Unit
 * tests on either side could not catch that; only a test that feeds one side's
 * output to the other side's parser can.
 */
import { describe, expect, it } from "vitest";
import { parseRankInput } from "../server/routes.js";
import type { SubmitJob } from "../src/api.js";

/** Exactly what `Character.tsx` hands to `submitJob`. */
const fromTheUi: SubmitJob = {
  character: { region: "US", realm: "dreamscythe", name: "slamaltman" },
  spec: "ret",
  fight: { reportCode: "AbC123", fightId: 7 },
};

describe("POST /api/jobs body", () => {
  it("accepts what the character page actually sends", () => {
    const parsed = parseRankInput(fromTheUi, 2);
    expect(parsed.ok).toBe(true);
  });

  it("carries the character, spec and fight through unchanged", () => {
    const parsed = parseRankInput(fromTheUi, 2);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.input.character).toEqual({
      region: "US",
      realm: "dreamscythe",
      name: "slamaltman",
    });
    expect(parsed.input.spec).toBe("ret");
    expect(parsed.input.fight).toEqual({ reportCode: "AbC123", fightId: 7 });
  });

  it("fills maxPhase from the server's default when the body omits it", () => {
    const parsed = parseRankInput(fromTheUi, 3);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.input.maxPhase).toBe(3);
  });

  it("prefers an explicit maxPhase over the default", () => {
    const parsed = parseRankInput({ ...fromTheUi, maxPhase: 5 }, 2);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.input.maxPhase).toBe(5);
  });

  it("rejects a body with no maxPhase and no default to fall back on", () => {
    const parsed = parseRankInput(fromTheUi);
    expect(parsed.ok).toBe(false);
  });

  it("still rejects an out-of-range maxPhase rather than taking the default", () => {
    const parsed = parseRankInput({ ...fromTheUi, maxPhase: 9 }, 2);
    expect(parsed.ok).toBe(false);
  });

  it("rejects the flat shape the UI used to send", () => {
    const flat = {
      region: "US",
      realm: "dreamscythe",
      name: "slamaltman",
      spec: "ret",
    };
    expect(parseRankInput(flat, 2).ok).toBe(false);
  });
});
