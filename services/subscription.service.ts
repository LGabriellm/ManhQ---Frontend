import api from "./api";
import { EMPTY_SUBSCRIPTION, normalizeSubscriptionView } from "@/lib/subscription";
import type {
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  SubscriptionView,
} from "@/types/api";

export interface SubscriptionResponse {
  subscription: SubscriptionView;
}

function normalizeSubscriptionResponse(payload: unknown): SubscriptionView {
  if (payload && typeof payload === "object" && "subscription" in payload) {
    const nestedPayload = (payload as { subscription?: unknown }).subscription;
    return normalizeSubscriptionView(nestedPayload) ?? EMPTY_SUBSCRIPTION;
  }

  return normalizeSubscriptionView(payload) ?? EMPTY_SUBSCRIPTION;
}

export const subscriptionService = {
  async getCurrent(): Promise<SubscriptionResponse> {
    const response = await api.get<unknown>("/subscription");

    return {
      subscription: normalizeSubscriptionResponse(response.data),
    };
  },

  async cancel(
    data?: CancelSubscriptionRequest,
  ): Promise<CancelSubscriptionResponse> {
    const response = await api.post<CancelSubscriptionResponse>(
      "/subscription/cancel",
      data,
    );

    return {
      ...response.data,
      subscription: normalizeSubscriptionResponse(response.data),
    };
  },
};
