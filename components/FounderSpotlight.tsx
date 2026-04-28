"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Shield } from "lucide-react";
import type { FounderStatus } from "@/services/founder.service";

// ─── Animated integer counter ───────────────────────────────────────────────

function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prefersReduced || prevRef.current === value) {
      setDisplayed(value);
      prevRef.current = value;
      return;
    }

    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    const duration = Math.min(1200, Math.abs(diff) * 40);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    requestAnimationFrame(tick);
  }, [value, prefersReduced]);

  return <span className={className}>{displayed}</span>;
}

// ─── Badge preview chip ──────────────────────────────────────────────────────

export function FounderBadgePreview({
  number,
  size = "md",
}: {
  number: number;
  size?: "sm" | "md" | "lg";
}) {
  const formatted = `#${String(number).padStart(3, "0")}`;
  const sizeClasses = {
    sm: "gap-1 px-2 py-0.5 text-[10px]",
    md: "gap-1.5 px-3 py-1 text-xs",
    lg: "gap-2 px-4 py-2 text-sm",
  }[size];
  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses}`}
      style={{
        background: "linear-gradient(135deg, #f59e0b22, #d9770622)",
        borderColor: "#f59e0b44",
        color: "#f59e0b",
      }}
    >
      <Crown className={iconSize} />
      Fundador {formatted}
    </span>
  );
}

// ─── Full spotlight block (hero section) ────────────────────────────────────

interface FounderSpotlightProps {
  status: FounderStatus;
  isLoading?: boolean;
}

export function FounderSpotlight({ status, isLoading }: FounderSpotlightProps) {
  const prefersReduced = useReducedMotion();
  const { totalSlots, claimed, remaining, nextNumber, isActive } = status;
  const pct = Math.round((claimed / totalSlots) * 100);

  if (!isActive) {
    return (
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-center">
        <Shield className="mx-auto mb-2 h-5 w-5 text-white/30" />
        <p className="text-xs text-white/40">
          As 100 vagas de Fundador foram preenchidas.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.28 }}
      className="mx-auto mt-8 w-full max-w-sm"
    >
      {/* Urgency pill */}
      <div className="mb-3 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-bold text-amber-400">
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2">
            {!prefersReduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          {isLoading ? (
            "Verificando vagas..."
          ) : (
            <>
              Restam apenas{" "}
              <AnimatedNumber value={remaining} className="tabular-nums" />{" "}
              vagas de Fundador
            </>
          )}
        </span>
      </div>

      {/* Card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-black/30 to-black/10 px-5 py-4 shadow-[0_8px_32px_rgba(245,158,11,0.12)]"
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -top-12 left-1/2 h-28 w-36 -translate-x-1/2 rounded-full bg-amber-500/12 blur-[50px]" />

        {/* Top row: badge preview + next number */}
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">
              Sua vaga disponível
            </p>
            <FounderBadgePreview number={nextNumber} size="lg" />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              de {totalSlots} vagas
            </p>
            <p className="text-2xl font-black tabular-nums text-white">
              <AnimatedNumber value={remaining} />
              <span className="text-sm font-normal text-white/40"> restam</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="flex justify-between mb-1.5">
            <p className="text-[10px] text-white/40">
              <AnimatedNumber value={claimed} className="font-semibold text-white/60" /> preenchidas
            </p>
            <p className="text-[10px] font-bold text-amber-400">
              {pct}% ocupado
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #f59e0b, #d97706)",
                boxShadow: "0 0 8px rgba(245,158,11,0.5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: prefersReduced ? 0 : 1.4, delay: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-white/30 text-center">
            Quando as vagas fecharem, o preço sobe permanentemente.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compact inline version (for pricing section, final CTA) ────────────────

export function FounderCountInline({
  status,
  isLoading,
}: {
  status: FounderStatus;
  isLoading?: boolean;
}) {
  if (!status.isActive) return null;

  return (
    <p className="text-xs text-white/45">
      {isLoading ? (
        "Verificando vagas..."
      ) : (
        <>
          <AnimatedNumber
            value={status.claimed}
            className="font-bold text-amber-400"
          />{" "}
          de {status.totalSlots} vagas preenchidas · quando fechar, o preço sobe
        </>
      )}
    </p>
  );
}
