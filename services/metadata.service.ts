import { api } from "@/services/api";
import type {
  MetadataCatalog,
  MetadataProviderInfo,
  MetadataSource,
  ReviewSeriesMetadataRequest,
  SeriesMetadataResponse,
} from "@/types/metadata";

export async function fetchMetadataProviders(): Promise<{
  providers: MetadataProviderInfo[];
  catalog: MetadataCatalog;
}> {
  const { data } = await api.get("/admin/metadata/providers");
  return data;
}

export async function fetchMetadataCatalog(): Promise<MetadataCatalog> {
  const { data } = await api.get("/admin/metadata/catalog");
  return data.catalog;
}

export async function fetchSeriesMetadata(
  seriesId: string,
): Promise<SeriesMetadataResponse> {
  const { data } = await api.get(`/admin/series/${seriesId}/metadata`);
  return data;
}

export interface MetadataSearchResult {
  source: MetadataSource;
  externalId: string | number;
  title: string;
  titleEnglish?: string;
  titleNative?: string;
  description?: string;
  matchConfidence: number;
  [key: string]: unknown;
}

export interface MetadataSearchData {
  query: string;
  workTypeHint?: string | null;
  count?: number;
  sources?: MetadataSource[];
  suggestion?: unknown;
  results: MetadataSearchResult[];
}

export async function searchMetadata(
  query: string,
  workTypeHint?: string,
): Promise<MetadataSearchData> {
  const { data } = await api.get("/admin/metadata/search", {
    params: { q: query, workTypeHint },
  });
  return data;
}

export async function refreshSeriesMetadata(
  seriesId: string,
  payload?: Record<string, unknown>,
): Promise<SeriesMetadataResponse> {
  const { data } = await api.post(`/admin/series/${seriesId}/enrich`, payload);
  return data;
}

export async function reviewSeriesMetadata(
  seriesId: string,
  payload: ReviewSeriesMetadataRequest,
): Promise<SeriesMetadataResponse> {
  const { data } = await api.put(`/admin/series/${seriesId}/metadata`, payload);
  return data;
}
