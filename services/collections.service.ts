import api from "./api";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  AddItemToCollectionRequest,
  ReorderCollectionRequest,
} from "@/types/api";

export const collectionsService = {
  // Listar coleções do usuário
  async getAll(): Promise<Collection[]> {
    const response = await api.get<Collection[]>(
      "/collections?includeItems=true",
    );
    return response.data;
  },

  // Obter detalhes de uma coleção
  async getById(id: string): Promise<Collection> {
    const response = await api.get<Collection>(`/collections/${id}`);
    return response.data;
  },

  // Criar nova coleção
  async create(data: CreateCollectionRequest): Promise<Collection> {
    const response = await api.post<Collection>("/collections", data);
    return response.data;
  },

  // Atualizar coleção
  async update(id: string, data: UpdateCollectionRequest): Promise<Collection> {
    const response = await api.put<Collection>(`/collections/${id}`, data);
    return response.data;
  },

  // Deletar coleção
  async delete(id: string): Promise<void> {
    await api.delete(`/collections/${id}`);
  },

  // Adicionar série a uma coleção
  async addItem(
    collectionId: string,
    data: AddItemToCollectionRequest,
  ): Promise<void> {
    await api.post(`/collections/${collectionId}/items`, data);
  },

  // Remover item de uma coleção
  async removeItem(itemId: string): Promise<void> {
    await api.delete(`/collections/items/${itemId}`);
  },

  // Reordenar itens
  async reorder(
    collectionId: string,
    data: ReorderCollectionRequest,
  ): Promise<void> {
    await api.put(`/collections/${collectionId}/reorder`, data);
  },
};
