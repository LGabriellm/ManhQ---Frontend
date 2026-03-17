import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "https://api.manhq.com.br";
const FORWARDED_COOKIE_NAMES = ["manhq_session"];

// Prefixos de path permitidos — rejeita qualquer rota fora desta lista
const ALLOWED_PREFIXES = [
  "login",
  "register",
  "logout",
  "logout-all",
  "me",
  "sessions",
  "activate",
  "forgot-password",
  "reset-password",
  "validate-activation-token",
  "read/",
  "series",
  "discover",
  "categories",
  "progress",
  "favorites",
  "user/",
  "upload/",
  "jobs/",
  "scan/",
  "admin/",
  "notifications",
  "stats/",
  "analytics/",
  "collections",
  "editor/",
  "integrations/google-drive/",
  "v1/comments/",
  "v1/account/",
];

const FETCH_TIMEOUT_MS = 30_000;

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
  url.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  // Remove headers que não devem ser repassados
  headers.delete("host");
  headers.delete("connection");
  headers.delete("cookie");

  const forwardedCookie = buildForwardedCookieHeader(req);
  if (forwardedCookie) {
    headers.set("cookie", forwardedCookie);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };

  // Repassar body para métodos que suportam
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    // @ts-expect-error - duplex is needed for streaming body
    init.duplex = "half";
  }

  try {
    const response = await fetch(url.toString(), init);

    // Repassar response com headers originais
    const responseHeaders = new Headers(response.headers);
    // Remover headers que o Next.js gerencia
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("content-encoding");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json({ error: "Gateway timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
