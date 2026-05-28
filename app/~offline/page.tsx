import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflineFallback() {
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-surface p-6 text-textMuted mb-6">
        <WifiOff size={48} />
      </div>
      <h1 className="text-2xl font-display font-bold text-textMain mb-2">
        Você está offline
      </h1>
      <p className="text-textMuted mb-8 max-w-sm">
        Esta página não está disponível sem internet. Você ainda pode ler os
        capítulos que baixou na sua biblioteca.
      </p>
      <Link
        href="/library?tab=offline"
        className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition-transform active:scale-95"
      >
        Acessar Downloads
      </Link>
    </div>
  );
}
