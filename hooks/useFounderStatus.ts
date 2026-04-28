"use client";

import { useQuery } from "@tanstack/react-query";
import { founderService, type FounderStatus } from "@/services/founder.service";

const FALLBACK: FounderStatus = {
  totalSlots: 100,
  claimed: 0,
  remaining: 100,
  nextNumber: 1,
  isActive: true,
};

export function useFounderStatus() {
  return useQuery({
    queryKey: ["founder-status"],
    queryFn: ({ signal }) => founderService.getStatus(signal),
    staleTime: 1000 * 60 * 2, // 2 min — re-fetch every 2 minutes
    refetchOnWindowFocus: true,
    placeholderData: FALLBACK,
  });
}
