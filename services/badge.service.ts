import api from "./api";
import type { BadgesResponse, UserBadgeResponse } from "@/types/api";

export const badgeService = {
  /** Returns the authenticated user's badges */
  async getMyBadges(): Promise<UserBadgeResponse[]> {
    const response = await api.get<BadgesResponse>("/users/me/badges");
    return response.data.badges ?? [];
  },

  /** Returns public badges for any user profile */
  async getPublicBadges(userId: string): Promise<UserBadgeResponse[]> {
    const response = await api.get<BadgesResponse>(`/users/${userId}/badges`);
    return response.data.badges ?? [];
  },
};
