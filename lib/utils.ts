import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Series } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Garante que series.coverUrl exista (fallback de coverPath → URL da API) */
export function normalizeCoverUrl<T extends Partial<Series>>(series: T): T {
  if (!series.coverUrl && (series as Series).coverPath) {
    (series as Series).coverUrl = `/series/${series.id}/cover`;
  }
  return series;
}

/** Retorna uma URL de capa completa a partir de um path ou URL */
export function getCoverUrl(urlOrPath?: string | null): string {
  if (!urlOrPath) return "";
  if (urlOrPath.startsWith("http")) return urlOrPath;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${base}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

/** Normaliza coverUrl em uma lista de séries */
export function normalizeCoverList<T extends Partial<Series>>(list: T[]): T[] {
  return list.map(normalizeCoverUrl);
}
