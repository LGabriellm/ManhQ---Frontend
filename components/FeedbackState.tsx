"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type FeedbackTone = "default" | "danger" | "warning" | "info";

interface FeedbackStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  tone?: FeedbackTone;
  className?: string;
}

const TONE_STYLES: Record<
  FeedbackTone,
  { icon: string; text: string; button: string }
> = {
  default: {
    icon: "bg-white/6 text-[var(--color-textMain)]",
    text: "text-[var(--color-textDim)]",
    button: "ui-btn-primary px-5 py-2.5 text-sm font-semibold",
  },
  danger: {
    icon: "bg-rose-500/12 text-rose-200",
    text: "text-rose-100/80",
    button: "ui-btn-secondary px-5 py-2.5 text-sm font-semibold",
  },
  warning: {
    icon: "bg-amber-500/12 text-amber-200",
    text: "text-amber-100/80",
    button: "ui-btn-secondary px-5 py-2.5 text-sm font-semibold",
  },
  info: {
    icon: "bg-sky-500/12 text-sky-200",
    text: "text-sky-100/80",
    button: "ui-btn-secondary px-5 py-2.5 text-sm font-semibold",
  },
};

export function FeedbackState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  tone = "default",
  className,
}: FeedbackStateProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={`surface-panel rounded-[30px] px-6 py-8 text-center sm:px-8 ${
        className ?? ""
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24 }}
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${styles.icon}`}
      >
        {icon}
      </motion.div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--color-textMain)]">
        {title}
      </h2>
      {description ? (
        <p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${styles.text}`}>
          {description}
        </p>
      ) : null}

      {actionLabel ? (
        actionHref ? (
          <Link href={actionHref} className="mt-5 inline-flex">
            <span className={styles.button}>{actionLabel}</span>
          </Link>
        ) : onAction ? (
          <button type="button" onClick={onAction} className={`mt-5 ${styles.button}`}>
            {actionLabel}
          </button>
        ) : null
      ) : null}
    </div>
  );
}
