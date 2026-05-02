"use client";

import { AnimatePresence } from "framer-motion";
import { useMyBadges } from "@/hooks/useApi";
import { BadgeEarnedModal } from "@/components/BadgeEarnedModal";

export function BadgeNotifier() {
  const { newBadges, clearNewBadges } = useMyBadges();

  return (
    <AnimatePresence>
      {newBadges.length > 0 && (
        <BadgeEarnedModal badges={newBadges} onClose={clearNewBadges} />
      )}
    </AnimatePresence>
  );
}
