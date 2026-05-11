"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0f0f0f] px-6">
      <div className="mx-auto max-w-md text-center">
        {/* Error icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e50914]/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-[#e50914]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#e5e5e5]">Algo deu errado</h1>

        <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
          Um erro inesperado aconteceu. Tente recarregar a pagina.
        </p>

        {error.message && (
          <p className="mt-2 rounded-lg bg-[#1e1e1e] px-4 py-2 text-xs text-[#a3a3a3] font-mono break-all">
            {error.message}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e50914] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e50914]/90 active:scale-95"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
