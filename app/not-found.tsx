import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0f0f0f] px-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-[#a3a3a3]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#e5e5e5]">
          Pagina nao encontrada
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
          A pagina que voce procura nao existe ou foi movida.
        </p>

        <Link
          href="/home"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e50914] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e50914]/90 active:scale-95"
        >
          Voltar para o inicio
        </Link>
      </div>
    </div>
  );
}
