"use client";

import { cn } from "@/lib/utils";
import { getSubscriptionStateLabel } from "@/lib/subscription";
import type { SubscriptionState } from "@/types/api";

const STATE_STYLES: Record<SubscriptionState, string> = {
  inactive: "border-slate-400/15 bg-slate-400/10 text-slate-200",
  setup_pending: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  nearing_expiration: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  renewal_pending: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  past_due: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  cancelled: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200",
  expired: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200",
  refunded: "border-rose-500/20 bg-rose-500/10 text-rose-100",
};

export function SubscriptionStateBadge({
  state,
  className,
}: {
  state?: SubscriptionState;
  className?: string;
}) {
  const normalizedState = state ?? "inactive";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        STATE_STYLES[normalizedState],
        className,
      )}
    >
      {getSubscriptionStateLabel(normalizedState)}
    </span>
  );
}
