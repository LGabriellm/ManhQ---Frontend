import api from "./api";
import type { LandingVideoInfo, LandingVideoAdminInfo } from "@/types/api";

type PrepareResponse =
  | { mode: "presigned"; uploadUrl: string; key: string }
  | { mode: "direct"; key: string };

export const landingVideoService = {
  getInfo: (signal?: AbortSignal) =>
    api.get<LandingVideoInfo>("/landing-video", { signal }).then((r) => r.data),

  getAdminInfo: (signal?: AbortSignal) =>
    api
      .get<LandingVideoAdminInfo>("/admin/landing-video", { signal })
      .then((r) => r.data),

  /**
   * Two-step upload that bypasses Cloudflare's body size limit when S3 is configured:
   * 1. Ask backend for a presigned PUT URL (or "direct" mode for local storage)
   * 2a. Presigned: PUT directly to S3, then confirm with backend
   * 2b. Direct: POST multipart through the Next.js proxy (local dev / no S3)
   */
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<LandingVideoAdminInfo> => {
    const prepareRes = await api
      .post<PrepareResponse>("/admin/landing-video/prepare", {
        filename: file.name,
        mimeType: file.type || "video/mp4",
      })
      .then((r) => r.data);

    if (prepareRes.mode === "presigned") {
      // Upload directly to S3 — bypasses Cloudflare completely
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", prepareRes.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        if (onProgress) {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("S3 upload network error"));
        xhr.send(file);
      });

      return api
        .post<LandingVideoAdminInfo>("/admin/landing-video/confirm", {
          storageKey: prepareRes.key,
          filename: file.name,
          mimeType: file.type || "video/mp4",
          size: file.size,
        })
        .then((r) => r.data);
    }

    // Direct mode: local storage — POST multipart through the proxy
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
