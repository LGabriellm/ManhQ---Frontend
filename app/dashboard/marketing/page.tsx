"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Users, Gauge } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import type { SystemSettings } from "@/types/api";

export default function MarketingSettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => adminService.getSystemSettings(),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<SystemSettings>) =>
      adminService.updateSystemSettings(patch),
    onSuccess: (updated) => {
      qc.setQueryData(["system-settings"], updated);
      toast.success("Configurações salvas");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideValue, setOverrideValue] = useState(5);

  // Sync local state when data loads
  React.useEffect(() => {
    if (settings) {
      setOverrideEnabled(settings.founderDisplayOverride !== null);
      setOverrideValue(settings.founderDisplayOverride ?? 5);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Marketing & Urgência
        </h1>
        <p className="mt-1 text-sm text-[var(--color-textDim)]">
          Controles de social proof e urgência exibidos para visitantes da landing page.
        </p>
      </div>

      {/* Showcase Ranking Card */}
      <div className="rounded-2xl border border-white/8 bg-[var(--color-surface)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <Users className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--color-textMain)]">
              Usuários falsos no ranking
            </h2>
            <p className="mt-1 text-sm text-[var(--color-textDim)]">
              Exibe personas fictícias no ranking enquanto há poucos usuários reais.
              Estas entradas aparecem levemente transparentes e nunca têm badges de Fundador.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  mutation.mutate({ showcaseRankingEnabled: !settings?.showcaseRankingEnabled })
                }
                disabled={mutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings?.showcaseRankingEnabled
                    ? "bg-[var(--color-primary)]"
                    : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings?.showcaseRankingEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-[var(--color-textDim)]">
                {settings?.showcaseRankingEnabled ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Founder Slots Override Card */}
      <div className="rounded-2xl border border-white/8 bg-[var(--color-surface)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Gauge className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--color-textMain)]">
              Contador de vagas de Fundador
            </h2>
            <p className="mt-1 text-sm text-[var(--color-textDim)]">
              Substitui o contador real de vagas restantes por um número fixo para criar urgência.
              O número real de badges concedidos nunca é afetado.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOverrideEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  overrideEnabled ? "bg-amber-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    overrideEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-[var(--color-textDim)]">
                {overrideEnabled ? "Usando número fixo" : "Mostrando contagem real"}
              </span>
            </div>

            {overrideEnabled && (
              <div className="mt-4 flex items-center gap-3">
                <label
                  htmlFor="override-value"
                  className="text-sm text-[var(--color-textDim)]"
                >
                  Vagas a exibir:
                </label>
                <input
                  id="override-value"
                  type="number"
                  min={1}
                  max={99}
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(Number(e.target.value))}
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center text-sm text-[var(--color-textMain)] focus:border-amber-500/50 focus:outline-none"
                />
                <span className="text-xs text-[var(--color-textDim)]">vagas restantes</span>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                mutation.mutate({
                  founderDisplayOverride: overrideEnabled ? overrideValue : null,
                })
              }
              disabled={mutation.isPending}
              className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar contador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
