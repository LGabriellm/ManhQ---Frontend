"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Film,
  Loader2,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileVideo,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useLandingVideoAdminInfo,
  useUploadLandingVideo,
  useDeleteLandingVideo,
} from "@/hooks/useLandingVideo";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LandingVideoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { data: video, isLoading } = useLandingVideoAdminInfo();
  const uploadMutation = useUploadLandingVideo();
  const deleteMutation = useDeleteLandingVideo();

  const handleFile = useCallback(
    (file: File) => {
      const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];
      if (!ALLOWED.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
        toast.error("Formato não suportado. Use MP4, WebM ou MOV.");
        return;
      }

      setUploadProgress(0);
      uploadMutation.mutate(
        {
          file,
          onProgress: (pct) => setUploadProgress(pct),
        },
        {
          onSuccess: () => {
            setUploadProgress(null);
            toast.success("Vídeo atualizado com sucesso!");
          },
          onError: () => {
            setUploadProgress(null);
            toast.error("Erro ao fazer upload do vídeo.");
          },
        },
      );
    },
    [uploadMutation],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  function handleDelete() {
    if (!confirm("Remover o vídeo da landing page?")) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success("Vídeo removido."),
      onError: () => toast.error("Erro ao remover vídeo."),
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/marketing")}
          className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-textMain)]">
            Vídeo da Landing Page
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            Gerencie o vídeo de demonstração exibido para visitantes
          </p>
        </div>
      </div>

      {/* Current video */}
      <div className="rounded-2xl border border-white/8 bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="font-semibold text-[var(--color-textMain)]">
              Vídeo atual
            </h2>
          </div>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
          )}
        </div>

        {!isLoading && !video?.active && (
          <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-textDim)]" />
            <p className="text-sm text-[var(--color-textDim)]">
              Nenhum vídeo configurado. Faça o upload abaixo.
            </p>
          </div>
        )}

        {video?.active && (
          <div className="space-y-4">
            {/* Preview */}
            <div className="overflow-hidden rounded-xl border border-white/8 bg-black">
              <video
                src="/api/landing-video/stream"
                controls
                className="w-full"
                style={{ maxHeight: "360px" }}
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Arquivo", value: video.filename ?? "—" },
                { label: "Tamanho", value: video.size ? formatBytes(video.size) : "—" },
                { label: "Formato", value: video.mimeType ?? "—" },
                {
                  label: "Enviado em",
                  value: video.uploadedAt ? formatDate(video.uploadedAt) : "—",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/5 bg-[var(--color-background)]/50 px-3 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-textDim)]">
                    {label}
                  </p>
                  <p
                    className="mt-1 truncate text-sm font-medium text-[var(--color-textMain)]"
                    title={value}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Status + delete */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Ativo na landing page
              </div>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-40"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remover vídeo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div className="rounded-2xl border border-white/8 bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="font-semibold text-[var(--color-textMain)]">
            {video?.active ? "Substituir vídeo" : "Fazer upload"}
          </h2>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragOver
              ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5"
              : "border-white/12 hover:border-white/20 hover:bg-white/3"
          } ${uploadMutation.isPending ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          {uploadMutation.isPending ? (
            <div className="w-full max-w-xs space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm font-medium text-[var(--color-textMain)]">
                Enviando… {uploadProgress !== null ? `${uploadProgress}%` : ""}
              </p>
              {uploadProgress !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <FileVideo className="mb-3 h-10 w-10 text-white/20" />
              <p className="text-sm font-medium text-[var(--color-textMain)]">
                Arraste o vídeo aqui ou{" "}
                <span className="text-[var(--color-primary)]">clique para selecionar</span>
              </p>
              <p className="mt-1.5 text-xs text-[var(--color-textDim)]">
                MP4, WebM ou MOV · até 2 GB
              </p>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-[var(--color-textDim)]">
          O vídeo substituirá o atual imediatamente após o upload e ficará visível
          na landing page para todos os visitantes.
        </p>
      </div>
    </div>
  );
}
