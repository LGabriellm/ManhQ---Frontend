"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({
  children,
  className,
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-2",
          "scroll-smooth",
          className,
        )}
      >
        {children}
      </div>
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
