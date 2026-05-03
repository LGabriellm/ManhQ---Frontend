import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { landingVideoService } from "@/services/landingVideo.service";

export const landingVideoKeys = {
  info: () => ["landing-video", "info"] as const,
  adminInfo: () => ["landing-video", "admin"] as const,
};

export function useLandingVideoInfo() {
  return useQuery({
    queryKey: landingVideoKeys.info(),
    queryFn: ({ signal }) => landingVideoService.getInfo(signal),
    staleTime: 60_000,
  });
}

export function useLandingVideoAdminInfo() {
  return useQuery({
    queryKey: landingVideoKeys.adminInfo(),
    queryFn: ({ signal }) => landingVideoService.getAdminInfo(signal),
    staleTime: 30_000,
  });
}

export function useUploadLandingVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => landingVideoService.upload(file, onProgress),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: landingVideoKeys.adminInfo() });
      void qc.invalidateQueries({ queryKey: landingVideoKeys.info() });
    },
  });
}

export function useDeleteLandingVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => landingVideoService.delete(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: landingVideoKeys.adminInfo() });
      void qc.invalidateQueries({ queryKey: landingVideoKeys.info() });
    },
  });
}
