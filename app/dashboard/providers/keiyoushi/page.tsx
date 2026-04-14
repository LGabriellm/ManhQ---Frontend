"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useKeiyoushiStats,
  useKeiyoushiSources,
  useSuwayomiInstallExtension,
  useSuwayomiReload,
} from "@/hooks/useProvider";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Search,
  Loader2,
  Globe,
  ExternalLink,
  Database,
  Languages,
  Clock,
  Download,
  CheckCircle2,
} from "lucide-react";

export default function KeiyoushiPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [langFilter, setLangFilter] = useState("pt");
  const [installedPkgs, setInstalledPkgs] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: statsData } = useKeiyoushiStats();
  const { data: sourcesData, isLoading } = useKeiyoushiSources(
    {
      lang: langFilter || undefined,
      search: debouncedSearch || undefined,
    },
    true,
  );

  const installExtension = useSuwayomiInstallExtension();
  const reloadSources = useSuwayomiReload();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  function handleInstall(pkgName: string, name: string) {
    installExtension.mutate(pkgName, {
      onSuccess: async () => {
        setInstalledPkgs((prev) => new Set(prev).add(pkgName));
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

  const stats = statsData;
  const isInstalling = installExtension.isPending || reloadSources.isPending;

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
            Keiyoushi — Catálogo de Extensões
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            Navegue e instale extensões do ecossistema Tachiyomi/Mihon
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total de Fontes",
              value: stats.totalSources,
              icon: Database,
              color: "text-blue-400",
            },
            {
              label: "Extensões",
              value: stats.totalExtensions,
              icon: Globe,
              color: "text-purple-400",
            },
            {
              label: "Fontes PT-BR",
              value: stats.ptBrSources,
              icon: Languages,
              color: "text-emerald-400",
            },
            {
              label: "Idiomas",
              value: stats.languages,
              icon: Languages,
              color: "text-cyan-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="surface-panel rounded-xl border border-white/5 p-4"
            >
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-[var(--color-textDim)]">
                  {stat.label}
                </span>
              </div>
              <p className="mt-1 text-lg font-bold text-[var(--color-textMain)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {stats?.lastFetchedAt && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-textDim)]">
          <Clock className="h-3 w-3" />
          Última atualização:{" "}
          {new Date(stats.lastFetchedAt).toLocaleString("pt-BR")}
        </p>
      )}

      {/* Search & language filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar fonte por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="pt">Português (PT)</option>
          <option value="en">Inglês (EN)</option>
          <option value="">Todos os idiomas</option>
        </select>
      </div>

      {/* Sources list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : !sourcesData?.sources?.length ? (
        <div className="py-16 text-center text-sm text-[var(--color-textDim)]">
          Nenhuma fonte encontrada
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-textDim)]">
            {sourcesData.sources.length} fonte(s) encontrada(s)
          </p>

          <div className="surface-panel overflow-hidden rounded-xl border border-white/5">
            <div className="divide-y divide-white/5">
              {sourcesData.sources.map((source) => {
                const isJustInstalled = installedPkgs.has(source.pkgName);
                return (
                  <div
                    key={source.pkgName}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.025] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-textMain)]">
                          {source.name}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
                          {source.lang}
                        </span>
                        {source.nsfw && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            NSFW
                          </span>
                        )}
                      </div>
                      {source.description && (
                        <p className="mt-0.5 text-xs text-[var(--color-textDim)] line-clamp-1">
                          {source.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-[var(--color-textDim)]">
                        {source.pkgName}
                        {source.version ? ` · v${source.version}` : ""}
                        {source.extensionVersion
                          ? ` · v${source.extensionVersion}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {source.baseUrl && (
                        <a
                          href={source.baseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
                          title="Abrir site"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {isJustInstalled ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <button
                          onClick={() =>
                            handleInstall(source.pkgName, source.name)
                          }
                          disabled={isInstalling}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          title="Instalar via Suwayomi"
                        >
                          {isInstalling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Instalar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
