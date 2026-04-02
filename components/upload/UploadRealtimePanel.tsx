"use client";

import { useState } from "react";
import { Clock3, RefreshCw, Radio, RotateCcw } from "lucide-react";
import type { UploadSessionRealtimeController } from "@/hooks/useUploadSessionRealtime";
import { formatDateTime } from "@/lib/upload-workflow";
import type { UploadSessionCallbacks } from "@/types/upload-workflow";

interface UploadRealtimePanelProps {
  realtime: UploadSessionRealtimeController;
  callbacks?: UploadSessionCallbacks | null;
}

const STATUS_META: Record<
  UploadSessionRealtimeController["status"],
  {
    label: string;
    tone: string;
  }
> = {
  idle: {
    label: "Inativo",
    tone: "border-white/10 bg-white/[0.05] text-[var(--color-textDim)]",
  },
  connecting: {
    label: "Conectando",
    tone: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  live: {
    label: "SSE ativo",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  reconnecting: {
    label: "Reconectando",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  },
  polling: {
    label: "Fallback polling",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  },
};

export function UploadRealtimePanel({
  realtime,
  callbacks,
}: UploadRealtimePanelProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await realtime.reconcileNow();
    } finally {
      setSyncing(false);
    }
  };

  const statusMeta = STATUS_META[realtime.status];

  return (
    <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
            Integração em tempo real
          </p>
          <p className="mt-1 text-sm text-[var(--color-textDim)]">
            Callback por sessão com reconciliação manual quando necessário.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusMeta.tone}`}
        >
          <Radio className="h-3.5 w-3.5" />
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Eventos recebidos
          </p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            {realtime.eventsReceived}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Reconexões
          </p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            {realtime.reconnectAttempts}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Último evento
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
            {realtime.lastEventType || "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Horário
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
            {formatDateTime(realtime.lastEventAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSyncNow()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.08] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar agora
        </button>
        <button
          type="button"
          onClick={() => realtime.restartStream()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.08]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar stream
        </button>
        {realtime.usingFallbackPolling && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-200">
            <Clock3 className="h-3 w-3" />
            Operando em polling fallback
          </span>
        )}
      </div>

      {realtime.lastError && (
        <p className="mt-3 text-xs text-amber-200">{realtime.lastError}</p>
      )}

      {callbacks && (
        <p className="mt-3 text-[11px] text-[var(--color-textDim)]/80">
          Callback: <code>{callbacks.events}</code> · Poll: <code>{callbacks.poll}</code>
        </p>
      )}
    </section>
  );
}
