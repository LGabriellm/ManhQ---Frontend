"use client";

import { useState } from "react";
import {
  HardDrive,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Server,
  FolderOpen,
  Image,
  FileArchive,
  Loader2,
  Play,
  Eye,
  Info,
} from "lucide-react";
import { useStorageStatus, useRunStorageCleanup } from "@/hooks/useAdmin";
import type { CleanupPassResult, StorageStatusResponse } from "@/types/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function usagePct(bytes: number, limitMb: number): number {
  return Math.min(100, Math.round((bytes / (limitMb * 1024 * 1024)) * 100));
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function DirCard({
  icon: Icon,
  label,
  color,
  sizeBytes,
  fileCount,
  limitMb,
  note,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  sizeBytes: number;
  fileCount: number;
  limitMb?: number;
  note?: string;
}) {
  const pct = limitMb ? usagePct(sizeBytes, limitMb) : null;

  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}22` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-sm font-semibold text-[var(--color-textMain)]">{label}</p>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-[var(--color-textMain)] tabular-nums">
          {fmtBytes(sizeBytes)}
        </p>
        <p className="text-xs text-[var(--color-textDim)]">
          {fileCount.toLocaleString("pt-BR")} arquivo{fileCount !== 1 ? "s" : ""}
        </p>
      </div>

      {pct !== null && (
        <div>
          <div className="flex justify-between text-[10px] text-[var(--color-textDim)] mb-1">
            <span>Uso vs limite ({limitMb} MB)</span>
            <span className={pct >= 90 ? "text-red-400 font-bold" : pct >= 75 ? "text-yellow-400" : ""}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-yellow-500" : "bg-emerald-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {note && (
        <p className="text-[10px] text-[var(--color-textDim)]/60 leading-relaxed">{note}</p>
      )}
    </div>
  );
}

// ─── Config row ───────────────────────────────────────────────────────────────

function ConfigRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-[var(--color-textDim)]">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums", highlight ? "text-yellow-400" : "text-[var(--color-textMain)]")}>
        {value}
      </span>
    </div>
  );
}

// ─── Cleanup result card ──────────────────────────────────────────────────────

function CleanupResultCard({
  label,
  result,
}: {
  label: string;
  result: CleanupPassResult;
}) {
  const freed = fmtBytes(result.freedBytes);
  const hasActivity = result.deleted > 0 || result.errors > 0;

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      result.dryRun ? "border-blue-500/20 bg-blue-500/5" : "border-white/5 bg-[var(--color-surface)]",
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-textMain)]">{label}</p>
        {result.dryRun && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400">
            DRY RUN
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Verificados", value: result.scanned, color: "text-[var(--color-textDim)]" },
          { label: result.dryRun ? "Seriam deletados" : "Deletados", value: result.deleted, color: result.deleted > 0 ? "text-emerald-400" : "text-[var(--color-textDim)]" },
          { label: "Jobs ativos (skip)", value: result.skippedActive, color: "text-yellow-400" },
          { label: "Erros", value: result.errors, color: result.errors > 0 ? "text-red-400" : "text-[var(--color-textDim)]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/5 p-2.5 text-center">
            <p className={cn("text-lg font-bold tabular-nums", stat.color)}>{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-[var(--color-textDim)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {hasActivity && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          result.errors > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400",
        )}>
          {result.errors > 0 ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>
            {result.dryRun
              ? `Liberaria ${freed}`
              : result.deleted > 0
              ? `${freed} liberados`
              : "Nenhum arquivo removido"}
            {result.errors > 0 ? ` · ${result.errors} erro(s)` : ""}
          </span>
        </div>
      )}

      {!hasActivity && (
        <p className="text-xs text-[var(--color-textDim)]/60 text-center py-1">
          Nada a limpar — tudo dentro dos limites configurados.
        </p>
      )}
    </div>
  );
}

// ─── Storage mode badge ───────────────────────────────────────────────────────

function StorageModeBadge({ mode }: { mode: StorageStatusResponse["config"]["storageMode"] }) {
  const isS3 = mode === "s3";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border",
      isS3
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    )}>
      {isS3 ? <Cloud className="h-3 w-3" /> : <Server className="h-3 w-3" />}
      {isS3 ? "S3 / Object Storage" : "Armazenamento local (VPS)"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoragePage() {
  const { data: status, isLoading, refetch, isRefetching } = useStorageStatus();
  const cleanupMutation = useRunStorageCleanup();
  const [lastResult, setLastResult] = useState<{
    orphans: CleanupPassResult;
    cache: CleanupPassResult;
    dryRun: boolean;
  } | null>(null);

  const handleCleanup = async (dryRun: boolean) => {
    try {
      const result = await cleanupMutation.mutateAsync(dryRun);
      setLastResult({ ...result, dryRun });
      await refetch();
      const totalFreed = result.orphans.freedBytes + result.cache.freedBytes;
      const totalDeleted = result.orphans.deleted + result.cache.deleted;

      if (dryRun) {
        toast.success(`Dry run: ${totalDeleted} arquivo(s) seriam removidos, liberando ${fmtBytes(totalFreed)}`);
      } else if (totalDeleted > 0) {
        toast.success(`${totalDeleted} arquivo(s) removidos · ${fmtBytes(totalFreed)} liberados`);
      } else {
        toast.success("Nenhum arquivo orphão encontrado — tudo limpo!");
      }
    } catch {
      toast.error("Erro ao executar limpeza. Verifique os logs do servidor.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">Armazenamento</h1>
          <p className="text-sm text-[var(--color-textDim)] mt-1">
            Uso de disco, cache de imagens e limpeza de arquivos temporários
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textDim)] hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : status ? (
        <>
          {/* Storage mode + local warning */}
          <div className="flex flex-wrap items-center gap-3">
            <StorageModeBadge mode={status.config.storageMode} />
            {status.config.storageMode === "local" && (
              <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/8 px-4 py-3 text-sm text-yellow-300 max-w-2xl">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Modo local ativo — todos os capítulos ficam permanentemente no VPS.
                  Configure <code className="font-mono text-yellow-200">S3_BUCKET</code> para usar Cloudflare R2 ou S3 e evitar lotação do disco.
                </span>
              </div>
            )}
          </div>

          {/* Disk usage cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <DirCard
              icon={FolderOpen}
              label="Temp (uploads / otimizador)"
              color="#3b82f6"
              sizeBytes={status.tempDir.sizeBytes}
              fileCount={status.tempDir.fileCount}
              note="Inclui uploads aguardando processamento, workdirs do otimizador e cache de páginas."
            />
            <DirCard
              icon={Image}
              label="Cache de imagens (leitor)"
              color="#a855f7"
              sizeBytes={status.imageCache.sizeBytes}
              fileCount={status.imageCache.fileCount}
              limitMb={status.config.imageCacheMaxSizeMb}
              note={`Limite: ${status.config.imageCacheMaxSizeMb} MB · Validade: ${status.config.imageCacheMaxAgeHours}h`}
            />
            <DirCard
              icon={FileArchive}
              label="Biblioteca (capítulos finais)"
              color="#10b981"
              sizeBytes={status.libraryDir.sizeBytes}
              fileCount={status.libraryDir.fileCount}
              note={
                status.config.storageMode === "s3"
                  ? "Modo S3 ativo — apenas uploads em progresso ficam aqui temporariamente."
                  : "Modo local — todos os CBZs ficam aqui permanentemente."
              }
            />
          </div>

          {/* Active jobs */}
          {status.activeUploadTempFiles > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3 text-sm text-blue-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                <strong>{status.activeUploadTempFiles}</strong> arquivo{status.activeUploadTempFiles !== 1 ? "s" : ""} temporário{status.activeUploadTempFiles !== 1 ? "s" : ""} em uso por jobs ativos — não serão tocados pela limpeza.
              </span>
            </div>
          )}

          {/* Cleanup config */}
          <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--color-textMain)] mb-3">
              Configuração do limpador automático
            </p>
            <div className="grid gap-0 sm:grid-cols-2">
              <div className="sm:pr-4">
                <ConfigRow
                  label="Limpeza automática"
                  value={status.config.cleanupEnabled ? "Ativada" : "Desativada"}
                  highlight={!status.config.cleanupEnabled}
                />
                <ConfigRow
                  label="Modo dry-run"
                  value={status.config.dryRun ? "Ativado (não deleta)" : "Desativado"}
                  highlight={status.config.dryRun}
                />
                <ConfigRow
                  label="Intervalo entre ciclos"
                  value={`${status.config.intervalMinutes} minutos`}
                />
              </div>
              <div className="sm:pl-4 sm:border-l sm:border-white/5">
                <ConfigRow
                  label="Idade máxima de arquivos temp"
                  value={`${status.config.tempFileMaxAgeHours}h`}
                />
                <ConfigRow
                  label="Tamanho máx. do cache"
                  value={`${status.config.imageCacheMaxSizeMb} MB`}
                />
                <ConfigRow
                  label="Validade de entradas do cache"
                  value={`${status.config.imageCacheMaxAgeHours}h`}
                />
              </div>
            </div>
          </div>

          {/* Manual cleanup trigger */}
          <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-textMain)]">Limpeza manual</p>
              <p className="mt-1 text-xs text-[var(--color-textDim)] leading-5">
                Remove arquivos temporários órfãos (uploads abandonados, workdirs de jobs falhos) e entradas vencidas do cache de páginas.
                Arquivos referenciados por jobs ativos são ignorados automaticamente.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleCleanup(true)}
                disabled={cleanupMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Dry Run (simular)
              </button>

              <button
                onClick={() => {
                  if (!confirm("Executar limpeza real? Arquivos órfãos e entradas vencidas do cache serão removidos permanentemente.")) return;
                  void handleCleanup(false);
                }}
                disabled={cleanupMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Limpar agora
              </button>

              <button
                onClick={() => void handleCleanup(false).then(() => void refetch())}
                disabled={cleanupMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--color-textDim)] hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Limpar e atualizar
              </button>
            </div>

            {/* Results */}
            {lastResult && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-textDim)]">
                  Resultado da última limpeza
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CleanupResultCard label="Arquivos temporários órfãos" result={lastResult.orphans} />
                  <CleanupResultCard label="Cache de imagens (leitor)" result={lastResult.cache} />
                </div>
              </div>
            )}
          </div>

          {/* S3 config hint */}
          {status.config.storageMode === "local" && (
            <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-textMain)]">
                Migrar para Cloudflare R2 / S3
              </p>
              <p className="text-xs text-[var(--color-textDim)] leading-5">
                Com armazenamento remoto, capítulos nunca ficam no VPS — apenas arquivos temporários durante o processamento.
                Configure as variáveis de ambiente no servidor e reinicie o backend:
              </p>
              <pre className="rounded-lg bg-black/40 px-4 py-3 text-[11px] text-[var(--color-textDim)] overflow-x-auto leading-6">
                {`S3_BUCKET=seu-bucket
S3_ENDPOINT=https://...r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://...`}
              </pre>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] py-16 text-center">
          <HardDrive className="mx-auto mb-3 h-10 w-10 text-[var(--color-textDim)]/30" />
          <p className="text-sm text-[var(--color-textDim)]">Não foi possível carregar o status de armazenamento.</p>
          <button onClick={() => void refetch()} className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
