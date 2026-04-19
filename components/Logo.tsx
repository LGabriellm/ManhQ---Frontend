"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  href?: string;
  className?: string;
}

const sizeMap: Record<LogoSize, { icon: string; text: string; img: number }> = {
  xs: { icon: "h-6 w-6", text: "text-sm", img: 24 },
  sm: { icon: "h-7 w-7", text: "text-[15px]", img: 28 },
  md: { icon: "h-9 w-9", text: "text-lg", img: 36 },
  lg: { icon: "h-12 w-12", text: "text-2xl", img: 48 },
};

export function Logo({
  size = "sm",
  showText = true,
  href,
  className,
}: LogoProps) {
  const s = sizeMap[size];

  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-192.png"
        alt="ManHQ"
        width={s.img}
        height={s.img}
        className={cn(s.icon, "rounded-lg object-contain")}
        draggable={false}
      />
      {showText && (
        <span
          className={cn(
            s.text,
            "select-none font-display font-bold tracking-tight text-textMain",
          )}
        >
          ManHQ
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-select">
        {content}
      </Link>
    );
  }

  return content;
}
