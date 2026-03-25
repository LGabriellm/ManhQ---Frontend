interface KeepaliveRequestOptions {
  signal?: AbortSignal;
}

function normalizeKeepalivePath(path: string): string {
  if (path.startsWith("/api/")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `/api${path}`;
  }
  return `/api/${path}`;
}

export async function postKeepalive(
  path: string,
  payload: unknown,
  options?: KeepaliveRequestOptions,
): Promise<void> {
  await fetch(normalizeKeepalivePath(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
    keepalive: true,
    signal: options?.signal,
  });
}

