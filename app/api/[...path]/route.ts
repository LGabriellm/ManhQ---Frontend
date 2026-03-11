import { NextRequest } from "next/server";

const BACKEND_URL = process.env.API_URL || "https://api.manhq.com.br";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = new URL(targetPath, BACKEND_URL);
  url.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  // Remove headers que não devem ser repassados
  headers.delete("host");
  headers.delete("connection");

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  // Repassar body para métodos que suportam
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    // @ts-expect-error - duplex is needed for streaming body
    init.duplex = "half";
  }

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
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
