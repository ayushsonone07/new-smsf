import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { announcementService } from "../services";

import type { Announcement, AnnouncementInput, AnnouncementListParams } from "../types";

export const announcementKeys = {
  all: ["announcements"] as const,
  list: (params: AnnouncementListParams) => ["announcements", "list", params] as const,
  detail: (id: number) => ["announcements", "detail", id] as const,
};

export function useAnnouncements(params: AnnouncementListParams) {
  return useQuery({
    queryKey: announcementKeys.list(params),
    queryFn: () => announcementService.list(params),
  });
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: () => announcementService.get(id),
    enabled: id > 0,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, AnnouncementInput>({
    mutationFn: (input) => announcementService.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation<Announcement, Error, { id: number; input: AnnouncementInput }>({
    mutationFn: ({ id, input }) => announcementService.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => announcementService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}