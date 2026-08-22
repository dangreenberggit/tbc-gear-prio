/**
 * The HTTP surface: `node:http`, a path matcher over five routes, and a
 * static handler for the built SPA.
 *
 * No framework. The routing this shell needs is five patterns and one
 * fallback, which is smaller than the configuration any router would ask for
 * — and the server stays on the Node standard library, so `apps/web` has no
 * runtime server dependency to keep pinned.
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

export type RouteParams = Readonly<Record<string, string>>;

export type JsonBody = Readonly<Record<string, unknown>>;

/** What a handler returns: a JSON body, or a file the caller should download. */
export type HandlerResult =
  | { readonly status: number; readonly json: unknown }
  | {
      readonly status: number;
      readonly text: string;
      readonly contentType: string;
      readonly filename?: string;
    };

export type Handler = (ctx: {
  readonly params: RouteParams;
  readonly query: URLSearchParams;
  readonly body: unknown;
}) => Promise<HandlerResult> | HandlerResult;

export type Route = {
  readonly method: "GET" | "POST";
  /** `/api/jobs/:id/export.json` — a `:name` segment binds one path segment. */
  readonly pattern: string;
  readonly handle: Handler;
};

/**
 * Binds `:name` segments, or `undefined` when the pattern does not describe
 * this path. Exact segment count: `/api/jobs/:id` must not answer for
 * `/api/jobs/:id/share`, which is a different route with a different body.
 */
export function matchPath(
  pattern: string,
  pathname: string
): RouteParams | undefined {
  const want = pattern.split("/").filter((s) => s !== "");
  const got = pathname.split("/").filter((s) => s !== "");
  if (want.length !== got.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i += 1) {
    const w = want[i]!;
    const g = got[i]!;
    if (w.startsWith(":")) {
      params[w.slice(1)] = decodeURIComponent(g);
      continue;
    }
    if (w !== g) return undefined;
  }
  return params;
}

export type CreateHttpServerInput = {
  readonly routes: readonly Route[];
  /** Absolute path to the built SPA. Omitted in tests, which serve no UI. */
  readonly staticDir?: string;
};

export function createHttpServer(input: CreateHttpServerInput): Server {
  return createServer((req, res) => {
    void handle(input, req, res).catch((err: unknown) => {
      sendJson(res, 500, {
        error: "internal",
        detail: err instanceof Error ? err.message : String(err),
      });
    });
  });
}

async function handle(
  input: CreateHttpServerInput,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";

  for (const route of input.routes) {
    if (route.method !== method) continue;
    const params = matchPath(route.pattern, url.pathname);
    if (!params) continue;
    const body = method === "POST" ? await readJsonBody(req) : undefined;
    const result = await route.handle({
      params,
      query: url.searchParams,
      body,
    });
    if ("json" in result) {
      sendJson(res, result.status, result.json);
      return;
    }
    const headers: Record<string, string> = {
      "content-type": result.contentType,
    };
    if (result.filename !== undefined) {
      headers["content-disposition"] =
        `attachment; filename="${result.filename}"`;
    }
    res.writeHead(result.status, headers);
    res.end(result.text);
    return;
  }

  // Everything under /api is the API's to answer. Falling through to the SPA
  // would hand a JSON client an HTML page and a 200 — the failure mode that
  // makes a typo in a fetch path look like a parse bug.
  if (url.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "not-found", detail: url.pathname });
    return;
  }

  if (input.staticDir !== undefined) {
    serveStatic(input.staticDir, url.pathname, res);
    return;
  }
  sendJson(res, 404, { error: "not-found", detail: url.pathname });
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/**
 * A real file if there is one, `index.html` otherwise — the client router
 * owns `/`, `/c/...` and `/run/...`, so a deep link must reach the SPA rather
 * than 404.
 */
function serveStatic(
  staticDir: string,
  pathname: string,
  res: ServerResponse
): void {
  const candidate = safeJoin(staticDir, pathname);
  if (
    candidate !== undefined &&
    existsSync(candidate) &&
    statSync(candidate).isFile()
  ) {
    res.writeHead(200, {
      "content-type":
        CONTENT_TYPES[extname(candidate)] ?? "application/octet-stream",
    });
    createReadStream(candidate).pipe(res);
    return;
  }

  const index = join(staticDir, "index.html");
  if (!existsSync(index)) {
    sendJson(res, 404, {
      error: "not-built",
      detail: "run pnpm -C apps/web build",
    });
    return;
  }
  res.writeHead(200, { "content-type": CONTENT_TYPES[".html"]! });
  createReadStream(index).pipe(res);
}

/**
 * `undefined` when the request path escapes the static root. `..` in a URL is
 * how a static handler is talked into serving `/etc/passwd`; resolving first
 * and comparing prefixes is the check that does not depend on spotting every
 * spelling of it.
 */
function safeJoin(root: string, pathname: string): string | undefined {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const full = join(root, rel);
  if (full !== root && !full.startsWith(root + sep)) return undefined;
  return full;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return undefined;
  return JSON.parse(text);
}
