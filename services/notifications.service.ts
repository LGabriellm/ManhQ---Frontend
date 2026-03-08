import api from "./api";
import type { NotificationsResponse } from "@/types/api";

export const notificationsService = {
  // Listar notificações
  async getAll(params?: {
    read?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationsResponse> {
    const response = await api.get<NotificationsResponse>("/notifications", {
      params,
    });
    return response.data;
  },

  // Marcar como lida
  async markAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  // Marcar todas como lidas
  async markAllAsRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
  },

  // Deletar notificação
  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
