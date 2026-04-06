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
  const normalizedPath = normalizeKeepalivePath(path);
  const body = JSON.stringify(payload);

  // Prefer sendBeacon when possible so progress/stats survive page unload.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function" &&
    !options?.signal
  ) {
    const beaconBody = new Blob([body], {
      type: "application/json",
    });

    if (navigator.sendBeacon(normalizedPath, beaconBody)) {
      return;
    }
  }

  const response = await fetch(normalizedPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body,
    keepalive: true,
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Keepalive failed with status ${response.status}`);
  }
}
