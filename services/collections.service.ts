import api from "./api";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  ToggleListRequest,
} from "@/types/api";

export const collectionsService = {
  // Listar todas as coleções do usuário (padrões + custom)
  async getAll(): Promise<Collection[]> {
    const response = await api.get<Collection[]>("/collections");
    return response.data;
  },

  // Criar nova coleção customizada
  async create(data: CreateCollectionRequest): Promise<Collection> {
    const response = await api.post<Collection>("/collections/custom", data);
    return response.data;
  },

  // Atualizar coleção customizada
  async update(id: string, data: UpdateCollectionRequest): Promise<Collection> {
    const response = await api.put<Collection>(`/collections/custom/${id}`, data);
    return response.data;
  },

  // Deletar coleção customizada
  async delete(id: string): Promise<void> {
    await api.delete(`/collections/custom/${id}`);
  },

  // Toggle de obra em uma coleção customizada
  async toggleItem(
    collectionId: string,
    data: ToggleListRequest,
  ): Promise<{ inCollection: boolean; action: "added" | "removed" }> {
    const response = await api.post(`/collections/custom/${collectionId}/toggle`, data);
    return response.data;
  },
};

