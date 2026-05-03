"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Users, Gauge, Crown, Film, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { FounderBadgePreview } from "@/components/FounderSpotlight";
import type { SystemSettings } from "@/types/api";

const FOUNDER_CAP = 100;

export default function MarketingSettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => adminService.getSystemSettings(),
  });
  const { data: founderStatus } = useFounderStatus();

  const mutation = useMutation({
    mutationFn: (patch: Partial<SystemSettings>) =>
      adminService.updateSystemSettings(patch),
    onSuccess: (updated) => {
      qc.setQueryData(["system-settings"], updated);
      toast.success("Configurações salvas");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  // overrideEnabled: whether to show a custom nextNumber
  // nextNumberInput: the "Fundador #X" number the landing page will display
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [nextNumberInput, setNextNumberInput] = useState(2);

  // Sync local state when data loads
  React.useEffect(() => {
    if (settings) {
      const hasOverride = settings.founderDisplayOverride !== null;
      setOverrideEnabled(hasOverride);
      if (hasOverride && settings.founderDisplayOverride != null) {
        // Convert remaining → nextNumber: nextNumber = CAP - remaining + 1
        setNextNumberInput(FOUNDER_CAP - settings.founderDisplayOverride + 1);
      } else {
        // Default to current real nextNumber (or 2 if not loaded yet)
        setNextNumberInput(founderStatus?.nextNumber ?? 2);
      }
    }
  }, [settings, founderStatus?.nextNumber]);

  const computedRemaining = Math.max(1, Math.min(99, FOUNDER_CAP - nextNumberInput + 1));

  function handleSaveFounder() {
    mutation.mutate({
      founderDisplayOverride: overrideEnabled ? computedRemaining : null,
    });
  }

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
              Os valores são ajustados automaticamente para não divergir dos leitores reais.
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
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-textMain)]">
                Número de Fundador exibido
              </h2>
              <p className="mt-1 text-sm text-[var(--color-textDim)]">
                Define qual número de Fundador a landing page exibe como próxima vaga disponível.
                O número real de badges concedidos nunca é afetado.
              </p>
            </div>

            {/* Real state reference */}
            {founderStatus && (
              <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3">
                <Crown className="h-4 w-4 shrink-0 text-amber-400/60" />
                <div className="text-xs text-[var(--color-textDim)]">
                  Estado real atual:{" "}
                  <span className="font-semibold text-[var(--color-textMain)]">
                    {founderStatus.claimed} concedidos
                  </span>{" "}
                  · próxima vaga real:{" "}
                  <span className="font-semibold text-amber-400">
                    Fundador #{String(founderStatus.nextNumber).padStart(3, "0")}
                  </span>
                </div>
              </div>
            )}

            {/* Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !overrideEnabled;
                  setOverrideEnabled(next);
                  if (next && founderStatus) {
                    setNextNumberInput(founderStatus.nextNumber);
                  }
                }}
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
                {overrideEnabled ? "Usando número personalizado" : "Mostrando contagem real"}
              </span>
            </div>

            {overrideEnabled && (
              <div className="space-y-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor="next-number"
                      className="block text-xs font-medium text-[var(--color-textDim)]"
                    >
                      Próximo número de Fundador
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-textDim)]">#</span>
                      <input
                        id="next-number"
                        type="number"
                        min={2}
                        max={100}
                        value={nextNumberInput}
                        onChange={(e) => {
                          const v = Math.max(2, Math.min(100, Number(e.target.value)));
                          setNextNumberInput(v);
                        }}
                        className="w-24 rounded-lg border border-amber-500/30 bg-white/5 px-3 py-1.5 text-center text-sm font-bold text-[var(--color-textMain)] focus:border-amber-500/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-textDim)]">
                      Preview na landing page
                    </span>
                    <FounderBadgePreview number={nextNumberInput} size="md" />
                    <span className="text-[10px] text-[var(--color-textDim)]">
                      {computedRemaining} vaga{computedRemaining !== 1 ? "s" : ""} restante{computedRemaining !== 1 ? "s" : ""} exibida{computedRemaining !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveFounder}
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar configuração
            </button>
          </div>
        </div>
      </div>
      {/* Landing Video Card */}
      <Link
        href="/dashboard/marketing/video"
        className="block rounded-2xl border border-white/8 bg-[var(--color-surface)] p-6 transition-colors hover:border-white/15 hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <Film className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--color-textMain)]">
              Vídeo da Landing Page
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-textDim)]">
              Faça upload e gerencie o vídeo de demonstração exibido para visitantes.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-textDim)]" />
        </div>
      </Link>
    </div>
  );
}
