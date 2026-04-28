import api from "./api";

export interface FounderStatus {
  totalSlots: number;
  claimed: number;
  remaining: number;
  nextNumber: number;
  isActive: boolean;
}

export const founderService = {
  async getStatus(signal?: AbortSignal): Promise<FounderStatus> {
    const response = await api.get<FounderStatus>("/public/founder-status", { signal });
    return response.data;
  },
};
