/**
 * The three routes of PLAN.md §12, as a pure function over a pathname.
 *
 * Pure and dependency-free so it is unit-testable without a DOM: the history
 * plumbing lives in App.tsx and calls this with `location.pathname`.
 */

export type Route =
  | { name: "home" }
  /**
   * `name_` rather than `name` because the discriminant already owns that key.
   * Renaming the discriminant instead would make every other variant read
   * worse to spare one field here.
   */
  | { name: "character"; region: string; realm: string; name_: string }
  | { name: "run"; id: string }
  | { name: "not-found" };

/**
 * A malformed escape (`%zz`) throws out of `decodeURIComponent`; a route match
 * is not the place to surface that, so it degrades to the raw segment and the
 * lookup fails downstream as an unknown character.
 */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function matchRoute(pathname: string): Route {
  const segments = pathname.split("/").filter((s) => s !== "");

  if (segments.length === 0) return { name: "home" };

  // An empty segment anywhere is a malformed path, not a route with a blank
  // field: `filter` above already dropped it, so the length checks below would
  // otherwise read `/c/eu//slam` as a well-formed three-segment character URL.
  const rawInner = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (rawInner.some((s) => s === "")) return { name: "not-found" };

  const [head, ...rest] = segments;

  if (head === "c" && rest.length === 3) {
    return {
      name: "character",
      region: decodeSegment(rest[0]!),
      realm: decodeSegment(rest[1]!),
      name_: decodeSegment(rest[2]!),
    };
  }

  if (head === "run" && rest.length === 1) {
    return { name: "run", id: decodeSegment(rest[0]!) };
  }

  return { name: "not-found" };
}

export function characterPath(c: {
  region: string;
  realm: string;
  name: string;
}): string {
  const part = [c.region, c.realm, c.name].map(encodeURIComponent).join("/");
  return `/c/${part}`;
}

export function runPath(id: string): string {
  return `/run/${encodeURIComponent(id)}`;
}
