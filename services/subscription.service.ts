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

export const subscriptionService = {
  async getCurrent(): Promise<SubscriptionResponse> {
    const response = await api.get<{ subscription?: unknown }>("/subscription");

    return {
      subscription:
        normalizeSubscriptionView(response.data.subscription) ?? EMPTY_SUBSCRIPTION,
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
      subscription:
        normalizeSubscriptionView(response.data.subscription) ?? EMPTY_SUBSCRIPTION,
    };
  },
};
