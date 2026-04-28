import api from "./api";
import type { BadgesResponse, UserBadgeResponse } from "@/types/api";

export const badgeService = {
  /** Returns the authenticated user's badges with isFeatured flag */
  async getMyBadges(): Promise<UserBadgeResponse[]> {
    const response = await api.get<BadgesResponse>("/users/me/badges");
    return response.data.badges ?? [];
  },

  /** Returns public badges for any user profile */
  async getPublicBadges(userId: string): Promise<UserBadgeResponse[]> {
    const response = await api.get<BadgesResponse>(`/users/${userId}/badges`);
    return response.data.badges ?? [];
  },

  /** Sets or clears the featured badge shown next to username. Pass null to clear. */
  async setFeaturedBadge(userBadgeId: string | null): Promise<void> {
    await api.patch("/users/me/badges/featured", { userBadgeId });
  },
};
