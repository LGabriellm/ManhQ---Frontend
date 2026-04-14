"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSuwayomiHealth,
  useSuwayomiExtensions,
  useSuwayomiFetchExtensions,
  useSuwayomiInstallExtension,
  useSuwayomiUninstallExtension,
  useSuwayomiReload,
  providerKeys,
} from "@/hooks/useProvider";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Server,
  Globe,
  Puzzle,
  RotateCcw,
  ArrowUpCircle,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function SuwayomiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "pt-br" | "other">(
    "all",
  );
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [pendingPkgs, setPendingPkgs] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const { data: health, isLoading: healthLoading } = useSuwayomiHealth();
  const { data: extData, isLoading: extLoading } = useSuwayomiExtensions(
    health?.reachable ?? false,
  );

  const fetchExtensions = useSuwayomiFetchExtensions();
  const installExtension = useSuwayomiInstallExtension();
  const uninstallExtension = useSuwayomiUninstallExtension();
  const reloadSources = useSuwayomiReload();

  const isWorkflowPending =
    fetchExtensions.isPending ||
    installExtension.isPending ||
    uninstallExtension.isPending ||
    reloadSources.isPending;

  function handleFetch() {
    fetchExtensions.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(
          res.message ||
            "Repositórios atualizados. A lista de extensões foi sincronizada.",
        ),
      onError: () => toast.error("Erro ao buscar extensões"),
    });
  }

  function handleInstall(pkgName: string, name: string) {
    installExtension.mutate(pkgName, {
      onSuccess: async (result) => {
        if (result.pending) {
          toast.success(
            `"${name}" está sendo instalada em segundo plano. Aguardando conclusão...`,
          );
          setPendingPkgs((prev) => new Set(prev).add(pkgName));
          return;
        }

        toast.success(`"${name}" instalada. Recarregando fontes...`);

        try {
          const reloadResult = await reloadSources.mutateAsync();
          toast.success(
            `${reloadResult.sourcesRegistered} fontes registradas com sucesso.`,
          );
        } catch {
          toast.error(
            `"${name}" foi instalada, mas falhou ao registrar fontes. Tente recarregar manualmente.`,
          );
        }
      },
      onError: () => toast.error(`Erro ao instalar "${name}"`),
    });
  }

  // Polling para extensões pendentes (202)
  useEffect(() => {
    if (pendingPkgs.size === 0) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
      return;
    }

    pollRef.current = setInterval(async () => {
      await queryClient.invalidateQueries({
        queryKey: providerKeys.suwayomiExtensions(),
      });

      const freshData = queryClient.getQueryData<{
        extensions: Array<{ pkgName: string; isInstalled: boolean }>;
      }>(providerKeys.suwayomiExtensions());

      if (!freshData) return;

      const nowInstalled = new Set<string>();
      for (const pkg of pendingPkgs) {
        const ext = freshData.extensions.find((e) => e.pkgName === pkg);
        if (ext?.isInstalled) {
          nowInstalled.add(pkg);
        }
      }

      if (nowInstalled.size > 0) {
        setPendingPkgs((prev) => {
          const next = new Set(prev);
          nowInstalled.forEach((pkg) => next.delete(pkg));
          return next;
        });

        toast.success(
          `${nowInstalled.size} extensão(ões) instalada(s). Recarregando fontes...`,
        );

        try {
          const reloadResult = await reloadSources.mutateAsync();
          toast.success(
            `${reloadResult.sourcesRegistered} fontes registradas com sucesso.`,
          );
        } catch {
          toast.error(
            "Extensões instaladas, mas falhou ao registrar fontes. Tente recarregar manualmente.",
          );
        }
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [pendingPkgs, queryClient, reloadSources]);

  function handleUninstall(pkgName: string, name: string) {
    if (
      !confirm(
        `Desinstalar a extensão "${name}"? As fontes associadas serão removidas.`,
      )
    )
      return;
    uninstallExtension.mutate(pkgName, {
      onSuccess: () => {
        toast.success(`"${name}" desinstalada com sucesso`);
        reloadSources.mutate(undefined, {
          onSuccess: (res) =>
            toast.success(`${res.sourcesRegistered} fontes recarregadas`),
          onError: () =>
            toast.error("Falha ao recarregar fontes após desinstalação"),
        });
      },
      onError: () => toast.error(`Erro ao desinstalar "${name}"`),
    });
  }

  function handleReload() {
    reloadSources.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(`${res.sourcesRegistered} fontes recarregadas`),
      onError: () => toast.error("Erro ao recarregar fontes"),
    });
  }

  const allExtensions = extData?.extensions ?? [];
  const installedCount = allExtensions.filter((e) => e.isInstalled).length;

  const filteredExtensions = useMemo(() => {
    let result = allExtensions;

    if (showInstalledOnly) {
      result = result.filter((e) => e.isInstalled);
    }

    if (langFilter === "pt-br") {
      result = result.filter((e) => e.lang === "pt-br" || e.lang === "all");
    } else if (langFilter === "other") {
      result = result.filter((e) => e.lang !== "pt-br" && e.lang !== "all");
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.pkgName.toLowerCase().includes(query),
      );
    }

    // PT-BR first, then sorted by name
    return result.sort((a, b) => {
      const aIsPtBr = a.lang === "pt-br" || a.lang === "all";
      const bIsPtBr = b.lang === "pt-br" || b.lang === "all";
      if (aIsPtBr && !bIsPtBr) return -1;
      if (!aIsPtBr && bIsPtBr) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allExtensions, showInstalledOnly, langFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/providers")}
          className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-textMain)]">
            Suwayomi — Gerenciador de Extensões
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            Gerencie extensões Mihon/Tachiyomi via sidecar Suwayomi
          </p>
        </div>
      </div>

      {/* Health status card */}
      <div className="surface-panel rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="font-semibold text-[var(--color-textMain)]">
              Status do Sidecar
            </h2>
          </div>
          {healthLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
          )}
        </div>

        {health && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--color-textDim)]">Configurado</p>
              <div className="mt-1 flex items-center gap-1.5">
                {health.configured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-medium text-[var(--color-textMain)]">
                  {health.configured ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--color-textDim)]">Acessível</p>
              <div className="mt-1 flex items-center gap-1.5">
                {health.reachable ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-medium text-[var(--color-textMain)]">
                  {health.reachable ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--color-textDim)]">
                Fontes Ativas
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                {health.sources}
                {health.sourcesTotal != null && ` / ${health.sourcesTotal}`}
              </p>
            </div>

            {health.defaultLang && (
              <div>
                <p className="text-xs text-[var(--color-textDim)]">
                  Idioma Padrão
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {health.defaultLang}
                </p>
              </div>
            )}
          </div>
        )}

        {health && !health.configured && (
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
            Suwayomi não está configurado. Defina{" "}
            <code className="rounded bg-white/10 px-1">SUWAYOMI_URL</code> no
            backend.
          </div>
        )}

        {health && health.configured && !health.reachable && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            Suwayomi está configurado mas não pode ser acessado. Verifique se o
            serviço está rodando.
          </div>
        )}
      </div>

      {/* Actions */}
      {health?.reachable && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFetch}
            disabled={isWorkflowPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${fetchExtensions.isPending ? "animate-spin" : ""}`}
            />
            Buscar Extensões dos Repositórios
          </button>

          <button
            onClick={handleReload}
            disabled={isWorkflowPending}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-textMain)] hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RotateCcw
              className={`h-4 w-4 ${reloadSources.isPending ? "animate-spin" : ""}`}
            />
            Recarregar Fontes
          </button>
        </div>
      )}

      {/* Extensions list */}
      {health?.reachable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
              Extensões ({allExtensions.length})
            </h2>
            <div className="flex items-center gap-3 text-xs text-[var(--color-textDim)]">
              <span>{installedCount} instaladas</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
              <input
                type="text"
                placeholder="Buscar extensão por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
            <select
              value={langFilter}
              onChange={(e) =>
                setLangFilter(e.target.value as "all" | "pt-br" | "other")
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="all">Todos os idiomas</option>
              <option value="pt-br">PT-BR / All</option>
              <option value="other">Outros idiomas</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textDim)] cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={showInstalledOnly}
                onChange={(e) => setShowInstalledOnly(e.target.checked)}
                className="rounded border-white/20"
              />
              <Filter className="h-3.5 w-3.5" />
              Instaladas
            </label>
          </div>

          {extLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : filteredExtensions.length === 0 ? (
            <div className="surface-panel rounded-xl border border-white/5 py-12 text-center text-sm text-[var(--color-textDim)]">
              <Puzzle className="mx-auto mb-3 h-10 w-10 opacity-30" />
              {allExtensions.length === 0
                ? 'Nenhuma extensão encontrada. Clique em "Buscar Extensões dos Repositórios" para baixar a lista.'
                : "Nenhuma extensão corresponde aos filtros"}
            </div>
          ) : (
            <div className="surface-panel overflow-hidden rounded-xl border border-white/5">
              <p className="px-4 py-2 text-xs text-[var(--color-textDim)] border-b border-white/5">
                {filteredExtensions.length} extensão(ões) encontrada(s)
              </p>
              <div className="divide-y divide-white/5">
                {filteredExtensions.map((ext) => (
                  <div
                    key={ext.pkgName}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.025] transition-colors"
                  >
                    {ext.iconUrl ? (
                      <img
                        src={ext.iconUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Globe className="h-5 w-5 text-[var(--color-textDim)]" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-textMain)]">
                          {ext.name}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          {ext.lang}
                        </span>
                        {ext.isNsfw && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            NSFW
                          </span>
                        )}
                        {ext.isObsolete && (
                          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                            Obsoleta
                          </span>
                        )}
                        {ext.isInstalled && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Instalada
                          </span>
                        )}
                        {pendingPkgs.has(ext.pkgName) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Instalando...
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-textDim)] truncate">
                        {ext.pkgName} &middot; v{ext.versionName}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {pendingPkgs.has(ext.pkgName) ? (
                        <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                      ) : ext.isInstalled && ext.hasUpdate ? (
                        <button
                          onClick={() => handleInstall(ext.pkgName, ext.name)}
                          disabled={isWorkflowPending}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Atualizar
                        </button>
                      ) : ext.isInstalled ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleInstall(ext.pkgName, ext.name)}
                            disabled={isWorkflowPending}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--color-textDim)] hover:bg-white/10 hover:text-[var(--color-textMain)] transition-colors"
                            title="Reinstalar extensão"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reinstalar
                          </button>
                          <button
                            onClick={() =>
                              handleUninstall(ext.pkgName, ext.name)
                            }
                            disabled={isWorkflowPending}
                            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Desinstalar extensão"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInstall(ext.pkgName, ext.name)}
                          disabled={isWorkflowPending}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Instalar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
