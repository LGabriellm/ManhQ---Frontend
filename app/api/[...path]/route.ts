import { NextRequest, NextResponse } from "next/server";
import { UPLOAD_STAGING_TIMEOUT_MS } from "@/lib/upload-limits";

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? "http://manhq-backend:3000"
    : "http://localhost:3000";
const BACKEND_URL = process.env.API_URL || DEFAULT_BACKEND_URL;
const FORWARDED_COOKIE_NAMES = ["manhq_session", "cf_clearance", "__cf_bm"];
const FORWARDED_REQUEST_HEADER_NAMES = [
  "accept",
  "accept-language",
  "cache-control",
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
  "stats/reading-heatmap",
  "analytics/",
  "audit-log",
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
  "admin/badges/",
  "admin/storage/",
  "public/founder-status",
  "ranking",
  "ranking/",
  "suwayomi/",
  "achievements",
  "landing-video",
  "landing-video/",
  "admin/landing-video/prepare",
  "admin/landing-video/confirm",
  "admin/landing-video/reencode",
];

const FETCH_TIMEOUT_MS = 30_000;
const REENCODE_TIMEOUT_MS = 600_000;
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
  if (req.method !== "GET") return false;
  // Avatar images are public — anyone can request them, no user-specific data.
  // Cache even when the requester has an auth cookie.
  if (targetPath.startsWith("account/avatar/")) return true;
  if (hasForwardedCookie) return false;
  return (
    targetPath.startsWith("carousel/covers") ||
    targetPath.startsWith("public/series/")
  );
}

// Short private cache for endpoints that are fetched on every page mount but
// change infrequently. Allows browser to deduplicate rapid requests without
// keeping stale auth/subscription data for long.
function shouldApplyShortPrivateCache(targetPath: string, method: string): boolean {
  if (method !== "GET") return false;
  return targetPath === "me" || targetPath === "users/me/badges" || targetPath === "notifications";
}

function isUploadSessionEventStream(targetPath: string): boolean {
  return /^upload\/sessions\/[^/]+\/events$/.test(targetPath);
}

function isLandingVideoStream(targetPath: string): boolean {
  return targetPath === "landing-video/stream";
}

function isUploadStagingPath(targetPath: string): boolean {
  return (
    targetPath === "upload" ||
    targetPath === "upload/bulk" ||
    targetPath === "upload/folder" ||
    targetPath === "upload/stage" ||
    targetPath === "upload/workflow/series-stage" ||
    (targetPath.startsWith("upload/drafts/") &&
      targetPath.endsWith("/files")) ||
    targetPath.startsWith("upload/series/") ||
    targetPath === "integrations/google-drive/stage" ||
    targetPath === "integrations/google-drive/import"
  );
}

function isLandingVideoUpload(targetPath: string, method: string): boolean {
  return targetPath === "admin/landing-video" && method === "POST";
}

function isLandingVideoReencode(targetPath: string, method: string): boolean {
  return targetPath === "admin/landing-video/reencode" && method === "POST";
}

function getProxyTimeoutMs(targetPath: string, method: string): number | null {
  if (
    isUploadSessionEventStream(targetPath) ||
    isLandingVideoStream(targetPath) ||
    isLandingVideoUpload(targetPath, method)
  ) {
    return null;
  }

  if (isLandingVideoReencode(targetPath, method)) {
    return REENCODE_TIMEOUT_MS;
  }

  if (isUploadStagingPath(targetPath)) {
    return UPLOAD_STAGING_TIMEOUT_MS;
  }

  return FETCH_TIMEOUT_MS;
}

function createProxyTimeout(timeoutMs: number | null): {
  signal?: AbortSignal;
  clear: () => void;
} {
  if (timeoutMs === null) {
    return { clear: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(
      new DOMException("Proxy request timed out", "TimeoutError"),
    );
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

function isMultipartRequest(req: NextRequest): boolean {
  return (
    req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data") ||
    false
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
  const startTime = Date.now();
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
  const proxyTimeout = createProxyTimeout(
    getProxyTimeoutMs(targetPath, req.method),
  );

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    signal: proxyTimeout.signal,
  };

  // Repassar body para métodos que suportam
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (isUploadStagingPath(targetPath) && isMultipartRequest(req)) {
      init.body = await req.arrayBuffer();
    } else {
      init.body = req.body;
    }

    if (init.body instanceof ReadableStream) {
      init.duplex = "half";
    }
  }

  try {
    const response = await fetch(url.toString(), init);
    proxyTimeout.clear();
    const duration = Date.now() - startTime;

    // Log non-2xx responses at a condensed level
    if (!response.ok) {
      const correlationId =
        response.headers.get("x-correlation-id") ??
        response.headers.get("x-request-id") ??
        undefined;
      const extras = correlationId ? ` correlation=${correlationId}` : "";
      console.warn(
        `[Proxy] ${req.method} ${targetPath} -> ${response.status} (${duration}ms)${extras}`,
      );
    }

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
    } else if (shouldApplyShortPrivateCache(targetPath, req.method)) {
      // Auth-gated endpoints that change infrequently: let the browser cache for
      // a short window to absorb rapid duplicate requests (navigation, StrictMode).
      responseHeaders.set("cache-control", "private, max-age=30, must-revalidate");
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
    proxyTimeout.clear();
    const duration = Date.now() - startTime;
    console.error(
      `[Proxy] Fetch error for ${req.method} ${targetPath} (${duration}ms):`,
      err instanceof Error ? err.message : err,
    );
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
