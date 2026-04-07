"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { MangaCard } from "@/components/MangaCard";
import { discoverService } from "@/services/discover.service";
import { getPublicCoverUrl } from "@/lib/coverUrl";

const CATEGORY_LIMIT = 50;

const categoryTitles: Record<string, string> = {
  popular: "Mais Populares",
  recent: "Novos no Catálogo",
  updated: "Atualizados Recentemente",
};

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const category = params.category as string;
  const isValidCategory = category in categoryTitles;

  const {
    data: series = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["discover", "category", category, CATEGORY_LIMIT],
    queryFn: async ({ signal }) => {
      switch (category) {
        case "popular":
          return discoverService.getPopular(CATEGORY_LIMIT, signal);
        case "recent":
          return discoverService.getRecent(CATEGORY_LIMIT, signal);
        case "updated":
          return discoverService.getUpdated(CATEGORY_LIMIT, signal);
        default:
          return [];
      }
    },
    enabled: isValidCategory,
    staleTime: 1000 * 60 * 5,
  });

  if (!isValidCategory) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            Catálogo público
          </p>
          <h1 className="mt-3 text-3xl font-bold text-textMain">
            Categoria não encontrada
          </h1>
          <p className="mt-3 max-w-md text-sm text-textDim">
            Essa rota não corresponde a uma categoria pública válida. Volte ao
            catálogo para continuar navegando.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/home")}
            className="mt-8 flex items-center gap-2 rounded-xl bg-surface px-6 py-3 font-semibold text-primary transition-all hover:bg-surface/80"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar ao início
          </motion.button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            Catálogo público
          </p>
          <h1 className="mt-3 text-2xl font-bold text-textMain">
            Não foi possível carregar esta categoria
          </h1>
          <p className="mt-3 text-sm text-textDim">
            Tente recarregar a lista. Se o problema continuar, volte para a home
            e abra a categoria novamente.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void refetch()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar de novo
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/home")}
              className="flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 font-semibold text-primary transition-all hover:bg-surface/80"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  const title = categoryTitles[category];

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-surface bg-background/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/home")}
            className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-surface active:bg-surface/80"
          >
            <ArrowLeft className="h-5 w-5 text-textMain transition-colors duration-200 group-hover:-translate-x-0.5 group-hover:text-primary" />
            <span className="text-sm font-medium text-textMain transition-colors group-hover:text-primary">
              Voltar
            </span>
          </motion.button>

          {isFetching && (
            <div className="flex items-center gap-2 text-xs font-medium text-textDim">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-textMain">{title}</h1>
          <p className="mt-2 text-sm text-textDim">
            {series.length > 0
              ? `${series.length} série(s) públicas disponíveis nesta seleção.`
              : "Nenhuma série pública disponível nesta seleção agora."}
          </p>
        </motion.div>

        {series.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {series.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <MangaCard
                  id={item.id}
                  title={item.title}
                  coverUrl={getPublicCoverUrl(item.id, item.coverUrl)}
                  rating={item.rating}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface bg-surface/20 px-6 py-16 text-center mt-6">
            <p className="text-base font-semibold text-textMain">
              Nada para mostrar por enquanto
            </p>
            <p className="mt-2 max-w-md text-sm text-textDim">
              Essa categoria está vazia no momento ou ainda está sendo atualizada.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
