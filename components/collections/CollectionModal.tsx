"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Folder, Loader2, Check } from "lucide-react";
import { useCollectionsApi } from "@/hooks/useCollectionsApi";
import toast from "react-hot-toast";
import type { Collection } from "@/types/api";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
}

export function CollectionModal({ isOpen, onClose, seriesId }: CollectionModalProps) {
  const { collectionsQuery, createMutation, toggleItemMutation } = useCollectionsApi();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const collections = collectionsQuery.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const newCollection = await createMutation.mutateAsync({ name: newCollectionName.trim() });
      setNewCollectionName("");
      setIsCreating(false);
      
      // Auto-add the series to the newly created collection
      await toggleItemMutation.mutateAsync({ 
        id: newCollection.id, 
        data: { seriesId } 
      });
      toast.success("Coleção criada e obra adicionada!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao criar coleção");
    }
  };

  const handleToggle = async (collection: Collection) => {
    try {
      await toggleItemMutation.mutateAsync({ 
        id: collection.id, 
        data: { seriesId } 
      });
    } catch (error) {
      toast.error("Erro ao atualizar coleção");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface bg-background shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-surface p-4">
            <h2 className="text-lg font-bold text-textMain">Salvar em...</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-textDim transition-colors hover:bg-surface hover:text-textMain"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            {collectionsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="mb-4 max-h-[40vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {collections.map((collection) => {
                  const hasSeries = collection.items?.some((item) => item.seriesId === seriesId);
                  
                  return (
                    <button
                      key={collection.id}
                      onClick={() => void handleToggle(collection)}
                      disabled={toggleItemMutation.isPending}
                      className="flex w-full items-center justify-between rounded-xl border border-surface p-3 transition-colors hover:bg-surface/50 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className={`h-5 w-5 ${hasSeries ? "text-primary fill-primary/20" : "text-textDim"}`} />
                        <div className="text-left">
                          <p className={`font-medium ${hasSeries ? "text-primary" : "text-textMain"}`}>
                            {collection.name}
                          </p>
                          <p className="text-xs text-textDim">
                            {collection._count?.items || collection.items?.length || 0} obras
                          </p>
                        </div>
                      </div>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${hasSeries ? "border-primary bg-primary" : "border-surface"}`}>
                        {hasSeries && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {isCreating ? (
              <form onSubmit={handleCreate} className="mt-4 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome da nova coleção"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="flex-1 rounded-xl border border-surface bg-surface/30 px-4 py-2 text-sm text-textMain focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newCollectionName.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Criar
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-surface py-3 text-sm font-medium text-textDim transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Nova Coleção
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
