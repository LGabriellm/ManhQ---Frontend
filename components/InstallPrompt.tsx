"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if the user hasn't dismissed it recently
      const dismissed = localStorage.getItem("manhq:installPromptDismissed");
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("manhq:installPromptDismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      >
        <div className="flex items-center gap-4 rounded-2xl bg-white/[0.08] p-4 backdrop-blur-md shadow-2xl border border-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Download size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">Instalar o ManHQ</h4>
            <p className="text-xs text-white/60">Acesso mais rápido e offline</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="text-xs text-white/50 px-2 py-1 user-select-none"
            >
              Agora não
            </button>
            <button
              onClick={handleInstall}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-transform active:scale-95 user-select-none"
            >
              Instalar
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
