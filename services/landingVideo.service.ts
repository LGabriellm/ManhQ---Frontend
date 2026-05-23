import api from "./api";
import type { LandingVideoInfo, LandingVideoAdminInfo } from "@/types/api";

type PrepareResponse = { mode: "direct"; key: string };

export const landingVideoService = {
  getInfo: (signal?: AbortSignal) =>
    api.get<LandingVideoInfo>("/landing-video", { signal }).then((r) => r.data),

  getAdminInfo: (signal?: AbortSignal) =>
    api
      .get<LandingVideoAdminInfo>("/admin/landing-video", { signal })
      .then((r) => r.data),

  /**
   * Two-step API shape retained for compatibility. Bunny uploads go through the
   * backend so the storage password never reaches the browser.
   */
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<LandingVideoAdminInfo> => {
    const prepareRes = await api
      .post<PrepareResponse>("/admin/landing-video/prepare", {
        filename: file.name,
        mimeType: file.type || "video/mp4",
      })
      .then((r) => r.data);

    void prepareRes;

    // Direct mode: backend persists to Bunny when configured, otherwise local storage.
    const form = new FormData();
    form.append("video", file);
    return api
      .post<LandingVideoAdminInfo>("/admin/landing-video", form, {
        timeout: 0,
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

  setFormat: (format: "desktop" | "mobile") =>
    api
      .patch<LandingVideoAdminInfo>("/admin/landing-video/format", { format })
      .then((r) => r.data),

  reencode: () =>
    api
      .post<{ started: boolean; message: string }>(
        "/admin/landing-video/reencode",
      )
      .then((r) => r.data),

  getStreamUrl: () => "/api/landing-video/stream",
};
