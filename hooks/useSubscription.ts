"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription.service";
import type { CancelSubscriptionRequest } from "@/types/api";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  current: () => [...subscriptionKeys.all, "current"] as const,
};

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: () => subscriptionService.getCurrent(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useCancelMySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: CancelSubscriptionRequest) => subscriptionService.cancel(data),
    onSuccess: (result) => {
      queryClient.setQueryData(subscriptionKeys.current(), {
        subscription: result.subscription,
      });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
