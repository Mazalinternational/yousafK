import { apiClient } from "./client";
import type { AuthUser } from "@/features/auth/types";

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

interface AuthResponseData {
  user: AuthUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await apiClient.post<ApiEnvelope<AuthResponseData>>("/auth/login", {
      email,
      password,
    });
    return res.data.data.user;
  },

  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiEnvelope<AuthResponseData>>("/auth/me");
    return res.data.data.user;
  },

  async refresh(): Promise<AuthUser> {
    const res = await apiClient.post<ApiEnvelope<AuthResponseData>>("/auth/refresh");
    return res.data.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/change-password", { currentPassword, newPassword });
  },

  async updateProfile(name: string): Promise<AuthUser> {
    const res = await apiClient.patch<ApiEnvelope<AuthResponseData>>("/auth/profile", {
      name,
    });
    return res.data.data.user;
  },

  async uploadProfileAvatar(file: File): Promise<AuthUser> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiEnvelope<AuthResponseData>>(
      "/auth/profile/avatar",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data.data.user;
  },

  async removeProfileAvatar(): Promise<AuthUser> {
    const res = await apiClient.delete<ApiEnvelope<AuthResponseData>>("/auth/profile/avatar");
    return res.data.data.user;
  },
};
