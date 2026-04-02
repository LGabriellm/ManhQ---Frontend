"use client";

import { CheckCircle2, Circle, Loader2, Radio } from "lucide-react";
import type {
  UploadCenterStreamState,
  UploadPipelineStep,
} from "@/hooks/useUploadCenterStore";
import type { UploadSource } from "@/types/upload-workflow";

const STEP_ORDER: UploadPipelineStep[] = [
  "SOURCE",
  "SELECT_CONTENT",
  "SERIES",
  "INGEST",
  "REVIEW",
  "CONFIRM",
  "PROCESSING",
];

const STEP_LABELS: Record<UploadPipelineStep, string> = {
  SOURCE: "1. Origem",
  SELECT_CONTENT: "2. Pasta/Arquivos",
  SERIES: "3. Nome da Série",
  INGEST: "4. Pré-processamento",
  REVIEW: "5. Revisão Humana",
  CONFIRM: "6. Confirmação Manual",
  PROCESSING: "7. Processamento",
};

const STREAM_STATUS_LABEL: Record<UploadCenterStreamState["status"], string> = {
  idle: "Tempo real inativo",
  connecting: "Conectando SSE",
  live: "SSE ativo",
  reconnecting: "Reconectando SSE",
  polling: "Fallback em polling",
};

interface UploadPipelineStepperProps {
  activeStep: UploadPipelineStep;
  selectedSource: UploadSource;
  stream: UploadCenterStreamState;
}

function getStepState(
  step: UploadPipelineStep,
  activeStep: UploadPipelineStep,
): "done" | "current" | "pending" {
  const activeIndex = STEP_ORDER.indexOf(activeStep);
  const stepIndex = STEP_ORDER.indexOf(step);

  if (stepIndex < activeIndex) {
    return "done";
  }

  if (stepIndex === activeIndex) {
    return "current";
  }

  return "pending";
}

export function UploadPipelineStepper({
  activeStep,
  selectedSource,
  stream,
}: UploadPipelineStepperProps) {
  return (
    <section
      className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5"
      aria-label="Pipeline obrigatória de upload"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
            Upload Center
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--color-textMain)]">
            Fluxo com revisão humana obrigatória
          </h2>
          <p className="mt-2 text-sm text-[var(--color-textDim)]">
            Origem atual:{" "}
            <span className="font-medium text-[var(--color-textMain)]">
              {selectedSource === "GOOGLE_DRIVE" ? "Google Drive" : "Local"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-[var(--color-textDim)]">
          <div className="flex items-center gap-2">
            {stream.status === "live" ? (
              <Radio className="h-3.5 w-3.5 text-emerald-300" />
            ) : stream.status === "connecting" || stream.status === "reconnecting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-amber-300" />
            )}
            <span>{STREAM_STATUS_LABEL[stream.status]}</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-textDim)]/90">
            Eventos: {stream.eventsReceived} · reconexões {stream.reconnectAttempts}
          </p>
        </div>
      </div>

      <ol
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Etapas do fluxo de upload"
      >
        {STEP_ORDER.map((step) => {
          const status = getStepState(step, activeStep);
          const isCurrent = status === "current";
          const isDone = status === "done";

          return (
            <li
              key={step}
              className={`rounded-2xl border px-3 py-2 text-sm ${
                isCurrent
                  ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/12 text-[var(--color-textMain)]"
                  : isDone
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-black/15 text-[var(--color-textDim)]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden />
                )}
                {STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>

      {stream.lastError && (
        <p className="mt-3 text-xs text-amber-200" role="status">
          {stream.lastError}
        </p>
      )}
    </section>
  );
}
