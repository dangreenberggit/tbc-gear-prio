import { describe, expect, it } from "vitest";
import { matchRoute, characterPath, runPath } from "../src/router.js";

describe("matchRoute", () => {
  it("matches the home route", () => {
    expect(matchRoute("/")).toEqual({ name: "home" });
  });

  it("matches a character route and decodes its three segments", () => {
    expect(matchRoute("/c/eu/twisting-nether/slamaltman")).toEqual({
      name: "character",
      region: "eu",
      realm: "twisting-nether",
      name_: "slamaltman",
    });
  });

  it("percent-decodes segments so a realm with a space round-trips", () => {
    expect(matchRoute("/c/us/Burning%20Steppes/Nex%C3%A9ss")).toEqual({
      name: "character",
      region: "us",
      realm: "Burning Steppes",
      name_: "Nexéss",
    });
  });

  it("matches a run route", () => {
    expect(matchRoute("/run/abc123")).toEqual({ name: "run", id: "abc123" });
  });

  it("tolerates a trailing slash", () => {
    expect(matchRoute("/run/abc123/")).toEqual({ name: "run", id: "abc123" });
    expect(matchRoute("")).toEqual({ name: "home" });
  });

  it("returns not-found for an unknown path", () => {
    expect(matchRoute("/nope")).toEqual({ name: "not-found" });
  });

  it("returns not-found when a route has the wrong segment count", () => {
    expect(matchRoute("/c/eu/twisting-nether")).toEqual({ name: "not-found" });
    expect(matchRoute("/c/eu/twisting-nether/slam/extra")).toEqual({
      name: "not-found",
    });
    expect(matchRoute("/run")).toEqual({ name: "not-found" });
  });

  it("returns not-found when a required segment is empty", () => {
    expect(matchRoute("/run/")).toEqual({ name: "not-found" });
    expect(matchRoute("/c/eu//slamaltman")).toEqual({ name: "not-found" });
  });

  it("does not treat an /api path as a page route", () => {
    expect(matchRoute("/api/jobs/1")).toEqual({ name: "not-found" });
  });
});

describe("path builders", () => {
  it("builds a character path that matchRoute reads back", () => {
    const path = characterPath({
      region: "us",
      realm: "Burning Steppes",
      name: "Nexéss",
    });
    expect(matchRoute(path)).toEqual({
      name: "character",
      region: "us",
      realm: "Burning Steppes",
      name_: "Nexéss",
    });
  });

  it("builds a run path that matchRoute reads back", () => {
    expect(matchRoute(runPath("job-7"))).toEqual({ name: "run", id: "job-7" });
  });
});
