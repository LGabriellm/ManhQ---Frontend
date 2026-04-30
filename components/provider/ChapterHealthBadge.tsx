import React from "react";
import { cn } from "@/lib/utils";
import type { ChapterHealthStatus } from "@/types/api";

const HEALTH_CONFIG: Record<
  ChapterHealthStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  HEALTHY: {
    label: "Saudável",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-400",
  },
  INCOMPLETE: {
    label: "Incompleto",
    dotClass: "bg-yellow-400",
    textClass: "text-yellow-400",
  },
  BROKEN: {
    label: "Quebrado",
    dotClass: "bg-red-400",
    textClass: "text-red-400",
  },
  PENDING_VALIDATION: {
    label: "Validando",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-400",
  },
  UNAVAILABLE: {
    label: "Indisponível",
    dotClass: "bg-slate-500",
    textClass: "text-slate-400",
  },
};

interface ChapterHealthBadgeProps {
  status: ChapterHealthStatus;
  className?: string;
}

export function ChapterHealthBadge({
  status,
  className,
}: ChapterHealthBadgeProps) {
  const config = HEALTH_CONFIG[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={config.label}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
      <span className={cn("text-[10px] font-medium", config.textClass)}>
        {config.label}
      </span>
    </span>
  );
}
