import api from "./api";
import type {
  CommunityBadgesResponse,
  CommunityLeaderboardCategoriesResponse,
  CommunityLeaderboardParams,
  CommunityLeaderboardResponse,
  CommunityOverviewResponse,
  CommunityProfileResponse,
  CommunityUserProfileResponse,
} from "@/types/api";

export const communityService = {
  async getMyProfile(): Promise<CommunityProfileResponse> {
    const response = await api.get<CommunityProfileResponse>("/community/me");
    return response.data;
  },

  async getBadges(): Promise<CommunityBadgesResponse> {
    const response = await api.get<CommunityBadgesResponse>("/community/badges");
    return response.data;
  },

  async getLeaderboard(
    params?: CommunityLeaderboardParams,
  ): Promise<CommunityLeaderboardResponse> {
    const response = await api.get<CommunityLeaderboardResponse>(
      "/community/leaderboard",
      { params },
    );
    return response.data;
  },

  async getLeaderboardCategories(): Promise<CommunityLeaderboardCategoriesResponse> {
    const response = await api.get<CommunityLeaderboardCategoriesResponse>(
      "/community/leaderboard/categories",
    );
    return response.data;
  },

  async getOverview(): Promise<CommunityOverviewResponse> {
    const response = await api.get<CommunityOverviewResponse>(
      "/community/overview",
    );
    return response.data;
  },

  async getUserProfile(userId: string): Promise<CommunityUserProfileResponse> {
    const response = await api.get<CommunityUserProfileResponse>(
      `/community/users/${userId}`,
    );
    return response.data;
  },
};
