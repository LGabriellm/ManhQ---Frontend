import api from "./api";
import { normalizeCoverUrl } from "@/lib/utils";
import type { Media, Series } from "@/types/api";

function toSafeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sortMedias(medias?: Media[]): Media[] {
  if (!Array.isArray(medias)) {
    return [];
  }

  return [...medias].sort((left, right) => {
    const numberDiff = toSafeNumber(left.number) - toSafeNumber(right.number);
    if (numberDiff !== 0) {
      return numberDiff;
    }

    const createdAtDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (Number.isFinite(createdAtDiff) && createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return (left.title ?? "").localeCompare(right.title ?? "", "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function normalizeSeries(series: Series): Series {
  const normalized = normalizeCoverUrl({ ...series });
  return {
    ...normalized,
    medias: sortMedias(series.medias),
  };
}

function extractSeriesCollection(payload: unknown): Series[] {
  if (Array.isArray(payload)) {
    return payload as Series[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as {
      items?: Series[];
      data?: Series[];
      series?: Series;
    };

    if (Array.isArray(record.items)) {
      return record.items;
    }

    if (Array.isArray(record.data)) {
      return record.data;
    }

    if (record.series) {
      return [record.series];
    }
  }

  return [];
}

export const seriesService = {
  // Listar todas as séries
  async getAll(): Promise<Series[]> {
    const response = await api.get<unknown>("/series");
    return extractSeriesCollection(response.data).map((series) =>
      normalizeSeries(series),
    );
  },

  // Obter detalhes de uma série
  async getById(id: string): Promise<Series> {
    const response = await api.get<unknown>(`/series/${id}`);
    const [series] = extractSeriesCollection(response.data);
    return normalizeSeries((series ?? response.data) as Series);
  },

  // Gerar URL da capa
  async getCoverUrl(series: Series): Promise<string> {
    const rawCoverUrl = series.coverUrl || `/public/series/${series.id}/cover`;
    let normalizedCoverPath = rawCoverUrl;
    if (rawCoverUrl.startsWith("http://") || rawCoverUrl.startsWith("https://")) {
      try {
        const parsed = new URL(rawCoverUrl);
        normalizedCoverPath = `${parsed.pathname}${parsed.search}`;
      } catch {
        normalizedCoverPath = rawCoverUrl;
      }
    }
    if (normalizedCoverPath.startsWith("/series/")) {
      normalizedCoverPath = normalizedCoverPath.replace(
        "/series/",
        "/public/series/",
      );
    }
    const requestPath = normalizedCoverPath.startsWith("/api/")
      ? normalizedCoverPath.slice(4)
      : normalizedCoverPath;

    const response = await api.get(requestPath, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
