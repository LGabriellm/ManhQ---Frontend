import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "https://api.manhq.com.br";
const FORWARDED_COOKIE_NAMES = ["manhq_session", "cf_clearance", "__cf_bm"];
const FORWARDED_REQUEST_HEADER_NAMES = [
  "accept",
  "accept-language",
  "cache-control",
  "content-length",
  "content-type",
  "if-modified-since",
  "if-none-match",
  "if-range",
  "last-event-id",
  "pragma",
  "range",
  "user-agent",
] as const;

// Prefixos de path permitidos — rejeita qualquer rota fora desta lista
const ALLOWED_PREFIXES = [
  "login",
  "register",
  "logout",
  "logout-all",
  "me",
  "subscription",
  "sessions",
  "activate",
  "username",
  "forgot-password",
  "reset-password",
  "validate-activation-token",
  "read/",
  "series",
  "discover",
  "carousel",
  "public/series/",
  "categories",
  "search",
  "progress",
  "favorites",
  "reading",
  "history",
  "series-status",
  "user/",
  "my/submissions",
  "upload",
  "upload/",
  "jobs",
  "jobs/",
  "scan",
  "scan/",
  "admin/",
  "notifications",
  "stats/",
  "analytics/",
  "collections",
  "account",
  "editor/",
  "comments",
  "ratings",
  "community",
  "feed",
  "integrations/google-drive/",
  "v1/comments/",
  "v1/account/",
  "users/me/badges",
  "users/",
];

const FETCH_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=1800";
const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";
const SSE_CACHE_CONTROL = "private, no-store, no-transform, max-age=0";

function matchesAllowedPrefix(targetPath: string, prefix: string): boolean {
  if (prefix.endsWith("/")) {
    return targetPath.startsWith(prefix);
  }

  return targetPath === prefix || targetPath.startsWith(`${prefix}/`);
}

function isPathAllowed(targetPath: string): boolean {
  // Bloqueia path traversal
  if (targetPath.includes("..") || targetPath.includes("//")) return false;
  // Bloqueia caracteres suspeitos (line-breaks, null bytes)
  if (/[\x00-\x1f]/.test(targetPath)) return false;

  return ALLOWED_PREFIXES.some((prefix) =>
    matchesAllowedPrefix(targetPath, prefix),
  );
}

function buildForwardedCookieHeader(req: NextRequest): string | null {
  const cookies = req.cookies
    .getAll()
    .filter((cookie) => FORWARDED_COOKIE_NAMES.includes(cookie.name));

  if (cookies.length === 0) return null;
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function buildForwardedHeaders(
  req: NextRequest,
  forwardedCookieHeader: string | null,
): Headers {
  const headers = new Headers();

  for (const headerName of FORWARDED_REQUEST_HEADER_NAMES) {
    const value = req.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  if (forwardedCookieHeader) {
    headers.set("cookie", forwardedCookieHeader);
  }

  headers.set("accept-encoding", "identity");
  headers.set("x-forwarded-host", req.headers.get("host") || req.nextUrl.host);
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));

  return headers;
}

function normalizeBoundedInteger(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
): string {
  if (value === null || value === "") {
    return String(fallback);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return String(fallback);
  }

  return String(Math.min(max, Math.max(min, parsed)));
}

function applyQueryGuards(
  targetPath: string,
  searchParams: URLSearchParams,
): void {
  if (targetPath.startsWith("carousel/covers")) {
    const sort = searchParams.get("sort");
    if (sort !== "recent" && sort !== "popular" && sort !== "random") {
      searchParams.set("sort", "recent");
    }
    searchParams.set(
      "limit",
      normalizeBoundedInteger(searchParams.get("limit"), 1, 48, 24),
    );
    return;
  }

  if (targetPath === "search") {
    searchParams.set(
      "limit",
      normalizeBoundedInteger(searchParams.get("limit"), 1, 50, 24),
    );
    searchParams.set(
      "page",
      normalizeBoundedInteger(searchParams.get("page"), 1, 500, 1),
    );
    return;
  }

  if (targetPath.startsWith("search/suggestions")) {
    searchParams.set(
      "limit",
      normalizeBoundedInteger(searchParams.get("limit"), 1, 20, 6),
    );
    return;
  }

  if (targetPath.startsWith("discover")) {
    searchParams.set(
      "limit",
      normalizeBoundedInteger(searchParams.get("limit"), 1, 50, 18),
    );
  }
}

function shouldApplyPublicCacheHeader(
  req: NextRequest,
  targetPath: string,
  hasForwardedCookie: boolean,
): boolean {
  if (req.method !== "GET" || hasForwardedCookie) {
    return false;
  }

  return (
    targetPath.startsWith("carousel/covers") ||
    targetPath.startsWith("public/series/")
  );
}

function isUploadSessionEventStream(targetPath: string): boolean {
  return /^upload\/sessions\/[^/]+\/events$/.test(targetPath);
}

function isUploadStagingPath(targetPath: string): boolean {
  return (
    targetPath === "upload/stage" ||
    targetPath === "upload/workflow/series-stage" ||
    targetPath.startsWith("upload/series/") ||
    targetPath === "integrations/google-drive/stage"
  );
}

function appendVaryHeader(headers: Headers, value: string): void {
  const current = headers.get("vary");
  if (!current) {
    headers.set("vary", value);
    return;
  }

  const values = current
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!values.includes(value.toLowerCase())) {
    headers.set("vary", `${current}, ${value}`);
  }
}

function rewriteSetCookieHeader(cookie: string, req: NextRequest): string {
  const isHttps = req.nextUrl.protocol === "https:";
  let rewritten = cookie.replace(/;\s*Domain=[^;]+/gi, "");

  if (isHttps && !/;\s*Secure/i.test(rewritten)) {
    rewritten = `${rewritten}; Secure`;
  }

  if (!/;\s*SameSite=/i.test(rewritten)) {
    rewritten = `${rewritten}; SameSite=Lax`;
  }

  if (!/;\s*Path=/i.test(rewritten)) {
    rewritten = `${rewritten}; Path=/`;
  }

  if (!/;\s*HttpOnly/i.test(rewritten) && cookie.startsWith("manhq_session=")) {
    rewritten = `${rewritten}; HttpOnly`;
  }

  return rewritten;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join("/");

  if (!isPathAllowed(targetPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(targetPath, BACKEND_URL);
  const guardedSearchParams = new URLSearchParams(req.nextUrl.search);
  applyQueryGuards(targetPath, guardedSearchParams);
  url.search = guardedSearchParams.toString();

  const forwardedCookieHeader = buildForwardedCookieHeader(req);
  const headers = buildForwardedHeaders(req, forwardedCookieHeader);

  const init: RequestInit = {
    method: req.method,
    headers,
    signal: isUploadSessionEventStream(targetPath)
      ? undefined
      : AbortSignal.timeout(
          isUploadStagingPath(targetPath)
            ? UPLOAD_TIMEOUT_MS
            : FETCH_TIMEOUT_MS,
        ),
  };

  // Repassar body para métodos que suportam
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    // @ts-expect-error - duplex is needed for streaming body
    init.duplex = "half";
  }

  try {
    const response = await fetch(url.toString(), init);
    const isEventStream = isUploadSessionEventStream(targetPath);
    const isPublicCacheable = shouldApplyPublicCacheHeader(
      req,
      targetPath,
      Boolean(forwardedCookieHeader),
    );

    // Repassar response com headers originais
    const responseHeaders = new Headers(response.headers);
    const setCookies = getSetCookieHeaders(response.headers);
    // Remover headers que o Next.js gerencia
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("set-cookie");

    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", rewriteSetCookieHeader(cookie, req));
    }

    if (isEventStream) {
      responseHeaders.set("cache-control", SSE_CACHE_CONTROL);
      responseHeaders.set("x-accel-buffering", "no");
    } else if (isPublicCacheable) {
      responseHeaders.set("cache-control", PUBLIC_CACHE_CONTROL);
      appendVaryHeader(responseHeaders, "Cookie");
    } else if (forwardedCookieHeader || req.method !== "GET") {
      responseHeaders.set("cache-control", PRIVATE_CACHE_CONTROL);
      appendVaryHeader(responseHeaders, "Cookie");
    }

    // Preserve Retry-After on rate limit responses so clients know how long to back off
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        responseHeaders.set("retry-after", retryAfter);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Gateway timeout" },
        {
          status: 504,
          headers: {
            "cache-control": PRIVATE_CACHE_CONTROL,
          },
        },
      );
    }
    return NextResponse.json(
      { error: "Backend unavailable" },
      {
        status: 502,
        headers: {
          "cache-control": PRIVATE_CACHE_CONTROL,
        },
      },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
