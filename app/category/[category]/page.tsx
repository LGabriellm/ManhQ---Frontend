"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { MangaCard } from "@/components/MangaCard";
import { useDiscover } from "@/hooks/useDiscover";

const categoryTitles: Record<string, string> = {
  popular: "Mais Populares",
  recent: "Novos no Catálogo",
  updated: "Atualizados Recentemente",
};

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const category = params.category as string;

  const { data: discover, isLoading, error } = useDiscover();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-textMain mb-6 text-lg font-semibold">
            Erro ao carregar séries
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface/80 rounded-xl transition-all mx-auto group"
          >
            <ArrowLeft className="w-5 h-5 text-primary group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-primary font-semibold">Voltar</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const getFilteredSeries = () => {
    if (!discover) return [];

    switch (category) {
      case "popular":
        return discover.mostViewed;
      case "recent":
        return discover.recentlyAdded;
      case "updated":
        return discover.recentlyUpdated;
      default:
        return [
          ...discover.mostViewed,
          ...discover.recentlyAdded,
          ...discover.recentlyUpdated,
        ].filter((s, i, arr) => arr.findIndex((a) => a.id === s.id) === i);
    }
  };

  const series = getFilteredSeries();
  const title = categoryTitles[category] || "Séries";

  return (
    <main className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-surface shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface active:bg-surface/80 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-textMain group-hover:text-primary transition-colors group-hover:-translate-x-0.5 transform duration-200" />
            <span className="text-sm font-medium text-textMain group-hover:text-primary transition-colors">
              Voltar
            </span>
          </motion.button>
        </div>
      </div>

      <div className="px-4 py-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-textMain mb-6"
        >
          {title}
        </motion.h1>

        {series.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {series.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.02 }}
              >
                <MangaCard
                  id={item.id}
                  title={item.title}
                  coverUrl={item.coverUrl!}
                  rating={item.rating}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-textDim">Nenhuma série encontrada</p>
          </div>
        )}
      </div>
    </main>
  );
}
