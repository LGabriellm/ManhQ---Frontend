"use client";

import { ArrowLeft, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack,
  rightAction,
  transparent,
}: TopBarProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 backdrop-blur-lg transition-all",
        transparent
          ? "bg-transparent"
          : "bg-surface/95 border-b border-surface/50",
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-surface/50 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6 text-textMain" />
          </button>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-textMain truncate">
            {title}
          </h1>
        )}
      </div>

      {rightAction || (
        <button className="p-2 -mr-2 rounded-full hover:bg-surface/50 transition-colors">
          <MoreVertical className="w-6 h-6 text-textMain" />
        </button>
      )}
    </header>
  );
}
