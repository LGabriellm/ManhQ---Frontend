import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectionsService } from "@/services/collections.service";
import type {
  CreateCollectionRequest,
  UpdateCollectionRequest,
  ToggleListRequest,
} from "@/types/api";

export const useCollectionsApi = () => {
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: ["collections", "all"],
    queryFn: () => collectionsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCollectionRequest) => collectionsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCollectionRequest }) =>
      collectionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToggleListRequest }) =>
      collectionsService.toggleItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });

  return {
    collectionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleItemMutation,
  };
};
