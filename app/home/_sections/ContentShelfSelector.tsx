"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { Library } from "lucide-react";

type ContentShelfKey = "all" | "manga" | "manhwa" | "comic" | "novel" | "other";

export interface ShelfDefinition {
  key: Exclude<ContentShelfKey, "all">;
  title: string;
  shortTitle: string;
  description: string;
  workTypes: string[];
  href: string;
  accentClass: string;
  icon: ReactNode;
}

interface ContentShelfSelectorProps {
  activeKey: ContentShelfKey;
  shelves: Array<ShelfDefinition & { count: number }>;
  totalCount: number;
  onSelect: (key: ContentShelfKey) => void;
}

function ContentShelfSelector({
  activeKey,
  shelves,
  totalCount,
  onSelect,
}: ContentShelfSelectorProps) {
  const options = [
    {
      key: "all" as const,
      shortTitle: "Tudo",
      title: "Tudo",
      count: totalCount,
      icon: <Library className="h-4 w-4" />,
    },
    ...shelves.map((shelf) => ({
      key: shelf.key,
      shortTitle: shelf.shortTitle,
      title: shelf.title,
      count: shelf.count,
      icon: shelf.icon,
    })),
  ].filter((option) => option.key === "all" || option.count > 0);

  return (
    <section className="space-y-3">
      <div className="px-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/80">
              Catálogo organizado
            </p>
            <h2 className="mt-1 text-lg font-black text-textMain">
              Escolha o tipo de leitura
            </h2>
          </div>
          <Link
            href="/search"
            className="rounded-full border border-white/8 px-3 py-2 text-[11px] font-semibold text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
          >
            Catálogo
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
        {options.map((option) => {
          const isActive = option.key === activeKey;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key as ContentShelfKey)}
              className={[
                "flex min-w-fit items-center gap-2 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/14 text-white"
                  : "border-white/8 bg-white/4 text-textDim hover:bg-white/7 hover:text-textMain",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  isActive ? "bg-primary text-white" : "bg-white/6 text-textDim",
                ].join(" ")}
              >
                {option.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black leading-none">
                  {option.shortTitle}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-current/60">
                  {option.count} obras
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default React.memo(ContentShelfSelector);
