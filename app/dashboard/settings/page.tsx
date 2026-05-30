"use client";

import React, { useState, useEffect } from "react";
import { useAdminSystemSettings, useUpdateSystemSettings } from "@/hooks/useAdmin";
import toast from "react-hot-toast";
import { Settings, Save, Loader2, Info } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading } = useAdminSystemSettings();
  const updateMutation = useUpdateSystemSettings();

  const [showcaseEnabled, setShowcaseEnabled] = useState(false);
  const [founderOverride, setFounderOverride] = useState<string>("");

  useEffect(() => {
    if (settings) {
      setShowcaseEnabled(settings.showcaseRankingEnabled);
      setFounderOverride(settings.founderDisplayOverride !== null ? String(settings.founderDisplayOverride) : "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const parsedOverride = founderOverride === "" ? null : parseInt(founderOverride, 10);
      
      if (parsedOverride !== null && (isNaN(parsedOverride) || parsedOverride < 1 || parsedOverride > 99)) {
        toast.error("O override deve ser um número entre 1 e 99, ou vazio.");
        return;
      }

      await updateMutation.mutateAsync({
        showcaseRankingEnabled: showcaseEnabled,
        founderDisplayOverride: parsedOverride,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao salvar configurações");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">Configurações do Sistema</h1>
        <p className="text-sm text-[var(--color-textDim)]">Gerencie as configurações globais da plataforma ManhQ.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card: Rankings */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-semibold text-[var(--color-textMain)]">Rankings e Destaques</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Toggle Showcase */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--color-textMain)] flex items-center gap-2">
                    Showcase Ranking
                    <span className="group relative">
                      <Info className="h-4 w-4 text-[var(--color-textDim)] hover:text-white transition-colors cursor-help" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-zinc-800 text-xs text-white rounded shadow-xl z-10 text-center">
                        Habilita a exibição de perfis "falsos" no ranking para incentivar o engajamento quando há poucos usuários ativos.
                      </div>
                    </span>
                  </label>
                  <p className="text-xs text-[var(--color-textDim)] mt-1">
                    Habilita perfis simulados (showcase) no topo do ranking público.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowcaseEnabled(!showcaseEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showcaseEnabled ? "bg-[var(--color-primary)]" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={showcaseEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showcaseEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card: Founder Badges */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-[var(--color-textMain)]">Badges de Fundador (Landing Page)</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Founder Override */}
              <div>
                <label className="text-sm font-medium text-[var(--color-textMain)] flex items-center gap-2 mb-1">
                  Override de Vagas Restantes
                  <span className="group relative">
                    <Info className="h-4 w-4 text-[var(--color-textDim)] hover:text-white transition-colors cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-zinc-800 text-xs text-white rounded shadow-xl z-10 text-center">
                      Sobrescreve o número real de vagas de fundadores restantes na landing page para gerar senso de urgência (escassez).
                    </div>
                  </span>
                </label>
                <p className="text-xs text-[var(--color-textDim)] mb-3">
                  Deixe em branco para mostrar o número real, ou insira um valor (ex: 3) para criar escassez artificial na landing page.
                </p>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="Ex: 5"
                  value={founderOverride}
                  onChange={(e) => setFounderOverride(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-sm text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
