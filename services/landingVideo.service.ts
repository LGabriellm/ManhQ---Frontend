import api from "./api";
import type { LandingVideoInfo, LandingVideoAdminInfo } from "@/types/api";

export const landingVideoService = {
  getInfo: (signal?: AbortSignal) =>
    api.get<LandingVideoInfo>("/landing-video", { signal }).then((r) => r.data),

  getAdminInfo: (signal?: AbortSignal) =>
    api
      .get<LandingVideoAdminInfo>("/admin/landing-video", { signal })
      .then((r) => r.data),

  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("video", file);
    return api
      .post<LandingVideoAdminInfo>("/admin/landing-video", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  delete: () =>
    api
      .delete<{ deleted: boolean }>("/admin/landing-video")
      .then((r) => r.data),

  getStreamUrl: () => "/api/landing-video/stream",
};
