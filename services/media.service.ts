import api from "./api";

function normalizeProxyPath(pathOrUrl: string): string {
  let normalized = pathOrUrl.trim();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      normalized = `${parsed.pathname}${parsed.search}`;
    } catch {
      return normalized;
    }
  }

  if (normalized.startsWith("/api/")) {
    return normalized.slice(4);
  }

  if (!normalized.startsWith("/")) {
    return `/${normalized}`;
  }

  return normalized;
}

export const mediaService = {
  async getBlobUrl(pathOrUrl: string): Promise<string> {
    const response = await api.get(normalizeProxyPath(pathOrUrl), {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};

