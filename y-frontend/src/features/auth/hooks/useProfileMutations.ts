import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { useAuth } from "./useAuth";

export function useUpdateProfile() {
  const { refresh } = useAuth();

  return useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: async () => {
      await refresh();
    },
  });
}

export function useUploadProfileAvatar() {
  const { refresh } = useAuth();

  return useMutation({
    mutationFn: (file: File) => authApi.uploadProfileAvatar(file),
    onSuccess: async () => {
      await refresh();
    },
  });
}

export function useRemoveProfileAvatar() {
  const { refresh } = useAuth();

  return useMutation({
    mutationFn: () => authApi.removeProfileAvatar(),
    onSuccess: async () => {
      await refresh();
    },
  });
}
