"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack,
  backHref = "/library",
  rightAction,
  transparent,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-200 safe-header",
        transparent
          ? "bg-transparent"
          : "bg-background/80 backdrop-blur-xl border-b border-white/5",
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <Link
              href={backHref}
              className="p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-textMain" />
            </Link>
          )}
          {title && (
            <h1 className="text-base font-semibold text-textMain truncate">
              {title}
            </h1>
          )}
        </div>

        {rightAction && <div className="shrink-0 ml-2">{rightAction}</div>}
      </div>
    </header>
  );
}
