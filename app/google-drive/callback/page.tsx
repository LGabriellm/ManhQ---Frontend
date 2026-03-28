"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export default function GoogleDriveCallbackPage() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.close();
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_42%),linear-gradient(180deg,#07111f_0%,#030712_100%)] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_24px_120px_-40px_rgba(15,23,42,0.85)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-white">
          Retorne ao workspace
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          O fluxo principal de autenticação do Google Drive agora é concluído pelo
          popup do backend. Se esta página abriu como fallback, você pode fechá-la
          e voltar para o workspace de uploads.
        </p>

        <Link
          href="/dashboard/uploads"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90"
        >
          Abrir uploads
        </Link>
      </div>
    </div>
  );
}
