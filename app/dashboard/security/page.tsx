"use client";

import React, { useState } from "react";
import { useBlockedIPs, useUnblockIP, useIPInfo } from "@/hooks/useAdmin";
import type { BlockedIP } from "@/types/api";
import toast from "react-hot-toast";
import {
  Shield,
  ShieldOff,
  Info,
  X,
  Loader2,
  Globe,
  Clock,
  Hash,
} from "lucide-react";

// ===== IP Info Modal =====
function IPInfoModal({ ip, onClose }: { ip: string; onClose: () => void }) {
  const { data, isLoading } = useIPInfo(ip);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Informações do IP
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)]">
              <Globe className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-textDim)]">IP</p>
                <p className="text-sm font-mono text-[var(--color-textMain)]">
                  {data.ip}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)]">
              <Hash className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-textDim)]">
                  Tentativas
                </p>
                <p className="text-sm text-[var(--color-textMain)]">
                  {data.attempts}
                </p>
              </div>
            </div>

            {data.lastAttempt && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)]">
                <Clock className="h-5 w-5 text-[var(--color-textDim)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-textDim)]">
                    Última Tentativa
                  </p>
                  <p className="text-sm text-[var(--color-textMain)]">
                    {new Date(data.lastAttempt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)]">
              <Shield
                className="h-5 w-5 flex-shrink-0"
                style={{ color: data.isBlocked ? "#ef4444" : "#22c55e" }}
              />
              <div>
                <p className="text-xs text-[var(--color-textDim)]">Status</p>
                <p
                  className="text-sm"
                  style={{ color: data.isBlocked ? "#ef4444" : "#22c55e" }}
                >
                  {data.isBlocked ? "Bloqueado" : "Livre"}
                </p>
              </div>
            </div>

            {data.blockedUntil && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5">
                <Clock className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-textDim)]">
                    Bloqueado até
                  </p>
                  <p className="text-sm text-red-400">
                    {new Date(data.blockedUntil).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-[var(--color-textDim)] py-8">
            Não foi possível carregar informações
          </p>
        )}
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function SecurityPage() {
  const { data, isLoading } = useBlockedIPs();
  const unblockMutation = useUnblockIP();
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [confirmUnblock, setConfirmUnblock] = useState<BlockedIP | null>(null);

  const handleUnblock = async (ip: string) => {
    try {
      await unblockMutation.mutateAsync(ip);
      toast.success(`IP ${ip} desbloqueado`);
      setConfirmUnblock(null);
    } catch {
      toast.error("Erro ao desbloquear IP");
    }
  };

  const blockedIPs = data?.ips || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Segurança
        </h1>
        <p className="text-[var(--color-textDim)] text-sm mt-1">
          Gerencie IPs bloqueados e monitore acessos suspeitos
        </p>
      </div>

      {/* Summary */}
      <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-white/5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--color-textMain)]">
            {blockedIPs.length}
          </p>
          <p className="text-sm text-[var(--color-textDim)]">
            IPs bloqueados atualmente
          </p>
        </div>
      </div>

      {/* Blocked IPs List */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-[var(--color-textMain)]">
            IPs Bloqueados
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : blockedIPs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-[var(--color-textDim)]">
            <Shield className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum IP bloqueado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {blockedIPs.map((entry) => (
              <div
                key={entry.ip}
                className="px-4 py-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-[var(--color-textMain)]">
                      {entry.ip}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-textDim)]">
                    {entry.blockedAt && (
                      <span>
                        Bloqueado:{" "}
                        {new Date(entry.blockedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {entry.blockedUntil && (
                      <span>
                        Até:{" "}
                        {new Date(entry.blockedUntil).toLocaleString("pt-BR")}
                      </span>
                    )}
                    <span>{entry.attempts} tentativas</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setSelectedIP(entry.ip)}
                    title="Ver detalhes"
                    className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmUnblock(entry)}
                    title="Desbloquear"
                    className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-green-500 transition-colors"
                  >
                    <ShieldOff className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IP Info Modal */}
      {selectedIP && (
        <IPInfoModal ip={selectedIP} onClose={() => setSelectedIP(null)} />
      )}

      {/* Unblock Confirm */}
      {confirmUnblock && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setConfirmUnblock(null)}
          />
          <div className="relative ui-modal w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <ShieldOff className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-2">
                Desbloquear IP
              </h2>
              <p className="text-sm text-[var(--color-textDim)] mb-6">
                Deseja desbloquear o IP{" "}
                <strong className="font-mono">{confirmUnblock.ip}</strong>?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmUnblock(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUnblock(confirmUnblock.ip)}
                  disabled={unblockMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {unblockMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Desbloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
