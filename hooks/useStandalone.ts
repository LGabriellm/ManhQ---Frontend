"use client";

import { useState, useEffect } from "react";

/**
 * Detecta se o app está rodando em modo standalone (PWA instalado).
 * Funciona em iOS (navigator.standalone) e Android/Desktop (display-mode: standalone).
 */
export function useStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      // iOS Safari
      const iosStandalone =
        "standalone" in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;

      // Android / Desktop PWA
      const mediaStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      setIsStandalone(iosStandalone || mediaStandalone);
    };

    checkStandalone();

    // Listen for display mode changes (e.g., user installs PWA while using it)
    const mql = window.matchMedia("(display-mode: standalone)");
    const handler = () => checkStandalone();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isStandalone;
}
