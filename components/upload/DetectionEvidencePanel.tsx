"use client";

import type { UploadDraftItem } from "@/types/api";
import {
  getItemConfidenceScore,
  isItemMarkedForManualReview,
  isManualReviewResolved,
} from "@/lib/uploadReview";

interface DetectionEvidencePanelProps {
  item: UploadDraftItem;
}

export function DetectionEvidencePanel({ item }: DetectionEvidencePanelProps) {
  const confidenceScore = getItemConfidenceScore(item);
  const candidates = item.suggestion.candidates ?? item.ingestion?.candidates ?? [];
  const evidence = item.suggestion.evidence ?? item.ingestion?.evidence ?? [];
  const stages = item.suggestion.stages ?? item.ingestion?.stages ?? [];
  const warnings = item.suggestion.warnings ?? item.ingestion?.warnings ?? [];
  const manualReview = isItemMarkedForManualReview(item);
  const reviewResolved = isManualReviewResolved(item);

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[var(--color-background)] p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
          confiança: {item.suggestion.confidence}
        </span>
        {confidenceScore != null && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[var(--color-textDim)]">
            score: {Math.round(confidenceScore * 100)}%
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            manualReview
              ? reviewResolved
                ? "bg-green-500/15 text-green-300"
                : "bg-yellow-500/15 text-yellow-300"
              : "bg-blue-500/15 text-blue-300"
          }`}
        >
          {manualReview
            ? reviewResolved
              ? "review resolvido"
              : "precisa review"
            : "auto aprovado"}
        </span>
      </div>

      {warnings.length > 0 && (
        <details className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2">
          <summary className="cursor-pointer text-[11px] font-medium text-yellow-300">
            Avisos ({warnings.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-yellow-200/90">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      {candidates.length > 0 && (
        <details className="rounded border border-white/10 bg-white/5 p-2">
          <summary className="cursor-pointer text-[11px] text-[var(--color-textMain)]">
            Candidatos ({candidates.length})
          </summary>
          <div className="mt-2 space-y-1">
            {candidates.map((candidate, index) => (
              <div
                key={`${candidate.normalizedTitle}-${index}`}
                className="rounded border border-white/10 bg-[var(--color-background)] p-1.5 text-[10px]"
              >
                <p className="text-[var(--color-textMain)]">
                  {candidate.matchedSeriesTitle || candidate.normalizedTitle}
                </p>
                <p className="text-[var(--color-textDim)]">
                  score combinado: {candidate.combinedScore.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {evidence.length > 0 && (
        <details className="rounded border border-white/10 bg-white/5 p-2">
          <summary className="cursor-pointer text-[11px] text-[var(--color-textMain)]">
            Evidências ({evidence.length})
          </summary>
          <div className="mt-2 space-y-1">
            {evidence.map((entry, index) => (
              <div
                key={`${entry.source}-${entry.rawValue}-${index}`}
                className="rounded border border-white/10 bg-[var(--color-background)] p-1.5 text-[10px]"
              >
                <p className="text-[var(--color-textMain)]">
                  {entry.source} {entry.accepted ? "✓" : "✗"}
                </p>
                <p className="text-[var(--color-textDim)]">{entry.rawValue}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {stages.length > 0 && (
        <details className="rounded border border-white/10 bg-white/5 p-2">
          <summary className="cursor-pointer text-[11px] text-[var(--color-textMain)]">
            Estágios ({stages.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {stages.map((stage, index) => (
              <span
                key={`${stage.stage}-${index}`}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  stage.status === "completed"
                    ? "bg-green-500/15 text-green-300"
                    : stage.status === "failed"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/10 text-[var(--color-textDim)]"
                }`}
              >
                {stage.stage}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

