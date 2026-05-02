"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserBadge } from "@/components/community/UserBadge";
import type { UserBadgeResponse } from "@/types/api";

interface BadgeEarnedModalProps {
  badges: UserBadgeResponse[];
  onClose: () => void;
}

// Particle positions: 12 particles evenly distributed around a circle
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360;
  const distance = 80 + Math.random() * 40;
  const rad = (angle * Math.PI) / 180;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    delay: (i / 12) * 0.4,
    size: 4 + Math.round(Math.random() * 4),
  };
});

function Sparkles() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: p.x,
            y: p.y,
            scale: [0, 1, 0.8, 0],
          }}
          transition={{
            duration: 1.2,
            delay: p.delay,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
          className="absolute rounded-full bg-amber-400"
          style={{ width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
}

export function BadgeEarnedModal({ badges, onClose }: BadgeEarnedModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentBadge = badges[currentIndex];
  const isLast = currentIndex >= badges.length - 1;

  if (!currentBadge) return null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0f0f0f] p-8 text-center shadow-2xl shadow-amber-400/10"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-400/5 via-transparent to-transparent" />

        {/* Sparkle particles */}
        <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
          <Sparkles />
          {/* Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <UserBadge badge={currentBadge} size="lg" />
          </motion.div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/70">
            Nova Conquista Desbloqueada!
          </p>
          <h2
            className="mt-2 text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #e50914)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {currentBadge.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
            {currentBadge.description}
          </p>
        </motion.div>

        {/* Counter */}
        {badges.length > 1 && (
          <p className="mt-4 text-xs text-[#a3a3a3]/60">
            {currentIndex + 1} de {badges.length}
          </p>
        )}

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleNext}
          className="mt-6 w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {isLast ? "Continuar" : "Próximo"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
