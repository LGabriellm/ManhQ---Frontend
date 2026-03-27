import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Series } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Garante que series.coverUrl exista (fallback de coverPath → URL da API) */
export function normalizeCoverUrl<T extends Partial<Series>>(series: T): T {
  if (!series.coverUrl && (series as Series).coverPath) {
    (series as Series).coverUrl = `/public/series/${series.id}/cover`;
  }
  return series;
}

/** Retorna uma URL de capa completa a partir de um path ou URL */
export function getCoverUrl(urlOrPath?: string | null): string {
  if (!urlOrPath) return "";

  let normalizedInput = urlOrPath.startsWith("/series/")
    ? urlOrPath.replace("/series/", "/public/series/")
    : urlOrPath;

  if (
    normalizedInput.startsWith("http://") ||
    normalizedInput.startsWith("https://")
  ) {
    try {
      const parsed = new URL(normalizedInput);
      normalizedInput = `${parsed.pathname}${parsed.search}`;
    } catch {
      return normalizedInput;
    }
  }

  if (
    normalizedInput.startsWith("data:") ||
    normalizedInput.startsWith("blob:")
  ) {
    return normalizedInput;
  }

  if (normalizedInput.startsWith("/api/")) {
    return normalizedInput;
  }

  if (normalizedInput.startsWith("/")) {
    return `/api${normalizedInput}`;
  }

  return `/api/${normalizedInput}`;
}

/** Normaliza coverUrl em uma lista de séries */
export function normalizeCoverList<T extends Partial<Series>>(list: T[]): T[] {
  return list.map(normalizeCoverUrl);
}
