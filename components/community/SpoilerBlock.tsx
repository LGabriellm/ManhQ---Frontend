"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

export function SpoilerBlock({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p className={className}>{content}</p>;
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-left"
    >
      <div className="mb-2 flex items-center gap-2 text-amber-300">
        <ShieldAlert className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          Spoiler
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-amber-100/80">
        <span>Toque para revelar o conteúdo desta mensagem.</span>
        {revealed ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </div>
    </button>
  );
}
