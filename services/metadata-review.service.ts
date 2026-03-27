import api from "@/services/api";
import type {
  MetadataCatalogResponse,
  MetadataProvidersResponse,
  MetadataSearchResponse,
  RefreshSeriesMetadataRequest,
  RefreshSeriesMetadataResponse,
  ReviewSeriesMetadataRequest,
  ReviewSeriesMetadataResponse,
  SeriesMetadataResponse,
  WorkType,
} from "@/types/metadata-review";

export const metadataReviewService = {
  async getProviders(): Promise<MetadataProvidersResponse> {
    const response = await api.get<MetadataProvidersResponse>(
      "/admin/metadata/providers",
    );
    return response.data;
  },

  async getCatalog(): Promise<MetadataCatalogResponse> {
    const response = await api.get<MetadataCatalogResponse>(
      "/admin/metadata/catalog",
    );
    return response.data;
  },

  async searchMetadata(params: {
    q: string;
    limit?: number;
    workTypeHint?: WorkType;
  }): Promise<MetadataSearchResponse> {
    const response = await api.get<MetadataSearchResponse>(
      "/admin/metadata/search",
      {
        params,
      },
    );
    return response.data;
  },

  async getSeriesMetadata(seriesId: string): Promise<SeriesMetadataResponse> {
    const response = await api.get<SeriesMetadataResponse>(
      `/admin/series/${seriesId}/metadata`,
    );
    return response.data;
  },

  async refreshSeriesMetadata(
    seriesId: string,
    data: RefreshSeriesMetadataRequest,
  ): Promise<RefreshSeriesMetadataResponse> {
    const response = await api.post<RefreshSeriesMetadataResponse>(
      `/admin/series/${seriesId}/enrich`,
      data,
    );
    return response.data;
  },

  async reviewSeriesMetadata(
    seriesId: string,
    data: ReviewSeriesMetadataRequest,
  ): Promise<ReviewSeriesMetadataResponse> {
    const response = await api.put<ReviewSeriesMetadataResponse>(
      `/admin/series/${seriesId}/metadata`,
      data,
    );
    return response.data;
  },
};
