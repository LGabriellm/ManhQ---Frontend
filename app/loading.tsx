export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0f0f0f]">
      {/* Spinner */}
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/10 border-t-[#e50914]" />

      {/* Text */}
      <p className="text-sm font-medium text-[#a3a3a3]">Carregando...</p>
    </div>
  );
}
